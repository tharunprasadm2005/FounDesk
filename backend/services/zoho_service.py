import os
import requests


def _get_api_url():
    return os.getenv("ZOHO_API_URL", "https://www.zohoapis.in")


def validate_zoho_token(access_token, api_domain=None):
    try:
        base = api_domain or _get_api_url()
        url = f"{base}/crm/v2/org"
        headers = {"Authorization": f"Zoho-oauthtoken {access_token}"}
        response = requests.get(url, headers=headers, timeout=10)
        return response.status_code == 200
    except Exception:
        return False


def get_deals(access_token, limit=20):
    resp = requests.get(
        f"{_get_api_url()}/crm/v2/Deals",
        headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
        params={"per_page": limit},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()


def get_contacts(access_token, limit=20):
    resp = requests.get(
        f"{_get_api_url()}/crm/v2/Contacts",
        headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
        params={"per_page": limit},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()


def get_leads(access_token, limit=20):
    resp = requests.get(
        f"{_get_api_url()}/crm/v2/Leads",
        headers={"Authorization": f"Zoho-oauthtoken {access_token}"},
        params={"per_page": limit},
        timeout=10
    )
    resp.raise_for_status()
    return resp.json()
