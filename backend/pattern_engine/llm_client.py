import json
import os
import re
import time
import random
from openai import OpenAI
from config.database import db
from pattern_engine.models import LLMUsageLog, ProviderUsage
from pattern_engine.model_strategies import get_models_for_strategy
from datetime import date as _date


class LLMQuotaExhausted(RuntimeError):
    """Raised when all LLM tiers return quota/rate-limit errors.
    Pipeline code should catch this and re-queue events as pending (not failed)."""


_client = None
_models = None

# Global circuit breaker: when every LLM tier is quota-exhausted, pause calls
# for a cooldown window so the pipeline doesn't hammer rate-limited providers
# (each hung call also holds a DB connection, starving web requests).
_breaker_until = 0.0
_BREAKER_COOLDOWN_SECONDS = float(os.environ.get("LLM_BREAKER_COOLDOWN", "300"))


def _get_provider(base_url):
    if not base_url:
        return "generic"
    if "localhost" in base_url or "127.0.0.1" in base_url or "0.0.0.0" in base_url:
        return "ollama"
    if "groq.com" in base_url:
        return "groq"
    if "openrouter" in base_url:
        return "openrouter"
    return "generic"


def _create_client(base_url, api_key, timeout=30.0):
    headers = {}
    if "openrouter" in base_url:
        headers = {
            "HTTP-Referer": "https://foundesk.app",
            "X-Title": "FounDesk",
        }
    return OpenAI(base_url=base_url, api_key=api_key, default_headers=headers, timeout=timeout, max_retries=0)


def _ensure_client():
    global _client, _models
    if _client is None:
        _strategy_name = os.environ.get("LLM_ROUTING_STRATEGY", "structured_fast")
        _models = get_models_for_strategy(_strategy_name)

        # Production: Groq only, never Ollama
        # qwen_dev/groq_fast: Groq primary with Ollama fallback
        # Other strategies (structured_fast, cost_minimized, etc.): OpenRouter
        groq_strategies = {"groq_fast", "qwen_dev", "production"}
        if _strategy_name in groq_strategies:
            base_url = "https://api.groq.com/openai/v1"
            api_key = os.environ.get("OPENAI_API_KEY")
            if not api_key:
                base_url = os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
                api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")
        else:
            base_url = os.environ.get("OPENAI_BASE_URL", "https://openrouter.ai/api/v1")
            api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")

        if not api_key:
            raise RuntimeError("OPENAI_API_KEY or OPENROUTER_API_KEY not set")
        _client = _create_client(base_url, api_key)
    return _client, _models


def _extract_json(raw):
    """Robustly parse JSON out of an LLM response (handles code fences,
    prose around the JSON, failed strict-mode output, and qwen-style
    thinking blocks)."""
    raw = (raw or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw).strip()
    m = re.search(r"\n\s*thinking\s*\n.*?\n\s*response\s*\n", raw, flags=re.S)
    if m:
        raw = raw[m.end():].strip()
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        pass
    for opener, closer in (("{", "}"), ("[", "]")):
        start = raw.find(opener)
        if start == -1:
            continue
        depth = 0
        for i in range(start, len(raw)):
            if raw[i] == opener:
                depth += 1
            elif raw[i] == closer:
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(raw[start:i + 1])
                    except (json.JSONDecodeError, ValueError):
                        break
    raise ValueError(f"Could not extract JSON from LLM response: {raw[:200]}")


def _call(client, messages, json_schema, model, temperature=0):
    url = str(client.base_url)
    provider = _get_provider(url)

    kwargs = {
        "model": model,
        "messages": list(messages),
        "stream": False,
        "temperature": temperature,
    }

    if provider == "ollama":
        schema_str = json.dumps(json_schema, indent=2)
        instruction = (
            "\n\nRespond ONLY with valid JSON matching this schema:\n"
            f"{schema_str}\n"
            "Return ONLY the JSON object, no markdown, no explanation."
        )
        augmented = list(messages)
        last = augmented[-1]
        augmented[-1] = {"role": last["role"], "content": last["content"] + instruction}
        kwargs["messages"] = augmented
        kwargs["response_format"] = {"type": "json_object"}

    elif provider == "groq":
        # Groq's strict json_object mode returns 400 json_validate_failed when a
        # model wraps output in prose/markdown. Skip strict mode, but inject the
        # schema into the prompt so the model emits the exact field names; the
        # raw text is then parsed robustly with _extract_json.
        schema_str = json.dumps(json_schema, indent=2)
        instruction = (
            "\n\nReturn ONLY a single JSON object matching EXACTLY this schema "
            f"(use these exact field names):\n{schema_str}\n"
            "No markdown, no code fences, no commentary before or after."
        )
        augmented = list(messages)
        last = augmented[-1]
        augmented[-1] = {"role": last["role"], "content": last["content"] + "\n" + instruction}
        kwargs["messages"] = augmented

    elif provider == "openrouter":
        kwargs["response_format"] = {
            "type": "json_schema",
            "json_schema": {
                "name": json_schema.get("title", "extracted_data"),
                "schema": json_schema,
                "strict": True,
            },
        }
        kwargs["extra_body"] = {"require_parameters": True}

    else:
        kwargs["response_format"] = {"type": "json_object"}

    api_response = client.chat.completions.create(**kwargs)

    raw = api_response.choices[0].message.content
    if not raw:
        raise ValueError("LLM returned empty response")
    return _extract_json(raw), api_response


def _log_usage(model, response, elapsed_ms, provider=None):
    try:
        if response is None:
            return
        usage = response.usage if hasattr(response, 'usage') else None
        if usage:
            if isinstance(usage, dict):
                prompt_tokens = usage.get("prompt_tokens", 0) or 0
                completion_tokens = usage.get("completion_tokens", 0) or 0
            else:
                prompt_tokens = getattr(usage, "prompt_tokens", 0) or 0
                completion_tokens = getattr(usage, "completion_tokens", 0) or 0
            total = prompt_tokens + completion_tokens
            log = LLMUsageLog(
                model=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total,
                latency_ms=round(elapsed_ms, 1),
            )
            db.session.add(log)

            # Per-provider daily rollup
            if provider:
                today = _date.today()
                pv = ProviderUsage.query.filter_by(provider=provider, date=today).first()
                if pv:
                    pv.tokens_used = (pv.tokens_used or 0) + total
                    pv.requests_count = (pv.requests_count or 0) + 1
                else:
                    db.session.add(ProviderUsage(
                        provider=provider,
                        date=today,
                        tokens_used=total,
                        requests_count=1,
                    ))
            db.session.commit()
    except Exception as e:
        print(f"LLM usage log failed (non-fatal): {e}")


def _is_retryable_error(e):
    """Return False for 4xx / quota errors (don't retry), True for transient."""
    msg = str(e).lower()
    if any(code in msg for code in ["429", "402", "401", "403", "400", "model_not_found", "rate_limit"]):
        return False
    return True


def _is_rate_limit_error(e):
    """Return True if the error is specifically about rate limits / quota exhaustion."""
    msg = str(e).lower()
    return any(code in msg for code in ["429", "rate_limit", "quota", "exhausted", "daily_limit"])


def _retry_with(client, messages, json_schema, model, start, _is_fallback=False, temperature=0):
    max_attempts = int(os.environ.get("LLM_RETRY_ATTEMPTS", "3"))
    last_exc = None
    for attempt in range(max_attempts):
        try:
            result, api_response = _call(client, messages, json_schema, model, temperature=temperature)
            provider = _get_provider(str(client.base_url))
            _log_usage(model, api_response, (time.time() - start) * 1000, provider=provider)
            return result
        except Exception as e:
            last_exc = e
            elapsed_ms = (time.time() - start) * 1000
            if not _is_retryable_error(e):
                print(f"LLM call failed on {model} ({elapsed_ms:.0f}ms) — non-retryable: {e}")
                raise
            if attempt < max_attempts - 1:
                delay = min(2 ** attempt + random.uniform(0, 1), 30)
                print(f"LLM call failed on {model} ({elapsed_ms:.0f}ms) — retry {attempt + 1}/{max_attempts} after {delay:.1f}s: {e}")
                time.sleep(delay)
    raise last_exc


def _fallback_to_groq(messages, json_schema, model, start):
    groq_key = os.environ.get("OPENAI_API_KEY")
    if not groq_key:
        print("No OPENAI_API_KEY for Groq fallback")
        raise RuntimeError("OPENAI_API_KEY not set")
    fb_client = _create_client("https://api.groq.com/openai/v1", groq_key)
    return _retry_with(fb_client, messages, json_schema, model, start, _is_fallback=True)


def _fallback_to_openrouter(messages, json_schema, model, start):
    fallback_key = os.environ.get("OPENROUTER_API_KEY")
    if not fallback_key:
        print("No OPENROUTER_API_KEY for fallback")
        raise RuntimeError("OPENROUTER_API_KEY not set")
    fb_client = _create_client("https://openrouter.ai/api/v1", fallback_key)
    return _retry_with(fb_client, messages, json_schema, model, start, _is_fallback=True)


def call_llm(messages, json_schema, model=None, temperature=0):
    """
    Tiered LLM call with fallback chain.
    Throughput ceiling (free tiers): Groq ~100K TPD (~3300 events/day at ~30 tokens/event),
    OpenRouter ~50 free calls/day. Under real usage these can both run dry in a single day.
    Once that happens, events are re-queued as pending and retried on the next cycle.
    A paid provider tier (e.g. Groq paid API or dedicated OpenAI) removes this bottleneck.
    """
    global _breaker_until
    client, models = _ensure_client()
    model = model or models["primary"]
    start = time.time()
    provider = _get_provider(str(client.base_url))
    _quota_hit = False

    # Circuit breaker: if we already exhausted every tier, pause without calling out.
    now = time.time()
    if now < _breaker_until:
        raise LLMQuotaExhausted(
            f"LLM circuit breaker open for {int(_breaker_until - now)}s — skipping call"
        )

    # Tier 1: Primary (Qwen local via Ollama, or configured primary)
    try:
        return _retry_with(client, messages, json_schema, model, start, temperature=temperature)
    except Exception as e:
        if _is_rate_limit_error(e):
            _quota_hit = True
        pass

    # Tier 2: Secondary — same client (useful when both models share a provider)
    secondary = models.get("secondary")
    if secondary and secondary != model:
        print(f"Tier 2: retrying with secondary model: {secondary}")
        try:
            return _retry_with(client, messages, json_schema, secondary, start, temperature=temperature)
        except Exception as e:
            if _is_rate_limit_error(e):
                _quota_hit = True
            pass

    # Tier 2b: If primary was local (Ollama), fall back to Groq cloud
    if provider == "ollama":
        groq_model = os.environ.get("LLM_MODEL_SECONDARY", "llama-3.1-8b-instant")
        print(f"Tier 2b: Ollama failed, falling back to Groq: {groq_model}")
        try:
            return _fallback_to_groq(messages, json_schema, groq_model, start)
        except Exception as e:
            if _is_rate_limit_error(e):
                _quota_hit = True
            pass

    # Tier 2c: If primary was Groq and NOT production, fall back to local Qwen (Ollama)
    _strat = os.environ.get("LLM_ROUTING_STRATEGY", "structured_fast")
    if provider == "groq" and _strat != "production":
        ollama_key = os.environ.get("OLLAMA_API_KEY", "ollama")
        ollama_model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
        print(f"Tier 2c: Groq failed, falling back to Ollama: {ollama_model}")
        try:
            fb_client = _create_client("http://localhost:11434/v1", ollama_key)
            result = _retry_with(fb_client, messages, json_schema, ollama_model, start, temperature=temperature)
            return result
        except Exception as e:
            pass

    # Tier 3: Fallback (OpenRouter free)
    fb_model = models.get("fallback")
    if fb_model:
        print(f"Tier 3: falling back to OpenRouter: {fb_model}")
        try:
            return _fallback_to_openrouter(messages, json_schema, fb_model, start)
        except Exception as e:
            if _is_rate_limit_error(e):
                _quota_hit = True
            pass

    elapsed = (time.time() - start) * 1000
    if _quota_hit:
        msg = f"All LLM tiers quota-exhausted after {elapsed:.0f}ms — events re-queued as pending"
        print(f"[LLM EXHAUSTED] {msg}")
        from utils.error_logger import log_error
        log_error(error={"type": "LLM_QUOTA_EXHAUSTED", "message": msg})
        # Open the circuit breaker so concurrent/queued events stop hammering providers.
        _breaker_until = time.time() + _BREAKER_COOLDOWN_SECONDS
        print(f"[LLM BREAKER] Open for {_BREAKER_COOLDOWN_SECONDS}s (until {_breaker_until:.0f})")
        raise LLMQuotaExhausted(msg)
    raise RuntimeError(f"All LLM tiers failed after {elapsed:.0f}ms")


def call_llm_quick(messages, json_schema, temperature=0.3, timeout=12.0):
    """
    Single-shot LLM call for user-facing features (briefing, insights).
    No retries, no fallback chain, no circuit breaker side effects, short
    timeout so web requests never hang. Returns the parsed JSON dict or raises.
    """
    if not (os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")):
        raise RuntimeError("No LLM API key configured")
    client, models = _ensure_client()

    candidates = []
    primary = models.get("primary") or "openrouter/free"
    candidates.append((primary, str(client.base_url), client.api_key))

    # If the strategy routes to Groq, add the secondary Groq model before the
    # OpenRouter fallback so briefing survives exhausted OpenRouter free quota.
    _strat = os.environ.get("LLM_ROUTING_STRATEGY", "structured_fast")
    groq_strategies = {"groq_fast", "qwen_dev", "production"}
    if _strat in groq_strategies and os.environ.get("OPENAI_API_KEY"):
        secondary = models.get("secondary")
        if secondary and secondary != primary:
            candidates.append((secondary, "https://api.groq.com/openai/v1", os.environ["OPENAI_API_KEY"]))
    else:
        secondary = models.get("secondary")
        custom_base = os.environ.get("OPENAI_BASE_URL")
        if secondary and secondary != primary and custom_base:
            candidates.append((secondary, custom_base, os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")))

    fallback = models.get("fallback")
    if fallback and fallback != primary and os.environ.get("OPENROUTER_API_KEY"):
        candidates.append((fallback, "https://openrouter.ai/api/v1", os.environ["OPENROUTER_API_KEY"]))

    start = time.time()
    last_exc = None
    for model, base_url, api_key in candidates:
        try:
            _client_quick = _create_client(base_url, api_key, timeout=timeout)
            result, api_response = _call(_client_quick, messages, json_schema, model, temperature=temperature)
            _log_usage(model, api_response, (time.time() - start) * 1000, provider=_get_provider(base_url))
            return result
        except Exception as e:
            print(f"[LLM QUICK] model {model} failed ({type(e).__name__}): {str(e)[:200]}")
            last_exc = e
    raise RuntimeError(f"call_llm_quick: all models failed: {last_exc}")
