from flask import Blueprint, jsonify, request
from config.database import db
from utils.auth import token_required
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from utils.mock_mode import mock_visibility_clause

amplitude_bp = Blueprint("amplitude_bp", __name__)


@amplitude_bp.route("/amplitude/config", methods=["GET"])
@token_required
def get_amplitude_config(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="amplitude"
    ).first()

    if not integration:
        return jsonify({"connected": False}), 200

    return jsonify({
        "connected": True,
        "api_key": integration.access_token,
        "email": integration.connected_email
    })


@amplitude_bp.route("/amplitude/events", methods=["GET"])
@token_required
def get_amplitude_events(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="amplitude"
    ).first()

    if not integration:
        return jsonify({"error": "Amplitude not connected"}), 400

    from utils.workspace_auth import get_current_workspace_id
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400

    events = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider == "amplitude",
        mock_visibility_clause(workspace_id)
    ).order_by(ActivityEvent.external_timestamp.desc()).limit(50).all()

    return jsonify([{
        "id": e.id,
        "event": e.title.replace("Amplitude: ", ""),
        "user_id": e.actor,
        "timestamp": e.external_timestamp.isoformat() if e.external_timestamp else None,
        "properties": {"details": e.details}
    } for e in events])


@amplitude_bp.route("/amplitude/track", methods=["POST"])
@token_required
def track_amplitude_event(current_user_id):
    data = request.get_json(silent=True) or {}
    event = data.get("event")
    properties = data.get("properties", {})

    if not event:
        return jsonify({"error": "event name is required"}), 400

    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="amplitude"
    ).first()

    if not integration:
        return jsonify({"error": "Amplitude not connected"}), 400

    from utils.workspace_auth import get_current_workspace_id
    workspace_id = get_current_workspace_id(current_user_id)

    mirror_event = ActivityEvent(
        workspace_id=workspace_id,
        provider="amplitude",
        category="analytics",
        actor=integration.connected_email or "unknown",
        title=f"Amplitude: {event}",
        activity_type="analytics",
        status="tracked",
        external_timestamp=__import__("datetime").datetime.utcnow(),
        details=f"Event: {event} | Properties: {properties}",
        raw_ref=f"amplitude_{event}_{__import__('time').time()}",
        is_mock=False
    )
    db.session.add(mirror_event)

    from services.amplitude_service import capture_event
    capture_event(
        integration.access_token,
        event,
        current_user_id,
        {**properties, "email": integration.connected_email}
    )

    db.session.commit()
    return jsonify({"status": "tracked"}), 200
