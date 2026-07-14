from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
import services.asana_service as asana_service

asana_bp = Blueprint("asana_bp", __name__)


def try_refresh_asana(integration):
    if integration and integration.refresh_token:
        from services.briefing import refresh_asana_token
        return refresh_asana_token(integration)
    return False


@asana_bp.route("/asana/profile", methods=["GET"])
@token_required
def get_asana_profile(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="asana"
    ).first()

    if not integration:
        return jsonify({"error": "Asana not connected"}), 400

    token = integration.access_token

    try:
        profile = asana_service.get_asana_user_me(token)
        return jsonify(profile)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            if try_refresh_asana(integration):
                try:
                    profile = asana_service.get_asana_user_me(integration.access_token)
                    return jsonify(profile)
                except:
                    pass
            return jsonify({"error": "Asana authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502


@asana_bp.route("/asana/workspaces", methods=["GET"])
@token_required
def get_asana_workspaces(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="asana"
    ).first()

    if not integration:
        return jsonify({"error": "Asana not connected"}), 400

    token = integration.access_token

    try:
        workspaces = asana_service.get_asana_workspaces(token)
        return jsonify(workspaces)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            if try_refresh_asana(integration):
                try:
                    workspaces = asana_service.get_asana_workspaces(integration.access_token)
                    return jsonify(workspaces)
                except:
                    pass
            return jsonify({"error": "Asana authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502


@asana_bp.route("/asana/projects/<workspace_gid>", methods=["GET"])
@token_required
def get_asana_projects(current_user_id, workspace_gid):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="asana"
    ).first()

    if not integration:
        return jsonify({"error": "Asana not connected"}), 400

    token = integration.access_token

    try:
        projects = asana_service.get_asana_projects(token, workspace_gid)
        return jsonify(projects)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            if try_refresh_asana(integration):
                try:
                    projects = asana_service.get_asana_projects(integration.access_token, workspace_gid)
                    return jsonify(projects)
                except:
                    pass
            return jsonify({"error": "Asana authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502
