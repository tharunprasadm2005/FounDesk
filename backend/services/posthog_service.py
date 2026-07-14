import os
import requests


POSTHOG_BASE = os.getenv("POSTHOG_CAPTURE_URL", "https://us.i.posthog.com")


def validate_posthog_token(token):
    if not token:
        return False, "Token is empty"
    if token.startswith("mock_"):
        return False, "Token is a mock token"
    if token.startswith("phx_"):
        return False, "Wrong token type. Use your Project API token (starts with phc_), not a Personal API key (phx_). Get it from: PostHog \u2192 Project Settings \u2192 Project token."
    if not token.startswith("phc_"):
        return False, "Invalid PostHog token format. A valid Project API token starts with 'phc_'. Get it from: PostHog \u2192 Project Settings \u2192 Project token."
    return True, None


def capture_event(token, event, distinct_id, properties=None):
    """Send an event to PostHog for ingestion. Returns True on success."""
    try:
        resp = requests.post(
            f"{POSTHOG_BASE}/capture/",
            json={
                "api_key": token,
                "event": event,
                "distinct_id": distinct_id,
                "properties": properties or {}
            },
            timeout=5
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"Error capturing PostHog event: {e}")
        return False
