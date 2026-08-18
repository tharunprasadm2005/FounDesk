import json
import os
import re
import time
import random
from openai import OpenAI
from config.database import db
from pattern_engine.models import LLMUsageLog, ProviderUsage
from pattern_engine.model_pool import (
    GROQ_URL,
    OPENROUTER_URL,
    _groq_api_key,
    _or_api_key,
    mark_failure,
    mark_success,
    pace,
    pick,
)
from datetime import date as _date

from pattern_engine.model_pool import _FULL_EXHAUSTION_SIGNALS


class LLMQuotaExhausted(RuntimeError):
    """Raised when all LLM tiers return quota/rate-limit errors.
    Pipeline code should catch this and re-queue events as pending (not failed)."""


# Global circuit breaker: when every provider is quota-exhausted, pause calls
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


def _log_usage(model, response, elapsed_ms, provider=None, task=None):
    try:
        if response is None:
            return
        usage = response.usage if hasattr(response, 'usage') else None
        total = 0
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
        # Live per-model balancing (updated even if usage logging is skipped)
        mark_success(model, total)
    except Exception as e:
        print(f"LLM usage log failed (non-fatal): {e}")
        mark_success(model, 0)


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


def _retry_with(client, messages, json_schema, model, start, temperature=0):
    max_attempts = int(os.environ.get("LLM_RETRY_ATTEMPTS", "3"))
    last_exc = None
    provider = _get_provider(str(client.base_url))
    for attempt in range(max_attempts):
        try:
            result, api_response = _call(client, messages, json_schema, model, temperature=temperature)
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


def call_llm(messages, json_schema, model=None, temperature=0, task="general"):
    """
    Multi-model LLM call (divide & conquer). A shared pool of free models is
    distributed across pipeline jobs — each task type has a dedicated lead model,
    and live per-model usage ensures the least-loaded model is picked next. If a
    model hits its quota/rate limit, it goes into cooldown and its backups carry
    the work, so one vendor running dry no longer stalls the whole pipeline.
    """
    global _breaker_until
    start = time.time()

    # Circuit breaker: if every provider is already exhausted, pause without calling out.
    now = time.time()
    if now < _breaker_until:
        raise LLMQuotaExhausted(
            f"LLM circuit breaker open for {int(_breaker_until - now)}s — skipping call"
        )

    # Explicit model override (rare) → resolve a single candidate.
    if model:
        candidates = _resolve_override_candidate(model)
        if not candidates:
            raise RuntimeError(f"Cannot resolve LLM model override: {model}")
    else:
        candidates = pick(task=task, limit=4)

    if not candidates:
        raise LLMQuotaExhausted("No LLM provider available (all models in cooldown)")

    _quota_hit = False
    tried = []
    for model_id, base_url, api_key in candidates:
        if model_id in tried:
            continue
        tried.append(model_id)
        try:
            pace(model_id)
            client = _create_client(base_url, api_key)
            return _retry_with(client, messages, json_schema, model_id, start, temperature=temperature)
        except Exception as e:
            provider = _get_provider(base_url)
            msg = str(e).lower()
            if _is_rate_limit_error(e):
                _quota_hit = True
                if any(c in msg for c in _FULL_EXHAUSTION_SIGNALS):
                    print(f"[LLM] full daily quota signal on {model_id}: {msg[:120]}")
            mark_failure(model_id, e, provider=provider)
            print(f"[LLM] task={task} model {model_id} failed ({type(e).__name__}): {str(e)[:200]}")

    elapsed = (time.time() - start) * 1000
    if _quota_hit:
        msg = f"All LLM pool models quota-exhausted after {elapsed:.0f}ms — events re-queued as pending"
        print(f"[LLM EXHAUSTED] {msg}")
        try:
            from utils.error_logger import log_error
            log_error(error={"type": "LLM_QUOTA_EXHAUSTED", "message": msg})
        except Exception:
            pass
        # Only open the global breaker when the ENTIRE pool is down. Niche
        # models for a single task may be exhausted (e.g. contradiction's
        # compound-mini hit its TPD) while other models still have capacity —
        # those must not stall the rest of the pipeline.
        remaining = pick(task="general", limit=1)
        if not remaining:
            _breaker_until = time.time() + _BREAKER_COOLDOWN_SECONDS
            print(f"[LLM BREAKER] Open for {_BREAKER_COOLDOWN_SECONDS}s (entire pool exhausted)")
        raise LLMQuotaExhausted(msg)
    raise RuntimeError(f"All LLM pool models failed after {elapsed:.0f}ms (tried: {tried})")


def call_llm_quick(messages, json_schema, temperature=0.3, timeout=12.0, task="general"):
    """
    Single-shot multi-model call for user-facing features (briefing, insights).
    Tries the pool's candidate models (short timeout, no retries, no circuit
    breaker side effects) so web requests never hang. Returns parsed JSON dict.
    """
    if not (_groq_api_key() or _or_api_key()):
        raise RuntimeError("No LLM API key configured")

    candidates = pick(task=task, limit=4)
    if not candidates:
        raise RuntimeError("call_llm_quick: no LLM provider available (all in cooldown)")

    start = time.time()
    last_exc = None
    tried = []
    for model_id, base_url, api_key in candidates:
        if model_id in tried:
            continue
        tried.append(model_id)
        try:
            pace(model_id)
            client = _create_client(base_url, api_key, timeout=timeout)
            result, api_response = _call(client, messages, json_schema, model_id, temperature=temperature)
            _log_usage(model_id, api_response, (time.time() - start) * 1000,
                       provider=_get_provider(base_url), task=task)
            return result
        except Exception as e:
            print(f"[LLM QUICK] task={task} model {model_id} failed ({type(e).__name__}): {str(e)[:200]}")
            last_exc = e
            mark_failure(model_id, e, provider=_get_provider(base_url))
    raise RuntimeError(f"call_llm_quick: all models failed (tried {tried}): {last_exc}")


def _resolve_override_candidate(model):
    """Resolve an explicit model string to (model, base_url, api_key). Uses the
    provider best matching the model id / configured keys."""
    groq_key = _groq_api_key()
    or_key = _or_api_key()
    if groq_key:
        return [(model, GROQ_URL, groq_key)]
    if or_key:
        return [(model, OPENROUTER_URL, or_key)]
    return []