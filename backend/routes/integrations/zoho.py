import os
import requests
from flask import request, jsonify, redirect
from config.database import db
from models.user_integration import UserIntegration
from utils.auth import token_required
from routes.integrations.main import integrations_bp


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
