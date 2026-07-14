import os
os.environ["LLM_DAILY_LIMIT"] = "500"
os.environ["LLM_ROUTING_STRATEGY"] = "qwen"
os.environ["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
os.environ["OPENAI_API_KEY"] = "ollama"

from app import app
with app.app_context():
    from pattern_engine.llm_client import call_llm

    # Test: simple LLM call
    test_messages = [
        {"role": "system", "content": "You are a helpful assistant. Answer concisely."},
        {"role": "user", "content": "Say hello in one word."}
    ]
    test_schema = {
        "title": "test",
        "type": "object",
        "properties": {
            "greeting": {"type": "string"}
        },
        "required": ["greeting"]
    }
    print("Testing Ollama LLM call...")
    result = call_llm(test_messages, test_schema)
    print(f"Result: {result}")
