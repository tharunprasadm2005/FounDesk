import os
import re
import requests
import base64
import json


MIXPANEL_BASE = os.getenv("MIXPANEL_CAPTURE_URL", "https://api.mixpanel.com")


def validate_mixpanel_token(token):
    if not token:
        return False, "Token is empty"
    if token.startswith("mock_"):
        return False, "Token is a mock token"
    if not re.match(r'^[0-9a-f]{32}$', token):
        return False, "Invalid Mixpanel project token format. A valid token is a 32-character hexadecimal string. Get it from: Mixpanel → Project Settings → Project token."
    return True, None


def capture_event(token, event, distinct_id, properties=None):
    """Send an event to Mixpanel for ingestion. Returns True on success."""
    try:
        data = {
            "event": event,
            "properties": {
                "token": token,
                "distinct_id": distinct_id,
                "time": int(__import__('time').time()),
                **(properties or {})
            }
        }
        encoded = base64.b64encode(json.dumps(data).encode('utf-8')).decode('utf-8')
        resp = requests.post(
            f"{MIXPANEL_BASE}/track",
            data={"data": encoded},
            timeout=5
        )
        result = resp.json()
        if isinstance(result, int):
            return result == 1
        return result.get("status") == 1
    except Exception as e:
        print(f"Error capturing Mixpanel event: {e}")
        return False
