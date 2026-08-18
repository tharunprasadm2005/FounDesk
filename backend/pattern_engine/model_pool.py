"""
Model pool: multiple free models, each assigned a dedicated slice of the work
(divide & conquer). Each pipeline job has its own lead model so no single model
bears the whole load. Cross-model balance is enforced by tracking live daily
request counts (least-loaded gets chosen next), and quota/rate-limit failures
put a model (or whole provider) into cooldown so FounDesk keeps working even
when one vendor's free tier runs dry.
"""
import os
import re
import time
from datetime import date as _date
from datetime import datetime as _datetime

GROQ_URL = "https://api.groq.com/openai/v1"
OPENROUTER_URL = "https://openrouter.ai/api/v1"

OR_DAILY_CAP = int(os.environ.get("OPENROUTER_FREE_DAILY_LIMIT", "50"))
RANK_GAP = int(os.environ.get("MODEL_POOL_RANK_GAP", "25"))


def _groq_api_key():
    return os.environ.get("OPENAI_API_KEY")


def _or_api_key():
    return os.environ.get("OPENROUTER_API_KEY")


# ── Task → lead/backup models (all verified working on Groq, see audit) ──
# Lead model = dedicated worker for that job; backups take over on cooldown
# or when the lead has done far more requests than them (score balancing).
TASK_GROQ = {
    "brief":          ["openai/gpt-oss-120b", "groq/compound", "qwen/qwen3.6-27b"],
    "decision":       ["openai/gpt-oss-120b", "groq/compound", "openai/gpt-oss-20b"],
    "batch":          ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "groq/compound"],
    "task":           ["openai/gpt-oss-20b", "groq/compound-mini", "openai/gpt-oss-120b"],
    "followup":       ["openai/gpt-oss-20b", "groq/compound-mini", "openai/gpt-oss-120b"],
    "standup":        ["groq/compound", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"],
    "goal":           ["groq/compound", "openai/gpt-oss-20b", "openai/gpt-oss-120b"],
    "meeting":        ["qwen/qwen3.6-27b", "openai/gpt-oss-120b", "groq/compound"],
    "knowledge":      ["qwen/qwen3.6-27b", "openai/gpt-oss-120b", "groq/compound-mini"],
    "crm":            ["groq/compound-mini", "openai/gpt-oss-20b", "allam-2-7b"],
    "blocker":        ["allam-2-7b", "groq/compound-mini", "openai/gpt-oss-20b"],
    "contradiction":  ["groq/compound-mini", "allam-2-7b", "openai/gpt-oss-20b"],
    "general":        ["openai/gpt-oss-120b", "groq/compound", "openai/gpt-oss-20b"],
}

# OpenRouter free pool — appended as a last-resort tier after every Groq task.
# Only active while the key has free-model quota (proactively capped at the
# provider's 50 free requests/day, or 1000 when credits are added).
OR_POOL = [
    "openai/gpt-oss-20b:free",
    "google/gemma-4-31b-it:free",
    "google/gemma-4-26b-a4b-it:free",
]


class _PoolState(object):
    def __init__(self):
        self.usage = {}                 # model_id -> {"requests", "tokens", "day"}
        self.cooldown = {}              # model_id -> until_ts
        self.provider_cooldown = {}     # provider -> until_ts
        self.last_called = {}           # model_id -> ts (for pacing)
        self._loader_day = None
        self._loaded = False


# Minimum seconds between calls to the same model. Keeps tight pipeline loops
# under each free model's tokens-per-minute limit instead of bursting into 429s.
MODEL_MIN_GAP = {
    "allam-2-7b": 12,              # 6K TPM → ~4 calls/min for ~600-token jobs
    "groq/compound-mini": 4,
    "groq/compound": 3,
    "openai/gpt-oss-20b": 2,
    "qwen/qwen3.6-27b": 2,
    "openai/gpt-oss-120b": 1,
}
_MODEL_GAP_ENV_OVERRIDES = {k: v for k, v in os.environ.items()
                            if k.startswith("MODEL_MIN_GAP_")}


def min_gap_for(model):
    for env_key, raw in _MODEL_GAP_ENV_OVERRIDES.items():
        suffix = env_key[len("MODEL_MIN_GAP_"):].lower()
        if model.lower().replace("/", "_").replace(":", "_") == suffix:
            try:
                return float(raw)
            except (TypeError, ValueError):
                break
    return MODEL_MIN_GAP.get(model, 1.0)


def pace(model):
    """Sleep just enough to enforce the minimum inter-call gap for a model so
    free-tier tokens-per-minute limits don't get blown by tight loops."""
    st = _pool
    now = _now()
    last = st.last_called.get(model, 0.0)
    need = min_gap_for(model)
    wait = need - (now - last)
    if wait > 0:
        time.sleep(wait)
    st.last_called[model] = _now()


_pool = _PoolState()


def _today():
    return _date.today().isoformat()


def _now():
    return time.time()


def load_daily_usage():
    """Seed per-model request counts + OpenRouter proactive cap from the DB so
    balancing survives restarts. Runs once per day (lazily on first pick)."""
    st = _pool
    if st._loaded and st._loader_day == _today():
        return
    st._loaded = True
    st._loader_day = _today()
    st.usage = {}
    try:
        from config.database import db
        from pattern_engine.models import LLMUsageLog, ProviderUsage
        today_start = _datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        rows = (
            db.session.query(
                LLMUsageLog.model,
                db.func.count(LLMUsageLog.id),
                db.func.sum(LLMUsageLog.total_tokens),
            )
            .filter(LLMUsageLog.created_at >= today_start)
            .group_by(LLMUsageLog.model)
            .all()
        )
        for model, req, tok in rows:
            st.usage[model] = {"requests": req or 0, "tokens": tok or 0, "day": _today()}
        pv = ProviderUsage.query.filter_by(provider="openrouter", date=_date.today()).first()
        if pv and (pv.requests_count or 0) >= OR_DAILY_CAP:
            until = _datetime.utcnow().replace(hour=23, minute=59, second=59).timestamp()
            st.provider_cooldown["openrouter"] = until
            print(f"[MODEL POOL] OpenRouter already at daily cap ({pv.requests_count} req) — "
                  f"capped until end of day")
    except Exception as e:
        print(f"[MODEL POOL] load_daily_usage failed (non-fatal): {e}")
        try:
            from config.database import db
            db.session.rollback()
        except Exception:
            pass


def mark_success(model, tokens=0):
    """Record a successful call (used for live load balancing)."""
    st = _pool
    entry = st.usage.get(model)
    if not entry or entry["day"] != _today():
        entry = {"requests": 0, "tokens": 0, "day": _today()}
        st.usage[model] = entry
    entry["requests"] += 1
    entry["tokens"] += int(tokens or 0)
    # A success means the provider is definitely alive — clear its cooldown.
    st.cooldown.pop(model, None)


# Signals that mean "the WHOLE provider's free allowance is gone for the day" —
# not a short per-model rate-limit blip. Only these should cool the provider
# (and only then for the full day). Bare "429 too many requests" style errors
# get a short per-model backoff so a transient burst doesn't disable a model.
_FULL_EXHAUSTION_SIGNALS = (
    "free-models-per-day",
    "daily limit",
    "daily_limit",
    "daily limit reached",
    "daily usage",
    "you exceeded your daily",
    "quota exhausted",
    "allowance exhausted",
    "all llm pool models",
    # Groq daily token cap: tokens-per-day (TPD) is spent for the day.
    "tokens per day",
    "(tpd)",
)


def _parse_groq_wait(msg):
    """Groq 429s include 'Please try again in NNMs' or 'Please try again in NNs'.
    Extract the suggested wait so we back off exactly as long as the provider asks."""
    try:
        m = re.search(r"please try again in ([\d.]+)\s*(ms|s|m)", msg)
        if not m:
            return None
        num = float(m.group(1))
        unit = m.group(2)
        if unit == "ms":
            return max(1, num / 1000.0)
        if unit == "m":
            return num * 60
        return num
    except (ValueError, TypeError):
        return None


def mark_failure(model, error, provider=None):
    """Apply a model/provider cooldown based on the failure type."""
    st = _pool
    now = _now()
    msg = str(error).lower()

    # Try to honor the provider's own reset/retry hint headers.
    reset_ts = None
    retry_after = None
    try:
        resp = getattr(error, "response", None)
        headers = getattr(resp, "headers", None) if resp is not None else {}
        if headers:
            reset_hdr = headers.get("x-ratelimit-reset") or headers.get("X-RateLimit-Reset")
            if reset_hdr:
                try:
                    reset_ts = int(str(reset_hdr).strip())
                    if reset_ts > 1000000000000:
                        reset_ts /= 1000.0
                except (TypeError, ValueError):
                    reset_ts = None
            ra = headers.get("retry-after") or headers.get("Retry-After")
            if ra:
                try:
                    retry_after = int(str(ra).strip())
                except (TypeError, ValueError):
                    retry_after = None
    except Exception:
        reset_ts = None

    if any(c in msg for c in ["429", "rate_limit", "rate limit", "free-models-per-day", "quota", "exhausted"]):
        full = any(c in msg for c in _FULL_EXHAUSTION_SIGNALS)
        # Groq "for model `X`" errors are per-backend-model, NOT provider-wide:
        # one model's daily cap must not poison the whole Groq key.
        model_scoped = provider == "groq" and "for model `" in msg
        if full and not model_scoped:
            until = reset_ts if (reset_ts and reset_ts > now) else now + 12 * 3600
            st.cooldown[model] = until
            if provider:
                st.provider_cooldown[provider] = max(st.provider_cooldown.get(provider, 0.0), until)
            print(f"[MODEL POOL] {model} full daily quota hit — cooldown until {_fmt(until)} "
                  f"(provider={provider})")
        else:
            # Per-minute / per-model / rolling-daily rate limit: honor the
            # provider's own wait hint if present, otherwise a short backoff.
            wait = _parse_groq_wait(msg)
            if wait and wait > 0:
                # TPD rolling-window messages say "try again in 29m" — don't ban
                # the model for the day; recover when the window rolls.
                until = now + min(wait, 7200)
            elif reset_ts and reset_ts > now:
                until = reset_ts
            elif retry_after and retry_after > 0:
                until = now + min(retry_after, 300)
            else:
                until = now + 180
            st.cooldown[model] = until
            print(f"[MODEL POOL] {model} rate-limit backoff {int(until - now)}s "
                  f"(provider={provider}, full={full}, wait_hint={wait}, model_scoped={model_scoped})")
    elif any(c in msg for c in ["400", "json_validate", "model_not_found", "does not exist",
                                "not found", "requires model"]):
        st.cooldown[model] = now + 30 * 60
        print(f"[MODEL POOL] {model} bad-request failure — cooldown 30m: {msg[:140]}")
    else:
        st.cooldown[model] = now + 60
        print(f"[MODEL POOL] {model} transient failure — cooldown 60s: {msg[:140]}")


def _fmt(ts):
    try:
        return _datetime.utcfromtimestamp(ts).strftime("%H:%M:%S")
    except Exception:
        return str(ts)


def pick(task="general", limit=3):
    """Return an ordered list of candidate (model, base_url, api_key) tuples for
    a task, sorted by (cooldown, rank gap + live daily usage). Lazy-loads the
    day's usage counts on first call. Empty list = no provider available.

    OpenRouter is a true last-resort tier: it only appears when every Groq model
    for the task is blocked (cooldown/quota), never just because it has fewer
    requests today — otherwise it would outrank a busy-but-healthy Groq model."""
    load_daily_usage()
    st = _pool
    now = _now()

    groq_key = _groq_api_key()
    or_key = _or_api_key()
    if not groq_key and not or_key:
        return []

    def blocked(c):
        if st.provider_cooldown.get(c["provider"], 0.0) > now:
            return True
        if c["model"] in st.cooldown and st.cooldown[c["model"]] > now:
            return True
        return False

    def score(c):
        u = st.usage.get(c["model"], {}).get("requests", 0)
        return c["rank"] * RANK_GAP + u

    candidates = []
    if groq_key:
        rank = 0
        for model in TASK_GROQ.get(task, TASK_GROQ["general"]):
            c = {"provider": "groq", "url": GROQ_URL, "key": groq_key,
                 "model": model, "rank": rank}
            rank += 1
            if not blocked(c):
                candidates.append(c)
        candidates.sort(key=score)
        if candidates:
            result = [(c["model"], c["url"], c["key"]) for c in candidates[:limit]]
            print(f"[MODEL POOL] pick(task={task}) groq_candidates={[c['model'] for c in candidates]}")
            return result
    # No healthy Groq model left for this task → fall through to OpenRouter.
    if or_key:
        or_cands = []
        rank = 0
        for model in OR_POOL:
            c = {"provider": "openrouter", "url": OPENROUTER_URL, "key": or_key,
                 "model": model, "rank": rank}
            rank += 1
            if not blocked(c):
                or_cands.append(c)
        or_cands.sort(key=score)
        print(f"[MODEL POOL] pick(task={task}) GROQ EMPTY — using OpenRouter={[c['model'] for c in or_cands]}")
        return [(c["model"], c["url"], c["key"]) for c in or_cands[:limit]]
    return []


def snapshot():
    """Observability: per-model usage, cooldown state, provider cooldowns."""
    st = _pool
    now = _now()
    models = {}
    for model, entry in st.usage.items():
        models[model] = {
            "requests_today": entry["requests"],
            "tokens_today": entry["tokens"],
            "cooldown_until": st.cooldown.get(model, 0.0),
            "cooling": st.cooldown.get(model, 0.0) > now,
        }
    providers = {}
    for p, until in st.provider_cooldown.items():
        providers[p] = {"cooldown_until": until, "cooling": until > now}
    return {
        "groq_key": bool(_groq_api_key()),
        "openrouter_key": bool(_or_api_key()),
        "openrouter_daily_cap": OR_DAILY_CAP,
        "rank_gap": RANK_GAP,
        "models": models,
        "providers": providers,
    }