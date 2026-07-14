from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
import services.linear_service as linear_service

linear_bp = Blueprint("linear_bp", __name__)


def try_refresh_linear(integration):
    if integration and integration.refresh_token:
        from services.briefing import refresh_linear_token
        return refresh_linear_token(integration)
    return False


@linear_bp.route("/linear/issues", methods=["GET"])
@token_required
def get_linear_issues(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="linear"
    ).first()

    if not integration:
        return jsonify({"error": "Linear not connected"}), 400

    token = integration.access_token

    try:
        issues = linear_service.get_linear_issues(token, limit=50)
        return jsonify(issues)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            if try_refresh_linear(integration):
                try:
                    issues = linear_service.get_linear_issues(integration.access_token, limit=50)
                    return jsonify(issues)
                except:
                    pass
            return jsonify({"error": "Linear authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502
