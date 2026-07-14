import os
# Override ALL relevant env vars BEFORE app imports (which loads .env)
os.environ["LLM_DAILY_LIMIT"] = "500"
os.environ["LLM_ROUTING_STRATEGY"] = "qwen"  
os.environ["LLM_MODEL_PRIMARY"] = "qwen2.5:7b"  # override .env's llama-3.3-70b-versatile
os.environ["LLM_MODEL_SECONDARY"] = "qwen2.5:7b"
os.environ["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
os.environ["OPENAI_API_KEY"] = "ollama"

from app import app
with app.app_context():
    from pattern_engine.models import RawEvent, PipelineLock
    from config.database import db
    
    # Reset
    RawEvent.query.update({'processed_at': None, 'pipeline_name': None})
    PipelineLock.query.delete()
    db.session.commit()
    print(f"Reset {RawEvent.query.count()} RawEvents")
    
    from pattern_engine.pipeline import run_all
    print("Starting pipeline with qwen2.5:7b (local Ollama)...")
    result = run_all(user_id=653)
    print(f"Pipeline result: {result}")
