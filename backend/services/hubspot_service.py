import requests


HUBSPOT_BASE = "https://api.hubapi.com"


def validate_hubspot_token(token):
    if not token:
        return False, "Token is empty"
    if token.startswith("mock_"):
        return False, "Token is a mock token"
    return True, None


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }


def get_contacts(token, limit=20):
    url = f"{HUBSPOT_BASE}/crm/v3/objects/contacts"
    resp = requests.get(url, headers=_headers(token), params={"limit": limit}, timeout=10)
    resp.raise_for_status()
    return resp.json()


def get_deals(token, limit=20):
    url = f"{HUBSPOT_BASE}/crm/v3/objects/deals"
    params = {"limit": limit, "properties": ["dealname", "amount", "dealstage", "hs_notes", "description", "dealtype", "pipeline"]}
    resp = requests.get(url, headers=_headers(token), params=params, timeout=10)
    resp.raise_for_status()
    return resp.json()


def get_companies(token, limit=20):
    url = f"{HUBSPOT_BASE}/crm/v3/objects/companies"
    resp = requests.get(url, headers=_headers(token), params={"limit": limit}, timeout=10)
    resp.raise_for_status()
    return resp.json()
