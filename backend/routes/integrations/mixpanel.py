from flask import request, jsonify
from config.database import db
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from utils.mock_mode import user_in_mock_mode
from routes.integrations.main import integrations_bp


@integrations_bp.route('/integrations/connect/mixpanel', methods=['POST'])
@token_required
def connect_mixpanel(current_user_id):
    data = request.get_json(silent=True) or {}
    token = data.get('token')
    connected_email = data.get('connected_email', 'Mixpanel User')
    if not token:
        return jsonify({"error": "Mixpanel project token is required"}), 400
    if token.startswith("mock_") and not user_in_mock_mode(current_user_id):
        return jsonify({"error": "Mock tokens are disabled. Provide a real Mixpanel token."}), 400
    from services.mixpanel_service import validate_mixpanel_token
    is_mock_ok = token.startswith("mock_")
    is_valid, msg = (True, None) if is_mock_ok else validate_mixpanel_token(token)
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
    if not token.startswith("mock_"):
        capture_event(token, "foundesk_integration_connected", current_user_id, {
            "provider": "mixpanel",
            "email": connected_email
        })
    return jsonify({"message": "Mixpanel connected successfully", "email": connected_email})
