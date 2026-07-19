import os
import json
import base64
import requests
from flask import request, jsonify, redirect
from urllib.parse import urlencode
from config.database import db
from models.user_integration import UserIntegration
from utils.auth import token_required
from routes.integrations.main import integrations_bp, validate_asana_token, validate_calendly_token


@integrations_bp.route('/integrations/oauth/url', methods=['POST'])
@token_required
def get_oauth_url(current_user_id):
    data = request.get_json()
    raw_provider = data.get('provider')
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
    ga_property_id = None
    print(f"[OAUTH CALLBACK] provider='{provider}', code_prefix='{code[:15] if code else 'NONE'}...'")
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
            from datetime import datetime, timedelta
            expires_in = token_data.get("expires_in", 3600)
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
            print("[OAUTH PATH] 'github' \u2192 real OAuth exchange")
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
            print("[OAUTH PATH] 'monday' \u2192 real OAuth exchange")
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
            existing = UserIntegration.query.filter_by(user_id=current_user_id, provider='asana').first()
            if existing and existing.access_token:
                is_valid, _ = validate_asana_token(existing.access_token)
                if is_valid:
                    print("Asana already connected \u2014 validated token is active, skipping exchange")
                    return jsonify({"message": "asana already connected", "email": existing.connected_email})
                else:
                    print("Existing Asana token failed validation \u2014 deleting and reconnecting")
                    db.session.delete(existing)
                    db.session.commit()
            client_id = os.getenv("ASANA_CLIENT_ID")
            client_secret = os.getenv("ASANA_CLIENT_SECRET")
            redirect_uri = os.getenv("ASANA_REDIRECT_URI", "http://localhost:5173/settings?callback=asana")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Asana client ID and secret before connecting Asana live."}), 400
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
            print(f"HTTP Status: {res.status_code}")
            print(f"Content-Type: {res.headers.get('Content-Type', 'unknown')}")
            raw_text = res.text
            print(f"Raw response body (first 500 chars): {raw_text[:500]}")
            print("=== END ASANA DEBUG ===")
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
            print(f"Asana response keys: {list(token_data.keys())}")
            if "error" in token_data:
                err_msg = token_data.get("error_description", token_data.get("error", "OAuth error"))
                print("Asana token exchange error:", err_msg)
                return jsonify({"error": err_msg}), 400
            access_token = token_data.get("access_token")
            if access_token:
                print(f"access_token prefix: {access_token[:15]}... (length: {len(access_token)})")
            else:
                print("access_token: MISSING from response")
                debug_fields = {k: str(v)[:50] for k, v in token_data.items()}
                return jsonify({
                    "error": "Asana returned no access_token.",
                    "response_fields": debug_fields
                }), 400
            refresh_token = token_data.get("refresh_token")
            if access_token.startswith("mock_"):
                return jsonify({"error": "Mock token detected. Real Asana OAuth did not complete."}), 400
            is_valid, user_info = validate_asana_token(access_token)
            if not is_valid:
                print(f"Asana token REJECTED by API validation: {user_info}")
                return jsonify({"error": user_info}), 400
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
            from datetime import datetime, timedelta
            expires_in = token_data.get("expires_in", 3600)
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            connected_email = user_info.get("email") or user_info.get("name") or "Asana User"
            print(f"Asana OAuth success \u2014 gid: {user_info.get('gid')}, email: {connected_email}, workspaces: {workspace_count}")
        if provider == 'calendly':
            print("[OAUTH PATH] 'calendly' \u2192 real OAuth exchange")
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
            print(f"Calendly OAuth success \u2014 email: {connected_email}, uri: {user_uri}")
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
            print(f"Linear OAuth success \u2014 email: {connected_email}, id: {viewer.get('id')}")
        if provider == 'pipedrive':
            print("[OAUTH PATH] 'pipedrive' -> real OAuth exchange")
            if code.startswith("mock_code_"):
                return jsonify({"error": "Mock Pipedrive codes are disabled."}), 400
            client_id = os.getenv("PIPEDRIVE_CLIENT_ID")
            client_secret = os.getenv("PIPEDRIVE_CLIENT_SECRET")
            redirect_uri = os.getenv("PIPEDRIVE_REDIRECT_URI", "http://localhost:5173/settings?callback=pipedrive")
            if not client_id or not client_secret:
                return jsonify({"error": "Set Pipedrive client ID and secret before connecting Pipedrive live."}), 400
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
        if provider == 'google':
            UserIntegration.query.filter(
                UserIntegration.user_id == current_user_id,
                UserIntegration.provider.in_(['gmail', 'google_calendar', 'google_docs', 'google_analytics'])
            ).delete(synchronize_session=False)
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
