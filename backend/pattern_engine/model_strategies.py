import os

STRATEGY_MODELS = {
    "structured_fast": {
        "primary": "google/gemini-2.0-flash-lite-preview-02-05:free",
        "fallback": "openrouter/free",
    },
    "structured_quality": {
        "primary": "google/gemini-2.0-flash-001",
        "fallback": "google/gemini-2.0-flash-lite-preview-02-05:free",
    },
    "cost_minimized": {
        "primary": "openrouter/free",
        "fallback": "google/gemini-2.0-flash-lite-preview-02-05:free",
    },
    "qwen": {
        "primary": "qwen2.5:7b",
        "fallback": "openrouter/free",
    },
    "groq_fast": {
        "primary": "llama-3.3-70b-versatile",
        "fallback": "qwen2.5:7b",
    },
    "qwen_dev": {
        "primary": "llama-3.3-70b-versatile",
        "fallback": "qwen2.5:7b",
    },
    "production": {
        "primary": "openai/gpt-oss-120b",
        "secondary": "qwen/qwen3.6-27b",
        "fallback": "openrouter/free",
    },
}

def get_models_for_strategy(name):
    cfg = STRATEGY_MODELS.get(name, STRATEGY_MODELS["structured_fast"])
    return {
        "primary": os.environ.get("LLM_MODEL_PRIMARY") or cfg["primary"],
        "secondary": os.environ.get("LLM_MODEL_SECONDARY") or cfg.get("secondary") or cfg["primary"],
        "fallback": os.environ.get("LLM_MODEL_FALLBACK") or cfg["fallback"],
    }
