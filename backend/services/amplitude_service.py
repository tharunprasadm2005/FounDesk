import os
import re
import requests
import json
import time


AMPLITUDE_BASE = os.getenv("AMPLITUDE_CAPTURE_URL", "https://api2.amplitude.com")


def validate_amplitude_token(token):
    if not token:
        return False, "Token is empty"
    if token.startswith("mock_"):
        return False, "Token is a mock token"
    if not re.match(r'^[0-9a-f]{32}$', token):
        return False, "Invalid Amplitude API key format. A valid API key is a 32-character hexadecimal string. Get it from: Amplitude → Settings → Projects → API Key."
    return True, None


def capture_event(token, event, user_id, properties=None):
    """Send an event to Amplitude for ingestion. Returns True on success."""
    try:
        payload = {
            "api_key": token,
            "events": [{
                "event_type": event,
                "user_id": str(user_id),
                "time": int(time.time() * 1000),
                "event_properties": properties or {}
            }]
        }
        resp = requests.post(
            f"{AMPLITUDE_BASE}/2/httpapi",
            json=payload,
            timeout=5
        )
        result = resp.json()
        return result.get("code") == 200
    except Exception as e:
        print(f"Error capturing Amplitude event: {e}")
        return False
