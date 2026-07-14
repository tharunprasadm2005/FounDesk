import os
os.environ["LLM_DAILY_LIMIT"] = "500"
os.environ["LLM_ROUTING_STRATEGY"] = "qwen"
os.environ["LLM_MODEL_PRIMARY"] = "qwen2.5:7b"
os.environ["LLM_MODEL_SECONDARY"] = "qwen2.5:7b"
os.environ["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
os.environ["OPENAI_API_KEY"] = "ollama"

from app import app
with app.app_context():
    from pattern_engine.pipeline import _compile_feed
    print("=== Step 1: Compile feed ===")
    _compile_feed(384)
    print("Compile feed done")
    
    from pattern_engine.models import RawEvent
    events = RawEvent.query.filter(RawEvent.processed_at.is_(None)).all()
    print(f"Unprocessed events after compile: {len(events)}")
