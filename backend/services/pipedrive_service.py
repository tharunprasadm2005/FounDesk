import requests


PIPEDRIVE_BASE = "https://api.pipedrive.com/v1"


def get_deals(access_token, limit=20):
    resp = requests.get(
        f"{PIPEDRIVE_BASE}/deals",
        headers={"Authorization": f"Bearer {access_token}"},
        params={"limit": limit},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()
