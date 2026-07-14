from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
import services.calendly_service as calendly_service

calendly_bp = Blueprint("calendly_bp", __name__)


def try_refresh_calendly(integration):
    if integration and integration.refresh_token:
        from services.briefing import refresh_calendly_token
        return refresh_calendly_token(integration)
    return False


@calendly_bp.route("/calendly/profile", methods=["GET"])
@token_required
def get_calendly_profile(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="calendly"
    ).first()

    if not integration:
        return jsonify({"error": "Calendly not connected"}), 400

    token = integration.access_token

    try:
        profile = calendly_service.get_calendly_user_me(token)
        return jsonify(profile)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            if try_refresh_calendly(integration):
                try:
                    profile = calendly_service.get_calendly_user_me(integration.access_token)
                    return jsonify(profile)
                except:
                    pass
            return jsonify({"error": "Calendly authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502


@calendly_bp.route("/calendly/events", methods=["GET"])
@token_required
def get_calendly_events(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="calendly"
    ).first()

    if not integration:
        return jsonify({"error": "Calendly not connected"}), 400

    token = integration.access_token

    try:
        profile = calendly_service.get_calendly_user_me(token)
        user_uri = profile.get("uri", "")
        if not user_uri:
            return jsonify({"error": "Could not determine Calendly user URI"}), 502
        events = calendly_service.get_calendly_events(token, user_uri)
        return jsonify(events)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            if try_refresh_calendly(integration):
                try:
                    profile = calendly_service.get_calendly_user_me(integration.access_token)
                    user_uri = profile.get("uri", "")
                    if user_uri:
                        events = calendly_service.get_calendly_events(integration.access_token, user_uri)
                        return jsonify(events)
                except:
                    pass
            return jsonify({"error": "Calendly authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502
