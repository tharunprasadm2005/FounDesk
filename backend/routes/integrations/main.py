import os
import re
import json
import traceback
import base64
import requests
from flask import Blueprint, request, jsonify, redirect
from urllib.parse import urlencode
from config.database import db
from models.user_integration import UserIntegration
from utils.auth import token_required

integrations_bp = Blueprint('integrations', __name__)


def validate_asana_token(access_token):
    if not access_token:
        return False, "Token is empty"
    if access_token.startswith("mock_"):
        return False, "Token is a mock token. Real Asana OAuth did not complete."
    try:
        resp = requests.get(
            "https://app.asana.com/api/1.0/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except requests.exceptions.Timeout:
        return False, "Asana API timed out during token validation"
    except requests.exceptions.ConnectionError:
        return False, "Could not connect to Asana API"
    except Exception as e:
        return False, f"Token validation request failed: {str(e)}"
    if resp.status_code == 401:
        return False, "Asana returned 401 \u2014 token is invalid or revoked"
    if resp.status_code == 403:
        return False, "Asana returned 403 \u2014 token lacks required permissions"
    if resp.status_code != 200:
        return False, f"Asana returned HTTP {resp.status_code} during token validation"
    user_info = resp.json().get("data", {})
    if not user_info.get("gid"):
        return False, "Asana returned user info without a 'gid' field \u2014 unexpected response shape"
    return True, user_info


def validate_calendly_token(access_token):
    if not access_token:
        return False, "Token is empty"
    if access_token.startswith("mock_"):
        return False, "Token is a mock token. Real Calendly OAuth did not complete."
    try:
        resp = requests.get(
            "https://api.calendly.com/users/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
    except requests.exceptions.Timeout:
        return False, "Calendly API timed out during token validation"
    except requests.exceptions.ConnectionError:
        return False, "Could not connect to Calendly API"
    except Exception as e:
        return False, f"Token validation request failed: {str(e)}"
    if resp.status_code == 200:
        try:
            data = resp.json()
            resource = data.get("resource", {})
            if not resource.get("uri"):
                return False, "Calendly /users/me returned no 'resource.uri'"
            return True, data
        except ValueError:
            return False, "Calendly /users/me returned invalid JSON"
    return False, f"Calendly API returned HTTP {resp.status_code}"


def validate_notion_token(access_token):
    if not access_token:
        return False, "Token is empty"
    if access_token.startswith("mock_"):
        return False, "Token is a mock token. Real Notion OAuth did not complete."
    try:
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Notion-Version": "2022-06-28",
            "Content-Type": "application/json"
        }
        resp = requests.get(
            "https://api.notion.com/v1/users/me",
            headers=headers,
            timeout=10,
        )
    except requests.exceptions.Timeout:
        return False, "Notion API timed out during token validation"
    except requests.exceptions.ConnectionError:
        return False, "Could not connect to Notion API"
    except Exception as e:
        return False, f"Token validation request failed: {str(e)}"
    if resp.status_code == 401:
        return False, "Notion returned 401 \u2014 token is invalid or revoked"
    if resp.status_code == 403:
        return False, "Notion returned 403 \u2014 token lacks required permissions"
    if resp.status_code != 200:
        return False, f"Notion returned HTTP {resp.status_code} during token validation"
    try:
        data = resp.json()
        bot = data.get("bot", data)
        info = {
            "id": data.get("id"),
            "name": bot.get("workspace_name", bot.get("name", "Notion Bot")),
            "type": data.get("type", "bot"),
            "workspace_name": bot.get("workspace_name")
        }
        return True, info
    except Exception as e:
        return False, f"Notion returned invalid JSON: {str(e)}"


ALL_PROVIDERS = {
    "gmail", "outlook", "slack", "teams", "whatsapp",
    "google_calendar", "outlook_calendar", "calendly", "zoom", "google_meet",
    "linear", "jira", "trello", "asana", "github", "gitlab", "clickup", "monday", "notion", "notion_docs", "google_docs",
    "hubspot", "salesforce", "zoho_crm", "pipedrive",
    "razorpay", "stripe", "payu", "zoho_books", "metabase", "looker", "posthog",
    "google_analytics", "mixpanel", "amplitude"
}


@integrations_bp.route('/integrations', methods=['GET'])
@token_required
def get_integrations(current_user_id):
    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    states = {}
    from datetime import datetime, timedelta
    for provider in ALL_PROVIDERS:
        states[provider] = {"connected": False, "email": None, "is_expired": False}
    TOKEN_BASED_PROVIDERS = {"hubspot", "notion", "trello", "mixpanel", "amplitude", "posthog"}
    for integration in integrations:
        is_expired = False
        if integration.provider in TOKEN_BASED_PROVIDERS:
            states[integration.provider] = {
                "connected": True,
                "email": integration.connected_email,
                "is_expired": False
            }
            continue
        if integration.refresh_token and integration.expires_at:
            try:
                refresh_before = timedelta(minutes=10)
                if integration.expires_at < datetime.utcnow() + refresh_before:
                    from services.briefing import (
                        refresh_google_token,
                        refresh_zoho_token,
                        refresh_pipedrive_token,
                        refresh_asana_token,
                        refresh_calendly_token,
                        refresh_linear_token,
                    )
                    provider_refresh_map = {
                        'google': refresh_google_token,
                        'zoho_crm': refresh_zoho_token,
                        'pipedrive': refresh_pipedrive_token,
                        'asana': refresh_asana_token,
                        'calendly': refresh_calendly_token,
                        'linear': refresh_linear_token,
                    }
                    refresh_fn = provider_refresh_map.get(integration.provider)
                    if refresh_fn:
                        success = refresh_fn(integration)
                        if not success:
                            is_expired = True
            except Exception:
                is_expired = True
        elif integration.expires_at and integration.expires_at < datetime.utcnow():
            is_expired = True
        if integration.provider in ALL_PROVIDERS:
            states[integration.provider] = {
                "connected": True,
                "email": integration.connected_email,
                "is_expired": is_expired
            }
        elif integration.provider == 'google':
            states['gmail'] = {
                "connected": True,
                "email": integration.connected_email,
                "is_expired": is_expired
            }
            states['google_calendar'] = {
                "connected": True,
                "email": integration.connected_email,
                "is_expired": is_expired
            }
            states['google_meet'] = {
                "connected": True,
                "email": integration.connected_email,
                "is_expired": is_expired
            }
            states['google_docs'] = {
                "connected": True,
                "email": integration.connected_email,
                "is_expired": is_expired
            }
            states['google_analytics'] = {
                "connected": True,
                "email": integration.connected_email,
                "is_expired": is_expired
            }
    return jsonify(states)


@integrations_bp.route('/integrations/demo', methods=['POST'])
@token_required
def connect_demo(current_user_id):
    return jsonify({"error": "Demo integrations are disabled. Please connect a real live account."}), 400


@integrations_bp.route('/integrations/token', methods=['POST'])
@token_required
def save_token(current_user_id):
    data = request.get_json()
    provider = data.get('provider')
    access_token = data.get('access_token')
    connected_email = data.get('connected_email')
    if not provider or not access_token:
        return jsonify({"error": "Provider and access token are required"}), 400
    if provider not in ALL_PROVIDERS and provider != 'google':
        return jsonify({"error": "Invalid provider"}), 400
    from datetime import datetime, timedelta
    expires_in = data.get('expires_in', 3600)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider=provider).first()
    if not integration:
        integration = UserIntegration(
            user_id=current_user_id,
            provider=provider,
            access_token=access_token,
            connected_email=connected_email,
            expires_at=expires_at
        )
        db.session.add(integration)
    else:
        integration.access_token = access_token
        integration.connected_email = connected_email
        integration.expires_at = expires_at
    db.session.commit()
    return jsonify({"message": f"{provider} token saved successfully", "email": connected_email})


ENV_PROVIDERS = [
    {
        "name": "hubspot",
        "env_vars": ["HUBSPOT_API_KEY"],
        "token_field": "HUBSPOT_API_KEY",
        "validate": lambda t: (True, ""),
    },
    {
        "name": "notion",
        "env_vars": ["NOTION_TOKEN"],
        "token_field": "NOTION_TOKEN",
        "validate": lambda t: (True, ""),
    },
    {
        "name": "trello",
        "env_vars": ["TRELLO_API_KEY", "TRELLO_TOKEN"],
        "token_field": None,
        "validate": lambda t: (True, ""),
    },
    {
        "name": "mixpanel",
        "env_vars": ["MIXPANEL_PROJECT_TOKEN"],
        "token_field": "MIXPANEL_PROJECT_TOKEN",
        "validate": lambda t: (True, ""),
    },
    {
        "name": "amplitude",
        "env_vars": ["AMPLITUDE_API_KEY"],
        "token_field": "AMPLITUDE_API_KEY",
        "validate": lambda t: (True, ""),
    },
    {
        "name": "posthog",
        "env_vars": ["POSTHOG_PROJECT_TOKEN"],
        "token_field": "POSTHOG_PROJECT_TOKEN",
        "validate": lambda t: (True, ""),
    },
]


def auto_connect_env_providers(user_id):
    results = {"connected": [], "skipped": [], "failed": []}
    from datetime import datetime, timedelta
    for p in ENV_PROVIDERS:
        existing = UserIntegration.query.filter_by(user_id=user_id, provider=p["name"]).first()
        if existing:
            results["skipped"].append(p["name"])
            continue
        missing = [v for v in p["env_vars"] if not os.getenv(v)]
        if missing:
            results["skipped"].append(p["name"])
            continue
        try:
            connected_email = f"{p['name'].title()} User"
            if p["name"] == "trello":
                api_key = os.getenv("TRELLO_API_KEY")
                api_token = os.getenv("TRELLO_TOKEN")
                token = json.dumps({"api_key": api_key, "api_token": api_token})
                resp = requests.get(
                    "https://api.trello.com/1/members/me",
                    params={"key": api_key, "token": api_token},
                    timeout=10
                )
                if resp.status_code == 200:
                    trello_user = resp.json()
                    connected_email = trello_user.get("email") or trello_user.get("fullName", "Trello User")
            elif p["name"] == "notion":
                token = os.getenv("NOTION_TOKEN")
                is_valid, info = validate_notion_token(token)
                if is_valid:
                    connected_email = info.get("workspace_name", info.get("name", "Notion Workspace"))
                else:
                    results["failed"].append(p["name"])
                    continue
            elif p["name"] == "hubspot":
                token = os.getenv("HUBSPOT_API_KEY")
                from services.hubspot_service import validate_hubspot_token, get_contacts
                is_valid, msg = validate_hubspot_token(token)
                if is_valid:
                    try:
                        get_contacts(token, limit=1)
                    except Exception:
                        results["failed"].append(p["name"])
                        continue
                else:
                    results["failed"].append(p["name"])
                    continue
            elif p["name"] == "mixpanel":
                token = os.getenv("MIXPANEL_PROJECT_TOKEN")
                from services.mixpanel_service import validate_mixpanel_token
                is_valid, msg = validate_mixpanel_token(token)
                if not is_valid:
                    results["failed"].append(p["name"])
                    continue
            elif p["name"] == "amplitude":
                token = os.getenv("AMPLITUDE_API_KEY")
                from services.amplitude_service import validate_amplitude_token
                is_valid, msg = validate_amplitude_token(token)
                if not is_valid:
                    results["failed"].append(p["name"])
                    continue
            elif p["name"] == "posthog":
                token = os.getenv("POSTHOG_PROJECT_TOKEN")
                from services.posthog_service import validate_posthog_token
                is_valid, msg = validate_posthog_token(token)
                if not is_valid:
                    results["failed"].append(p["name"])
                    continue
            else:
                results["skipped"].append(p["name"])
                continue
            if not token:
                results["failed"].append(p["name"])
                continue
            expires_at = datetime.utcnow() + timedelta(days=365)
            integration = UserIntegration(
                user_id=user_id,
                provider=p["name"],
                access_token=token,
                connected_email=connected_email,
                expires_at=expires_at,
            )
            db.session.add(integration)
            db.session.commit()
            results["connected"].append(p["name"])
        except Exception as e:
            print(f"Auto-connect {p['name']} failed: {e}")
            results["failed"].append(p["name"])
    return results


@integrations_bp.route('/integrations/auto-connect-all', methods=['POST'])
@token_required
def auto_connect_all(current_user_id):
    results = auto_connect_env_providers(current_user_id)
    return jsonify(results)


@integrations_bp.route('/integrations/<provider>', methods=['DELETE'])
@token_required
def disconnect_integration(current_user_id, provider):
    if provider not in ALL_PROVIDERS:
        return jsonify({"error": "Invalid provider"}), 400
    providers_to_delete = [provider]
    if provider in ('gmail', 'google_calendar', 'google_meet', 'google_docs', 'google_analytics'):
        providers_to_delete = ['google', 'gmail', 'google_calendar', 'google_meet', 'google_docs', 'google_analytics']
    integrations = UserIntegration.query.filter(
        UserIntegration.user_id == current_user_id,
        UserIntegration.provider.in_(providers_to_delete)
    ).all()
    if not integrations:
        return jsonify({"error": "Integration not found"}), 404
    for integration in integrations:
        db.session.delete(integration)
    db.session.commit()
    return jsonify({"message": f"{provider} disconnected successfully"})


@integrations_bp.route('/integrations/env-connect', methods=['POST'])
@token_required
def env_connect(current_user_id):
    data = request.get_json()
    provider = data.get('provider')
    if not provider:
        return jsonify({"error": "Provider is required"}), 400
    token = None
    connected_email = None
    expires_days = 365
    if provider == 'hubspot':
        token = os.getenv("HUBSPOT_API_KEY")
        connected_email = data.get('email', 'HubSpot User')
        if not token:
            return jsonify({"error": "HubSpot API key not found in environment. Set HUBSPOT_API_KEY in .env or enter it manually."}), 400
        from services.hubspot_service import validate_hubspot_token, get_contacts
        is_valid, msg = validate_hubspot_token(token)
        if not is_valid:
            return jsonify({"error": msg}), 400
        try:
            get_contacts(token, limit=1)
        except Exception:
            return jsonify({"error": "Invalid HubSpot API key. Could not fetch contacts."}), 400
    elif provider == 'notion':
        token = os.getenv("NOTION_TOKEN")
        connected_email = data.get('email', 'Notion Workspace')
        if not token:
            return jsonify({"error": "Notion token not found in environment. Set NOTION_TOKEN in .env or enter it manually."}), 400
        is_valid, info = validate_notion_token(token)
        if not is_valid:
            return jsonify({"error": f"Notion token validation failed: {info}"}), 400
        connected_email = info.get('workspace_name', info.get('name', 'Notion Workspace'))
    elif provider == 'trello':
        api_key = os.getenv("TRELLO_API_KEY")
        api_token = os.getenv("TRELLO_TOKEN")
        if not api_key or not api_token:
            return jsonify({"error": "Trello credentials not found in environment. Set TRELLO_API_KEY and TRELLO_TOKEN in .env or enter them manually."}), 400
        token = json.dumps({"api_key": api_key, "api_token": api_token})
        connected_email = data.get('email', 'Trello User')
        try:
            resp = requests.get(
                "https://api.trello.com/1/members/me",
                params={"key": api_key, "token": api_token},
                timeout=10
            )
            if resp.status_code == 401:
                return jsonify({"error": "Trello API key or token is invalid"}), 400
            if resp.status_code == 200:
                trello_user = resp.json()
                connected_email = trello_user.get('email') or trello_user.get('fullName', 'Trello User')
        except requests.RequestException as e:
            return jsonify({"error": f"Failed to validate Trello credentials: {str(e)}"}), 400
    elif provider == 'mixpanel':
        token = os.getenv("MIXPANEL_PROJECT_TOKEN")
        connected_email = data.get('email', 'Mixpanel User')
        if not token:
            return jsonify({"error": "Mixpanel token not found in environment. Set MIXPANEL_PROJECT_TOKEN in .env or enter it manually."}), 400
        from services.mixpanel_service import validate_mixpanel_token
        is_valid, msg = validate_mixpanel_token(token)
        if not is_valid:
            return jsonify({"error": msg}), 400
    elif provider == 'amplitude':
        token = os.getenv("AMPLITUDE_API_KEY")
        connected_email = data.get('email', 'Amplitude User')
        if not token:
            return jsonify({"error": "Amplitude API key not found in environment. Set AMPLITUDE_API_KEY in .env or enter it manually."}), 400
        from services.amplitude_service import validate_amplitude_token
        is_valid, msg = validate_amplitude_token(token)
        if not is_valid:
            return jsonify({"error": msg}), 400
    elif provider == 'posthog':
        token = os.getenv("POSTHOG_PROJECT_TOKEN")
        connected_email = data.get('email', 'PostHog User')
        if not token:
            return jsonify({"error": "PostHog token not found in environment. Set POSTHOG_PROJECT_TOKEN in .env or enter it manually."}), 400
        from services.posthog_service import validate_posthog_token
        is_valid, msg = validate_posthog_token(token)
        if not is_valid:
            return jsonify({"error": msg}), 400
    else:
        return jsonify({"error": f"Provider '{provider}' does not support env-connect."}), 400
    if not token:
        return jsonify({"error": "Could not resolve credentials for provider."}), 400
    TOKEN_BASED_PROVIDERS = {"hubspot", "notion", "trello", "mixpanel", "amplitude", "posthog"}
    if provider in TOKEN_BASED_PROVIDERS:
        expires_at = None
    else:
        from datetime import datetime, timedelta
        expires_at = datetime.utcnow() + timedelta(days=expires_days)
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider=provider).first()
    if not integration:
        integration = UserIntegration(
            user_id=current_user_id,
            provider=provider,
            access_token=token,
            connected_email=connected_email,
            expires_at=expires_at
        )
        db.session.add(integration)
    else:
        integration.access_token = token
        integration.connected_email = connected_email
        integration.expires_at = expires_at
    db.session.commit()
    return jsonify({"message": f"{provider} connected successfully", "email": connected_email})
