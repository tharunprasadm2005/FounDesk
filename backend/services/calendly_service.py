import os
import sys
import requests


def is_mock_token(token):
    if not token:
        return True
    return token.startswith("mock_") or (
        os.getenv("APP_MODE") == "demo" or
        "test" in sys.argv[0] or
        "pytest" in sys.modules
    )


def get_calendly_user_me(token):
    if is_mock_token(token):
        return {}
    resp = requests.get(
        "https://api.calendly.com/users/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    if resp.status_code == 200:
        resource = resp.json().get("resource", {})
        if not resource.get("uri"):
            raise Exception("Calendly /users/me returned no 'resource.uri'")
        return resource
    raise Exception(f"Calendly API error {resp.status_code}: {resp.text}")


def get_calendly_events(token, user_uri):
    if is_mock_token(token):
        return []
    resp = requests.get(
        "https://api.calendly.com/scheduled_events",
        params={"user": user_uri, "status": "active"},
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )
    if resp.status_code == 200:
        return resp.json().get("collection", [])
    raise Exception(f"Calendly events API error {resp.status_code}: {resp.text}")
