"""Test LLM call with structured_fast strategy."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ["APP_ENV"] = "development"
os.environ["LLM_ROUTING_STRATEGY"] = "structured_fast"

from pattern_engine.llm_client import call_llm

messages = [
    {"role": "system", "content": "You are a helpful assistant. Respond in JSON."},
    {"role": "user", "content": "Say hello in a JSON object with a 'greeting' field."}
]
schema = {
    "title": "test",
    "type": "object",
    "properties": {
        "greeting": {"type": "string"}
    },
    "required": ["greeting"]
}

try:
    result = call_llm(messages, schema)
    print(f"SUCCESS: {result}")
except Exception as e:
    print(f"FAILED: {e}")
