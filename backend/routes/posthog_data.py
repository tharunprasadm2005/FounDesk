from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent

posthog_bp = Blueprint("posthog_bp", __name__)


@posthog_bp.route("/posthog/events", methods=["GET"])
@token_required
def get_posthog_events(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="posthog"
    ).first()

    if not integration:
        return jsonify({"error": "PostHog not connected"}), 400

    from utils.workspace_auth import get_current_workspace_id
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400

    events = ActivityEvent.query.filter_by(
        workspace_id=workspace_id,
        provider="posthog"
    ).order_by(ActivityEvent.external_timestamp.desc()).limit(50).all()

    return jsonify([{
        "id": e.id,
        "event": e.title.replace("PostHog: ", ""),
        "distinct_id": e.actor,
        "timestamp": e.external_timestamp.isoformat() if e.external_timestamp else None,
        "properties": {"details": e.details}
    } for e in events])
