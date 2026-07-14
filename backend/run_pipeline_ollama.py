import os
os.environ["LLM_DAILY_LIMIT"] = "500"
os.environ["LLM_ROUTING_STRATEGY"] = "qwen"
os.environ["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
os.environ["OPENAI_API_KEY"] = "ollama"

from app import app
with app.app_context():
    from pattern_engine.pipeline import run_all
    print("Starting pipeline with Ollama (qwen2.5:7b)...")
    result = run_all(user_id=653)
    print(f"Pipeline result: {result}")
