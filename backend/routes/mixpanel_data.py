from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent

mixpanel_bp = Blueprint("mixpanel_bp", __name__)


@mixpanel_bp.route("/mixpanel/events", methods=["GET"])
@token_required
def get_mixpanel_events(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="mixpanel"
    ).first()

    if not integration:
        return jsonify({"error": "Mixpanel not connected"}), 400

    from utils.workspace_auth import get_current_workspace_id
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400

    events = ActivityEvent.query.filter_by(
        workspace_id=workspace_id,
        provider="mixpanel"
    ).order_by(ActivityEvent.external_timestamp.desc()).limit(50).all()

    return jsonify([{
        "id": e.id,
        "event": e.title.replace("Mixpanel: ", ""),
        "distinct_id": e.actor,
        "timestamp": e.external_timestamp.isoformat() if e.external_timestamp else None,
        "properties": {"details": e.details}
    } for e in events])
