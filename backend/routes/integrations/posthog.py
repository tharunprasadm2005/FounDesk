from flask import request, jsonify
from config.database import db
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from routes.integrations.main import integrations_bp


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
