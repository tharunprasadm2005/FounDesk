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
    """
    Validate an Asana access token by calling the API.
    Returns (True, user_info_dict) on success, or (False, error_string) on failure.
    Token format (opaque vs JWT) is irrelevant — only API response matters.
    """
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
        return False, "Asana returned 401 — token is invalid or revoked"
    if resp.status_code == 403:
        return False, "Asana returned 403 — token lacks required permissions"
    if resp.status_code != 200:
        return False, f"Asana returned HTTP {resp.status_code} during token validation"

    user_info = resp.json().get("data", {})
    if not user_info.get("gid"):
        return False, "Asana returned user info without a 'gid' field — unexpected response shape"

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
        return False, "Notion returned 401 — token is invalid or revoked"
    if resp.status_code == 403:
        return False, "Notion returned 403 — token lacks required permissions"
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
    # Communication
    "gmail", "outlook", "slack", "teams", "whatsapp",
    # Calendar
    "google_calendar", "outlook_calendar", "calendly", "zoom", "google_meet",
    # Docs + tasks + wikis
    "linear", "jira", "trello", "asana", "github", "gitlab", "clickup", "monday", "notion", "notion_docs", "google_docs",
    # CRM
    "hubspot", "salesforce", "zoho_crm", "pipedrive",
    # Finance - Insights
    "razorpay", "stripe", "payu", "zoho_books", "metabase", "looker", "posthog",
    # Analytics
    "google_analytics", "mixpanel", "amplitude"
}

@integrations_bp.route('/integrations', methods=['GET'])
@token_required
def get_integrations(current_user_id):
    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    states = {}
    
    from datetime import datetime, timedelta
    # Initialize all providers as disconnected
    for provider in ALL_PROVIDERS:
        states[provider] = {"connected": False, "email": None, "is_expired": False}
        
    TOKEN_BASED_PROVIDERS = {"hubspot", "notion", "trello", "mixpanel", "amplitude", "posthog"}
    for integration in integrations:
        is_expired = False

        # API-key-based providers never expire
        if integration.provider in TOKEN_BASED_PROVIDERS:
            states[integration.provider] = {
                "connected": True,
                "email": integration.connected_email,
                "is_expired": False
            }
            continue
        
        # Auto-refresh OAuth tokens that are expired or near expiry
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

@integrations_bp.route('/integrations/connect/posthog', methods=['POST'])
@token_required
def connect_posthog(current_user_id):
    data = request.get_json()
    print(f"[CONNECT POSTHOG] Received body: {data}")
    token = data.get('token')
    connected_email = data.get('connected_email', 'PostHog User')

    if not token:
        print(f"[CONNECT POSTHOG] ERROR: No token in request body. Keys: {list(data.keys()) if data else 'None'}")
        return jsonify({"error": "PostHog project token is required"}), 400

    if token.startswith("mock_"):
        return jsonify({"error": "Mock tokens are disabled. Provide a real PostHog token."}), 400

    from services.posthog_service import validate_posthog_token
    print(f"[CONNECT POSTHOG] Validating token: {token[:15]}...")
    is_valid, msg = validate_posthog_token(token)
    if not is_valid:
        return jsonify({"error": msg}), 400

    from datetime import datetime, timedelta
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='posthog').first()
    if not integration:
        integration = UserIntegration(
            user_id=current_user_id,
            provider='posthog',
            access_token=token,
            connected_email=connected_email,
            expires_at=datetime.utcnow() + timedelta(days=365)
        )
        db.session.add(integration)
    else:
        integration.access_token = token
        integration.connected_email = connected_email
        integration.expires_at = datetime.utcnow() + timedelta(days=365)

    db.session.commit()

    from models.activity_event import ActivityEvent
    from utils.workspace_auth import get_current_workspace_id
    workspace_id = get_current_workspace_id(current_user_id)
    if workspace_id:
        ActivityEvent.query.filter_by(
            workspace_id=workspace_id,
            provider="posthog",
            is_mock=True
        ).delete()

        mirror_event = ActivityEvent(
            workspace_id=workspace_id,
            provider="posthog",
            category="analytics",
            actor=connected_email,
            title="PostHog: Integration connected",
            activity_type="analytics",
            status="tracked",
            external_timestamp=datetime.utcnow(),
            details="PostHog project token configured for event tracking",
            raw_ref=f"posthog_connected_{datetime.utcnow().timestamp()}",
            is_mock=False
        )
        db.session.add(mirror_event)
        db.session.commit()

    from services.posthog_service import capture_event
    capture_event(token, "foundesk_integration_connected", current_user_id, {
        "provider": "posthog",
        "email": connected_email
    })

    return jsonify({"message": "PostHog connected successfully", "email": connected_email})

@integrations_bp.route('/integrations/connect/mixpanel', methods=['POST'])
@token_required
def connect_mixpanel(current_user_id):
    data = request.get_json()
    token = data.get('token')
    connected_email = data.get('connected_email', 'Mixpanel User')

    if not token:
        return jsonify({"error": "Mixpanel project token is required"}), 400

    if token.startswith("mock_"):
        return jsonify({"error": "Mock tokens are disabled. Provide a real Mixpanel token."}), 400

    from services.mixpanel_service import validate_mixpanel_token
    is_valid, msg = validate_mixpanel_token(token)
    if not is_valid:
        return jsonify({"error": msg}), 400

    from datetime import datetime, timedelta
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='mixpanel').first()
    if not integration:
        integration = UserIntegration(
            user_id=current_user_id,
            provider='mixpanel',
            access_token=token,
            connected_email=connected_email,
            expires_at=datetime.utcnow() + timedelta(days=365)
        )
        db.session.add(integration)
    else:
        integration.access_token = token
        integration.connected_email = connected_email
        integration.expires_at = datetime.utcnow() + timedelta(days=365)

    db.session.commit()

    from models.activity_event import ActivityEvent
    from utils.workspace_auth import get_current_workspace_id
    workspace_id = get_current_workspace_id(current_user_id)
    if workspace_id:
        ActivityEvent.query.filter_by(
            workspace_id=workspace_id,
            provider="mixpanel",
            is_mock=True
        ).delete()

        mirror_event = ActivityEvent(
            workspace_id=workspace_id,
            provider="mixpanel",
            category="analytics",
            actor=connected_email,
            title="Mixpanel: Integration connected",
            activity_type="analytics",
            status="tracked",
            external_timestamp=datetime.utcnow(),
            details="Mixpanel project token configured for event tracking",
            raw_ref=f"mixpanel_connected_{datetime.utcnow().timestamp()}",
            is_mock=False
        )
        db.session.add(mirror_event)
        db.session.commit()

    from services.mixpanel_service import capture_event
    capture_event(token, "foundesk_integration_connected", current_user_id, {
        "provider": "mixpanel",
        "email": connected_email
    })

    return jsonify({"message": "Mixpanel connected successfully", "email": connected_email})

@integrations_bp.route('/integrations/connect/amplitude', methods=['POST'])
@token_required
def connect_amplitude(current_user_id):
    data = request.get_json()
    token = data.get('token')
    connected_email = data.get('connected_email', 'Amplitude User')

    if not token:
        return jsonify({"error": "Amplitude API key is required"}), 400

    if token.startswith("mock_"):
        return jsonify({"error": "Mock tokens are disabled. Provide a real Amplitude API key."}), 400

    from services.amplitude_service import validate_amplitude_token
    is_valid, msg = validate_amplitude_token(token)
    if not is_valid:
        return jsonify({"error": msg}), 400

    from datetime import datetime, timedelta
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='amplitude').first()
    if not integration:
        integration = UserIntegration(
            user_id=current_user_id,
            provider='amplitude',
            access_token=token,
            connected_email=connected_email,
            expires_at=datetime.utcnow() + timedelta(days=365)
        )
        db.session.add(integration)
    else:
        integration.access_token = token
        integration.connected_email = connected_email
        integration.expires_at = datetime.utcnow() + timedelta(days=365)

    db.session.commit()

    from models.activity_event import ActivityEvent
    from utils.workspace_auth import get_current_workspace_id
    workspace_id = get_current_workspace_id(current_user_id)
    if workspace_id:
        ActivityEvent.query.filter_by(
            workspace_id=workspace_id,
            provider="amplitude",
            is_mock=True
        ).delete()

        mirror_event = ActivityEvent(
            workspace_id=workspace_id,
            provider="amplitude",
            category="analytics",
            actor=connected_email,
            title="Amplitude: Integration connected",
            activity_type="analytics",
            status="tracked",
            external_timestamp=datetime.utcnow(),
            details="Amplitude API key configured for event tracking",
            raw_ref=f"amplitude_connected_{datetime.utcnow().timestamp()}",
            is_mock=False
        )
        db.session.add(mirror_event)
        db.session.commit()

    from services.amplitude_service import capture_event
    capture_event(token, "foundesk_integration_connected", current_user_id, {
        "provider": "amplitude",
        "email": connected_email
    })

    return jsonify({"message": "Amplitude connected successfully", "email": connected_email})

@integrations_bp.route('/integrations/connect/hubspot', methods=['POST'])
@token_required
def connect_hubspot(current_user_id):
    data = request.get_json()
    token = data.get('token')
    connected_email = data.get('connected_email', 'HubSpot User')

    if not token:
        return jsonify({"error": "HubSpot API key is required"}), 400

    if token.startswith("mock_"):
        return jsonify({"error": "Mock tokens are disabled. Provide a real HubSpot API key."}), 400

    from services.hubspot_service import validate_hubspot_token, get_contacts
    is_valid, msg = validate_hubspot_token(token)
    if not is_valid:
        return jsonify({"error": msg}), 400

    try:
        get_contacts(token, limit=1)
    except Exception:
        return jsonify({"error": "Invalid HubSpot API key. Could not fetch contacts. Check your key at: HubSpot → Settings → Integrations → Private Apps."}), 400

    from datetime import datetime, timedelta
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='hubspot').first()
    if not integration:
        integration = UserIntegration(
            user_id=current_user_id,
            provider='hubspot',
            access_token=token,
            connected_email=connected_email,
            expires_at=datetime.utcnow() + timedelta(days=365)
        )
        db.session.add(integration)
    else:
        integration.access_token = token
        integration.connected_email = connected_email
        integration.expires_at = datetime.utcnow() + timedelta(days=365)

    db.session.commit()

    from models.activity_event import ActivityEvent
    from utils.workspace_auth import get_current_workspace_id
    workspace_id = get_current_workspace_id(current_user_id)
    if workspace_id:
        ActivityEvent.query.filter_by(
            workspace_id=workspace_id,
            provider="hubspot",
            is_mock=True
        ).delete()

        mirror_event = ActivityEvent(
            workspace_id=workspace_id,
            provider="hubspot",
            category="crm",
            actor=connected_email,
            title="HubSpot: Integration connected",
            activity_type="crm",
            status="tracked",
            external_timestamp=datetime.utcnow(),
            details="HubSpot API key configured",
            raw_ref=f"hubspot_connected_{datetime.utcnow().timestamp()}",
            is_mock=False
        )
        db.session.add(mirror_event)
        db.session.commit()

    return jsonify({"message": "HubSpot connected successfully", "email": connected_email})

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

@integrations_bp.route('/integrations/oauth/url', methods=['POST'])
@token_required
def get_oauth_url(current_user_id):
    data = request.get_json()
    raw_provider = data.get('provider')

    # Map individual Google service keys to umbrella 'google' provider
    GOOGLE_SUB_PROVIDERS = {'gmail', 'google_calendar', 'google_meet', 'google_docs', 'google_analytics'}
    if raw_provider in GOOGLE_SUB_PROVIDERS:
        provider = 'google'
    else:
        provider = raw_provider

    if provider == 'google':
        client_id = os.getenv("GOOGLE_INTEGRATION_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
        redirect_uri = os.getenv("GOOGLE_INTEGRATION_REDIRECT_URI", "http://localhost:5173/settings?callback=google")
        if client_id:
            scopes = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/analytics.readonly"
            url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": scopes,
                "access_type": "offline",
                "prompt": "consent",
                "state": "google"
            })
            return jsonify({"url": url})
            
    elif provider == 'github':
        client_id = os.getenv("GITHUB_CLIENT_ID")
        redirect_uri = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:5173/settings?callback=github")
        if client_id:
            scopes = "repo read:user"
            url = "https://github.com/login/oauth/authorize?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": scopes,
                "state": "github"
            })
            return jsonify({"url": url})
            
    elif provider == 'monday':
        client_id = os.getenv("MONDAY_CLIENT_ID")
        redirect_uri = os.getenv("MONDAY_REDIRECT_URI", "http://localhost:5173/settings")
        if client_id:
            url = "https://auth.monday.com/oauth2/authorize?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "state": "monday"
            })
            return jsonify({"url": url})
            
    elif provider == 'slack':
        client_id = os.getenv("SLACK_CLIENT_ID")
        redirect_uri = os.getenv("SLACK_REDIRECT_URI", "http://localhost:5173/settings?callback=slack")
        if client_id:
            state_val = f"slack_user_{current_user_id}"
            scopes = "channels:read,channels:history,users:read"
            url = "https://slack.com/oauth/v2/authorize?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "scope": scopes,
                "state": state_val
            })
            return jsonify({"url": url})
            
    elif provider == 'asana':
        client_id = os.getenv("ASANA_CLIENT_ID")
        redirect_uri = os.getenv("ASANA_REDIRECT_URI", "http://localhost:5173/settings?callback=asana")
        if client_id:
            scopes = "users:read workspaces:read projects:read tasks:read teams:read stories:read"
            url = "https://app.asana.com/-/oauth_authorize?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": scopes,
                "state": "asana"
            })
            return jsonify({"url": url})

    elif provider == 'calendly':
        client_id = os.getenv("CALENDLY_CLIENT_ID")
        redirect_uri = os.getenv("CALENDLY_REDIRECT_URI", "http://localhost:5173/settings?callback=calendly")
        if client_id:
            url = "https://auth.calendly.com/oauth/authorize?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "default",
                "state": "calendly"
            })
            return jsonify({"url": url})

    elif provider == 'linear':
        client_id = os.getenv("LINEAR_CLIENT_ID")
        redirect_uri = os.getenv("LINEAR_REDIRECT_URI", "http://localhost:5173/settings?callback=linear")
        if client_id:
            url = "https://linear.app/oauth/authorize?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "state": "linear"
            })
            return jsonify({"url": url})

    elif provider == 'pipedrive':
        client_id = os.getenv("PIPEDRIVE_CLIENT_ID")
        redirect_uri = os.getenv("PIPEDRIVE_REDIRECT_URI", "http://localhost:5173/settings?callback=pipedrive")
        if client_id:
            url = "https://oauth.pipedrive.com/oauth/authorize?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "state": "pipedrive"
            })
            return jsonify({"url": url})

    elif provider == 'zoho_crm':
        client_id = os.getenv("ZOHO_CLIENT_ID")
        accounts_url = os.getenv("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.in")
        redirect_uri = os.getenv("ZOHO_REDIRECT_URI", "http://localhost:5000/api/integrations/zoho/callback")
        if client_id:
            url = f"{accounts_url}/oauth/v2/auth?" + urlencode({
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": "ZohoCRM.modules.ALL ZohoCRM.settings.ALL offline_access",
                "access_type": "offline",
                "state": f"zoho_crm_{current_user_id}"
            })
            return jsonify({"url": url})

    return jsonify({"error": f"Provider '{provider}' is not supported or OAuth credentials are not configured."}), 400


@integrations_bp.route('/integrations/zoho/callback', methods=['GET'])
def zoho_oauth_callback():
    code = request.args.get('code')
    state = request.args.get('state') or ''
    error = request.args.get('error')

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")

    if error:
        return redirect(f"{frontend_url}/settings?zoho_error={error}")

    if not code:
        return redirect(f"{frontend_url}/settings?zoho_error=no_code")

    # Parse user_id from state: zoho_crm_{user_id}
    if not state.startswith('zoho_crm_'):
        return redirect(f"{frontend_url}/settings?zoho_error=invalid_state")
    try:
        current_user_id = int(state.split('_')[-1])
    except (ValueError, IndexError):
        return redirect(f"{frontend_url}/settings?zoho_error=invalid_state_format")

    client_id = os.getenv("ZOHO_CLIENT_ID")
    client_secret = os.getenv("ZOHO_CLIENT_SECRET")
    accounts_url = os.getenv("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.in")
    redirect_uri = os.getenv("ZOHO_REDIRECT_URI", "http://localhost:5000/api/integrations/zoho/callback")

    if not client_id or not client_secret:
        return redirect(f"{frontend_url}/settings?zoho_error=missing_credentials")

    try:
        res = requests.post(
            f"{accounts_url}/oauth/v2/token",
            data={
                "grant_type": "authorization_code",
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri
            },
            timeout=15
        )
        token_data = res.json()
        print("Zoho token exchange response keys:", list(token_data.keys()))
        print("Zoho api_domain:", token_data.get("api_domain", "NOT PRESENT"))
        if "error" in token_data:
            print("Zoho token exchange error:", token_data.get("error"))
            return redirect(f"{frontend_url}/settings?zoho_error=token_exchange_failed")

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        from datetime import datetime, timedelta
        expires_in = token_data.get("expires_in", 3600)
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
        connected_email = "Zoho CRM User"

        from services.zoho_service import validate_zoho_token
        api_domain = token_data.get("api_domain")
        if not validate_zoho_token(access_token, api_domain):
            return redirect(f"{frontend_url}/settings?zoho_error=token_validation_failed")

        # Save integration
        integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='zoho_crm').first()
        if not integration:
            integration = UserIntegration(
                user_id=current_user_id,
                provider='zoho_crm',
                access_token=access_token,
                refresh_token=refresh_token,
                connected_email=connected_email,
                expires_at=expires_at
            )
            db.session.add(integration)
        else:
            integration.access_token = access_token
            if refresh_token:
                integration.refresh_token = refresh_token
            integration.connected_email = connected_email
            integration.expires_at = expires_at
        db.session.commit()

        return redirect(f"{frontend_url}/settings?zoho=success")

    except Exception as e:
        print("Zoho OAuth callback error:", e)
        return redirect(f"{frontend_url}/settings?zoho_error=server_error")


@integrations_bp.route('/integrations/oauth/callback', methods=['POST'])
@token_required
def oauth_callback(current_user_id):
    data = request.get_json()
    provider = data.get('provider')
    code = data.get('code')
    
    if not provider or not code:
        return jsonify({"error": "Provider and code are required"}), 400
        
    access_token = None
    refresh_token = None
    connected_email = None
    expires_at = None
    workspace_ids = None
    workspace_count = 0

    # PATH TRACE: log which provider and which code path is entered
    print(f"[OAUTH CALLBACK] provider='{provider}', code_prefix='{code[:15] if code else 'NONE'}...'")

    # Map Google sub-providers to umbrella 'google' for callback
    GOOGLE_SUB_PROVIDERS = {'gmail', 'google_calendar', 'google_meet', 'google_docs', 'google_analytics'}
    if provider in GOOGLE_SUB_PROVIDERS:
        provider = 'google'

    if provider not in ('google', 'github', 'slack', 'monday', 'asana', 'calendly', 'linear', 'pipedrive', 'zoho_crm'):
        return jsonify({"error": f"Provider '{provider}' is not supported."}), 400

    try:

        if provider == 'google':
            print("[OAUTH PATH] 'google' -> real OAuth exchange")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock Google codes are disabled."}), 400
            client_id = os.getenv("GOOGLE_INTEGRATION_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
            client_secret = os.getenv("GOOGLE_INTEGRATION_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET")
            redirect_uri = os.getenv("GOOGLE_INTEGRATION_REDIRECT_URI", "http://localhost:5173/settings?callback=google")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Google integration client ID and secret before connecting Google live."}), 400
            
            res = requests.post("https://oauth2.googleapis.com/token", data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri
            }, timeout=15)
            token_data = res.json()
            if "error" in token_data:
                return jsonify({"error": token_data.get("error_description", "OAuth error")}), 400
                
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            
            expires_in = token_data.get("expires_in", 3600)
            from datetime import datetime, timedelta
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            
            headers = {"Authorization": f"Bearer {access_token}"}
            user_info_res = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers=headers, timeout=15)
            user_info = user_info_res.json()
            connected_email = user_info.get("email")

            ga_property_id = None
            try:
                ga_summary_res = requests.get(
                    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
                    headers=headers,
                    timeout=10
                )
                ga_summary_data = ga_summary_res.json()
                summaries = ga_summary_data.get("accountSummaries", [])
                for summary in summaries:
                    props = summary.get("propertySummaries", [])
                    if props:
                        ga_property_id = props[0].get("property", "").replace("properties/", "")
                        break
            except Exception as e:
                print(f"Could not auto-detect GA4 property: {e}")

        if provider == 'github':
            print("[OAUTH PATH] 'github' → real OAuth exchange")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock GitHub codes are disabled."}), 400
            client_id = os.getenv("GITHUB_CLIENT_ID")
            client_secret = os.getenv("GITHUB_CLIENT_SECRET")
            redirect_uri = os.getenv("GITHUB_REDIRECT_URI", "http://localhost:5173/settings?callback=github")
            if not client_id or not client_secret:
                return jsonify({"error": "Set GitHub client ID and secret before connecting GitHub live."}), 400
            
            res = requests.post("https://github.com/login/oauth/access_token", headers={"Accept": "application/json"}, data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri
            }, timeout=15)
            token_data = res.json()
            print("GitHub OAuth Response:", token_data)
            if "error" in token_data:
                return jsonify({"error": token_data.get("error_description", "OAuth error")}), 400
                
            access_token = token_data.get("access_token")
            if not access_token:
                return jsonify({
                    "error": "GitHub OAuth failed",
                    "details": token_data
                }), 400
            
            headers = {"Authorization": f"token {access_token}", "Accept": "application/vnd.github.v3+json"}
            user_res = requests.get("https://api.github.com/user", headers=headers, timeout=15)
            if user_res.status_code == 401:
                return jsonify({"error": "Invalid GitHub token returned by OAuth"}), 400
            if user_res.status_code != 200:
                return jsonify({"error": "Failed to fetch user info from GitHub"}), 400
                
            user_info = user_res.json()
            username = user_info.get("login")
            
            # Fetch user emails
            emails_res = requests.get("https://api.github.com/user/emails", headers=headers, timeout=15)
            primary_email = None
            if emails_res.status_code == 200:
                emails_data = emails_res.json()
                if isinstance(emails_data, list):
                    for email_obj in emails_data:
                        if email_obj.get("primary"):
                            primary_email = email_obj.get("email")
                            break
            
            connected_email = primary_email or user_info.get("email") or username
            
        if provider == 'slack':
            print("[OAUTH PATH] 'slack' -> real OAuth exchange")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock Slack codes are disabled."}), 400
            client_id = os.getenv("SLACK_CLIENT_ID")
            client_secret = os.getenv("SLACK_CLIENT_SECRET")
            redirect_uri = os.getenv("SLACK_REDIRECT_URI", "http://localhost:5173/settings?callback=slack")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Slack client ID and secret before connecting Slack live."}), 400
            
            res = requests.post("https://slack.com/api/oauth.v2.access", data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri
            }, timeout=15)
            token_data = res.json()
            if not token_data.get("ok"):
                return jsonify({"error": token_data.get("error", "OAuth error")}), 400
                
            access_token = token_data.get("access_token")
            team_name = token_data.get("team", {}).get("name", "Slack Workspace")
            connected_email = team_name
            
        if provider == 'monday':
            print("[OAUTH PATH] 'monday' → real OAuth exchange")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock Monday.com codes are disabled."}), 400
            client_id = os.getenv("MONDAY_CLIENT_ID")
            client_secret = os.getenv("MONDAY_CLIENT_SECRET")
            redirect_uri = os.getenv("MONDAY_REDIRECT_URI", "http://localhost:5173/settings")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Monday.com client ID and secret before connecting Monday live."}), 400
            
            res = requests.post("https://auth.monday.com/oauth2/token", headers={"Accept": "application/json"}, data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            }, timeout=15)
            token_data = res.json()
            print("Monday.com OAuth Response:", token_data)
            if "error" in token_data:
                return jsonify({"error": token_data.get("error_description", "OAuth error")}), 400
                
            access_token = token_data.get("access_token")
            if not access_token:
                return jsonify({
                    "error": "Monday.com OAuth failed",
                    "details": token_data
                }), 400
                
            # Fetch user email / profile from Monday GraphQL API v2 (Bearer prefix required for OAuth tokens)
            query = "query { me { id name email } }"
            profile_res = requests.post("https://api.monday.com/v2", headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }, json={"query": query}, timeout=15)
            
            if profile_res.status_code == 401:
                return jsonify({"error": "Invalid Monday token returned by OAuth"}), 400
            if profile_res.status_code != 200:
                return jsonify({"error": "Failed to fetch user info from Monday"}), 400
                
            profile_data = profile_res.json()
            if "errors" in profile_data:
                return jsonify({"error": profile_data["errors"][0].get("message", "GraphQL error")}), 400
                
            me = profile_data.get("data", {}).get("me", {})
            connected_email = me.get("email") or me.get("name") or "Monday User"
            
        if provider == 'asana':
            print("[OAUTH PATH] 'asana' -> real OAuth exchange block")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock Asana codes are disabled."}), 400

            # Idempotency: validate existing token via API before trusting it
            existing = UserIntegration.query.filter_by(user_id=current_user_id, provider='asana').first()
            if existing and existing.access_token:
                is_valid, _ = validate_asana_token(existing.access_token)
                if is_valid:
                    print("Asana already connected — validated token is active, skipping exchange")
                    return jsonify({"message": "asana already connected", "email": existing.connected_email})
                else:
                    print("Existing Asana token failed validation — deleting and reconnecting")
                    db.session.delete(existing)
                    db.session.commit()

            client_id = os.getenv("ASANA_CLIENT_ID")
            client_secret = os.getenv("ASANA_CLIENT_SECRET")
            redirect_uri = os.getenv("ASANA_REDIRECT_URI", "http://localhost:5173/settings?callback=asana")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Asana client ID and secret before connecting Asana live."}), 400

            # ----- TOKEN EXCHANGE (DEBUG VERIFIED) -----
            print("=== ASANA OAUTH DEBUG ===")
            print(f"POST https://app.asana.com/-/oauth_token")
            print(f"Params: client_id=<set> client_secret=<set> grant_type=authorization_code redirect_uri={redirect_uri}")
            print(f"Code prefix: {code[:15] if code else 'NONE'}...")

            try:
                res = requests.post(
                    "https://app.asana.com/-/oauth_token",
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                    timeout=15,
                )
            except requests.exceptions.Timeout:
                return jsonify({"error": "Asana token endpoint timed out. Check your network."}), 502
            except requests.exceptions.ConnectionError:
                return jsonify({"error": "Could not connect to Asana token endpoint."}), 502

            # --- RAW RESPONSE DEBUG ---
            print(f"HTTP Status: {res.status_code}")
            print(f"Content-Type: {res.headers.get('Content-Type', 'unknown')}")

            # Print raw text for debugging — truncate to avoid leaking full tokens in logs
            raw_text = res.text
            print(f"Raw response body (first 500 chars): {raw_text[:500]}")
            print("=== END ASANA DEBUG ===")

            # If response is not JSON, something is fundamentally wrong
            content_type = res.headers.get("Content-Type", "")
            if "json" not in content_type and res.status_code == 200:
                return jsonify({
                    "error": f"Asana returned non-JSON response (Content-Type: {content_type}). Expected JSON. Raw first 200 chars: {raw_text[:200]}"
                }), 502

            try:
                token_data = res.json()
            except ValueError:
                return jsonify({
                    "error": "Asana returned invalid JSON. Raw first 300 chars: " + raw_text[:300]
                }), 502

            # --- LOG RESPONSE KEYS (NOT values for secrets) ---
            print(f"Asana response keys: {list(token_data.keys())}")

            if "error" in token_data:
                err_msg = token_data.get("error_description", token_data.get("error", "OAuth error"))
                print("Asana token exchange error:", err_msg)
                return jsonify({"error": err_msg}), 400

            access_token = token_data.get("access_token")

            # DEBUG: log token prefix to identify format WITHOUT logging full secret
            if access_token:
                print(f"access_token prefix: {access_token[:15]}... (length: {len(access_token)})")
            else:
                print("access_token: MISSING from response")
                # Show what fields ARE present
                debug_fields = {k: str(v)[:50] for k, v in token_data.items()}
                return jsonify({
                    "error": "Asana returned no access_token.",
                    "response_fields": debug_fields
                }), 400

            refresh_token = token_data.get("refresh_token")

            # Mock detection — reject offline mock codes
            if access_token.startswith("mock_"):
                return jsonify({"error": "Mock token detected. Real Asana OAuth did not complete."}), 400

            # API validation — does the token actually work?
            is_valid, user_info = validate_asana_token(access_token)
            if not is_valid:
                print(f"Asana token REJECTED by API validation: {user_info}")
                return jsonify({"error": user_info}), 400

            # Fetch workspaces before saving — validates full API access
            headers = {"Authorization": f"Bearer {access_token}"}
            try:
                ws_res = requests.get("https://app.asana.com/api/1.0/workspaces", headers=headers, timeout=10)
            except requests.exceptions.Timeout:
                return jsonify({"error": "Asana workspace API timed out"}), 502
            except requests.exceptions.ConnectionError:
                return jsonify({"error": "Could not connect to Asana API"}), 502

            if ws_res.status_code != 200:
                return jsonify({"error": f"Asana workspaces API returned HTTP {ws_res.status_code}"}), 502

            workspaces_data = ws_res.json().get("data", [])
            workspace_ids = json.dumps([w["gid"] for w in workspaces_data if "gid" in w])
            workspace_count = len(workspaces_data)

            # All checks passed — safe to save
            from datetime import datetime, timedelta
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            connected_email = user_info.get("email") or user_info.get("name") or "Asana User"

            print(f"Asana OAuth success — gid: {user_info.get('gid')}, email: {connected_email}, workspaces: {workspace_count}")

        if provider == 'calendly':
            print("[OAUTH PATH] 'calendly' → real OAuth exchange")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock Calendly codes are disabled."}), 400

            client_id = os.getenv("CALENDLY_CLIENT_ID")
            client_secret = os.getenv("CALENDLY_CLIENT_SECRET")
            redirect_uri = os.getenv("CALENDLY_REDIRECT_URI", "http://localhost:5173/settings?callback=calendly")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Calendly client ID and secret before connecting Calendly live."}), 400

            try:
                res = requests.post(
                    "https://auth.calendly.com/oauth/token",
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                    timeout=15,
                )
            except requests.exceptions.Timeout:
                return jsonify({"error": "Calendly token endpoint timed out."}), 502
            except requests.exceptions.ConnectionError:
                return jsonify({"error": "Could not connect to Calendly token endpoint."}), 502

            content_type = res.headers.get("Content-Type", "")
            if "json" not in content_type and res.status_code == 200:
                return jsonify({"error": f"Calendly returned non-JSON response. Raw first 200: {res.text[:200]}"}), 502

            try:
                token_data = res.json()
            except ValueError:
                return jsonify({"error": f"Calendly returned invalid JSON: {res.text[:300]}"}), 502

            if "error" in token_data:
                err_msg = token_data.get("error_description", token_data.get("error", "OAuth error"))
                return jsonify({"error": err_msg}), 400

            access_token = token_data.get("access_token")
            if not access_token:
                return jsonify({"error": "Calendly returned no access_token."}), 400

            if access_token.startswith("mock_"):
                return jsonify({"error": "Mock token detected. Real Calendly OAuth did not complete."}), 400

            is_valid, user_info = validate_calendly_token(access_token)
            if not is_valid:
                return jsonify({"error": user_info}), 400

            resource = user_info.get("resource", {})
            connected_email = resource.get("email", "") or "Calendly User"
            user_uri = resource.get("uri", "")

            from datetime import datetime, timedelta
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            refresh_token = token_data.get("refresh_token")
            print(f"Calendly OAuth success — email: {connected_email}, uri: {user_uri}")

        if provider == 'linear':
            print("[OAUTH PATH] 'linear' -> real OAuth exchange")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock Linear codes are disabled."}), 400

            client_id = os.getenv("LINEAR_CLIENT_ID")
            client_secret = os.getenv("LINEAR_CLIENT_SECRET")
            redirect_uri = os.getenv("LINEAR_REDIRECT_URI", "http://localhost:5173/settings?callback=linear")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Linear client ID and secret before connecting Linear live."}), 400

            try:
                res = requests.post(
                    "https://api.linear.app/oauth/token",
                    data={
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "code": code,
                        "grant_type": "authorization_code",
                        "redirect_uri": redirect_uri,
                    },
                    timeout=15,
                )
            except requests.exceptions.Timeout:
                return jsonify({"error": "Linear token endpoint timed out."}), 502
            except requests.exceptions.ConnectionError:
                return jsonify({"error": "Could not connect to Linear token endpoint."}), 502

            content_type = res.headers.get("Content-Type", "")
            if "json" not in content_type and res.status_code == 200:
                return jsonify({"error": f"Linear returned non-JSON response. Raw first 200: {res.text[:200]}"}), 502

            try:
                token_data = res.json()
            except ValueError:
                return jsonify({"error": f"Linear returned invalid JSON: {res.text[:300]}"}), 502

            if "error" in token_data:
                err_msg = token_data.get("error_description", token_data.get("error", "OAuth error"))
                return jsonify({"error": err_msg}), 400

            access_token = token_data.get("access_token")
            if not access_token:
                return jsonify({"error": "Linear returned no access_token."}), 400

            if access_token.startswith("mock_"):
                return jsonify({"error": "Mock token detected. Real Linear OAuth did not complete."}), 400

            from services.linear_service import get_linear_viewer
            try:
                viewer = get_linear_viewer(access_token)
            except Exception as e:
                return jsonify({"error": f"Linear token validation failed: {str(e)}"}), 400

            connected_email = viewer.get("email", "") or viewer.get("name", "") or "Linear User"

            from datetime import datetime, timedelta
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            refresh_token = token_data.get("refresh_token")
            print(f"Linear OAuth success — email: {connected_email}, id: {viewer.get('id')}")

        if provider == 'pipedrive':
            print("[OAUTH PATH] 'pipedrive' -> real OAuth exchange")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock Pipedrive codes are disabled."}), 400
            client_id = os.getenv("PIPEDRIVE_CLIENT_ID")
            client_secret = os.getenv("PIPEDRIVE_CLIENT_SECRET")
            redirect_uri = os.getenv("PIPEDRIVE_REDIRECT_URI", "http://localhost:5173/settings?callback=pipedrive")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Pipedrive client ID and secret before connecting Pipedrive live."}), 400
            import base64
            auth_header = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
            res = requests.post(
                "https://oauth.pipedrive.com/oauth/token",
                headers={"Authorization": f"Basic {auth_header}"},
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri
                },
                timeout=15
            )
            token_data = res.json()
            if "error" in token_data:
                return jsonify({"error": token_data.get("error_description", "Pipedrive OAuth error")}), 400
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            from datetime import datetime, timedelta
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            connected_email = "Pipedrive User"

        # Clean up legacy mock/sandbox integrations for gmail and google_calendar when connecting real Google Workspace
        if provider == 'google':
            UserIntegration.query.filter(
                UserIntegration.user_id == current_user_id,
                UserIntegration.provider.in_(['gmail', 'google_calendar', 'google_docs', 'google_analytics'])
            ).delete(synchronize_session=False)

        # Save or update integration
        integration = UserIntegration.query.filter_by(user_id=current_user_id, provider=provider).first()
        if not integration:
            integration = UserIntegration(
                user_id=current_user_id,
                provider=provider,
                access_token=access_token,
                refresh_token=refresh_token,
                connected_email=connected_email,
                expires_at=expires_at,
                workspace_ids=workspace_ids if provider == 'asana' else None
            )
            db.session.add(integration)
        else:
            integration.access_token = access_token
            if refresh_token:
                integration.refresh_token = refresh_token
            integration.connected_email = connected_email
            if expires_at:
                integration.expires_at = expires_at
            if provider == 'asana' and workspace_ids:
                integration.workspace_ids = workspace_ids
            
        db.session.commit()

        if provider == 'google' and ga_property_id:
            existing_ga = UserIntegration.query.filter_by(user_id=current_user_id, provider='google_analytics').first()
            if not existing_ga:
                ga_integration = UserIntegration(
                    user_id=current_user_id,
                    provider='google_analytics',
                    access_token=access_token,
                    refresh_token=refresh_token,
                    connected_email=connected_email,
                    expires_at=expires_at,
                    property_id=ga_property_id
                )
                db.session.add(ga_integration)
                db.session.commit()

        if provider == 'asana':
            return jsonify({
                "status": "success",
                "integration": "asana",
                "connected": True,
                "workspace_count": workspace_count,
                "user": user_info,
                "email": connected_email
            })
        return jsonify({"message": f"{provider} connected successfully", "email": connected_email})
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("OAuth Callback Exception:", e)
        return jsonify({"error": f"OAuth exchange failed: {str(e)}"}), 500

@integrations_bp.route('/integrations/google-analytics', methods=['GET'])
@token_required
def get_google_analytics_config(current_user_id):
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='google_analytics').first()
    if not integration:
        return jsonify({"property_id": ""}), 200
    return jsonify({"property_id": integration.property_id or ""}), 200

@integrations_bp.route('/integrations/google-analytics', methods=['POST'])
@token_required
def save_google_analytics_config(current_user_id):
    data = request.get_json() or {}
    property_id = data.get('property_id')
    
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='google_analytics').first()
    if not integration:
        integration = UserIntegration(
            user_id=current_user_id,
            provider='google_analytics',
            access_token='property_id_placeholder',
            property_id=property_id
        )
        db.session.add(integration)
    else:
        integration.property_id = property_id
    
    db.session.commit()
    return jsonify({"message": "Google Analytics configuration saved successfully", "property_id": property_id}), 200


@integrations_bp.route('/integrations/zoho/status', methods=['GET'])
@token_required
def zoho_integration_status(current_user_id):
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='zoho_crm').first()
    if not integration:
        return jsonify({"connected": False}), 200
    from services.zoho_service import validate_zoho_token
    valid = validate_zoho_token(integration.access_token)
    from datetime import datetime
    return jsonify({
        "connected": valid,
        "email": integration.connected_email,
        "is_expired": bool(integration.expires_at and integration.expires_at < datetime.utcnow())
    }), 200


@integrations_bp.route('/debug/asana', methods=['GET'])
@token_required
def debug_asana(current_user_id):
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='asana').first()
    if not integration or not integration.access_token:
        return jsonify({"error": "Asana not connected. Reconnect the integration."}), 400

    token = integration.access_token

    # Validates token by calling Asana API — catches mock, expired, revoked, invalid
    is_valid, user_info = validate_asana_token(token)
    if not is_valid:
        return jsonify({
            "error": user_info,
            "hint": "Delete this integration in Settings and reconnect Asana."
        }), 400

    headers = {"Authorization": f"Bearer {token}"}
    result = {"user": user_info}

    try:
        # Workspaces
        ws_res = requests.get("https://app.asana.com/api/1.0/workspaces", headers=headers, timeout=10)
        result["workspaces"] = ws_res.json() if ws_res.status_code == 200 else {
            "error": ws_res.text, "http_status": ws_res.status_code
        }

        # Projects from first workspace
        result["projects"] = {"note": "no workspace found"}
        if ws_res.status_code == 200:
            workspaces = result["workspaces"].get("data", [])
            if workspaces:
                proj_res = requests.get(
                    f"https://app.asana.com/api/1.0/projects?workspace={workspaces[0]['gid']}",
                    headers=headers, timeout=10
                )
                result["projects"] = proj_res.json() if proj_res.status_code == 200 else {
                    "error": proj_res.text, "http_status": proj_res.status_code
                }

        # Tasks from first project
        result["tasks"] = {"note": "no project found"}
        if isinstance(result["projects"], dict) and result["projects"].get("data"):
            proj_gid = result["projects"]["data"][0]["gid"]
            task_res = requests.get(
                f"https://app.asana.com/api/1.0/tasks?project={proj_gid}",
                headers=headers, timeout=10
            )
            result["tasks"] = task_res.json() if task_res.status_code == 200 else {
                "error": task_res.text, "http_status": task_res.status_code
            }

        return jsonify(result)

    except requests.exceptions.Timeout:
        return jsonify({"error": "Asana API timed out"}), 502
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Could not connect to Asana API"}), 502
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

