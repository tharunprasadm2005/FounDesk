from flask import request, jsonify
from config.database import db
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from utils.mock_mode import user_in_mock_mode
from routes.integrations.main import integrations_bp


@integrations_bp.route('/integrations/connect/hubspot', methods=['POST'])
@token_required
def connect_hubspot(current_user_id):
    data = request.get_json(silent=True) or {}
    token = data.get('token')
    connected_email = data.get('connected_email', 'HubSpot User')
    if not token:
        return jsonify({"error": "HubSpot API key is required"}), 400
    if token.startswith("mock_") and not user_in_mock_mode(current_user_id):
        return jsonify({"error": "Mock tokens are disabled. Provide a real HubSpot API key."}), 400
    if not token.startswith("mock_"):
        from services.hubspot_service import validate_hubspot_token, get_contacts
        is_valid, msg = validate_hubspot_token(token)
        if not is_valid:
            return jsonify({"error": msg}), 400
        try:
            get_contacts(token, limit=1)
        except Exception:
            return jsonify({"error": "Invalid HubSpot API key. Could not fetch contacts. Check your key at: HubSpot \u2192 Settings \u2192 Integrations \u2192 Private Apps."}), 400
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
