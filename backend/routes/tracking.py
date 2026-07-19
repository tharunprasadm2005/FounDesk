from flask import Blueprint, jsonify, request
from config.database import db
from utils.auth import token_required
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent

tracking_bp = Blueprint("tracking_bp", __name__)

ANALYTICS_PROVIDERS = ("posthog", "mixpanel", "amplitude")


@tracking_bp.route("/track", methods=["POST"])
@token_required
def track_event(current_user_id):
    try:
        data = request.get_json(silent=True)
        if not data:
            return jsonify({"status": "skipped", "reason": "No JSON body"}), 200

        event = data.get("event")
        properties = data.get("properties", {})

        if not event:
            return jsonify({"error": "event name is required"}), 400

        from utils.workspace_auth import get_current_workspace_id
        workspace_id = get_current_workspace_id(current_user_id)
        if not workspace_id:
            return jsonify({"error": "No active workspace"}), 400

        integrations = UserIntegration.query.filter(
            UserIntegration.user_id == current_user_id,
            UserIntegration.provider.in_(ANALYTICS_PROVIDERS)
        ).all()

        if not integrations:
            return jsonify({"status": "skipped", "reason": "No analytics provider connected"}), 200

        from datetime import datetime
        import time as time_module

        for integration in integrations:
            provider = integration.provider
            token = integration.access_token
            actor = integration.connected_email or "unknown"

            try:
                mirror = ActivityEvent(
                    workspace_id=workspace_id,
                    provider=provider,
                    category="analytics",
                    actor=actor,
                    title=f"{provider.capitalize()}: {event}",
                    activity_type="analytics",
                    status="tracked",
                    external_timestamp=datetime.utcnow(),
                    details=f"Event: {event} | Properties: {properties}",
                    raw_ref=f"{provider}_{event}_{time_module.time()}",
                    is_mock=False
                )
                db.session.add(mirror)
            except Exception as e:
                print("Tracking: failed to create ActivityEvent mirror:", e)

            try:
                if provider == "posthog":
                    from services.posthog_service import capture_event as ph_capture
                    ph_capture(token, event, current_user_id, {**properties, "email": actor})
                elif provider == "mixpanel":
                    from services.mixpanel_service import capture_event as mp_capture
                    mp_capture(token, event, current_user_id, {**properties, "email": actor})
                elif provider == "amplitude":
                    from services.amplitude_service import capture_event as amp_capture
                    amp_capture(token, event, current_user_id, {**properties, "email": actor})
            except Exception as e:
                print(f"Tracking: analytics capture failed for {provider}: {e}")

        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print("Tracking: commit failed:", e)

        return jsonify({"status": "tracked", "providers": [i.provider for i in integrations]}), 200

    except Exception as e:
        print("Tracking: unexpected error:", e)
        return jsonify({"status": "error", "message": "Tracking failed"}), 200
