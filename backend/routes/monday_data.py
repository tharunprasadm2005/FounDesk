from flask import Blueprint, jsonify
import os
import sys
from utils.auth import token_required
from models.user_integration import UserIntegration
import services.monday_service as monday_service

monday_bp = Blueprint("monday_bp", __name__)

def is_mock_token(token):
    # Enable mock sandbox mode for test runs or demo mode
    return token.startswith("mock_") and (
        os.getenv("APP_MODE") == "demo" or 
        "test" in sys.argv[0] or 
        "pytest" in sys.modules
    )

@monday_bp.route("/monday/profile", methods=["GET"])
@token_required
def get_monday_profile(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="monday"
    ).first()

    if not integration:
        return jsonify({"error": "Monday.com not connected"}), 400

    token = integration.access_token

    if is_mock_token(token):
        return jsonify({})

    try:
        profile = monday_service.get_profile(token)
        return jsonify(profile)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            return jsonify({"error": "Monday.com authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502

@monday_bp.route("/monday/boards", methods=["GET"])
@token_required
def get_monday_boards(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="monday"
    ).first()

    if not integration:
        return jsonify({"error": "Monday.com not connected"}), 400

    token = integration.access_token

    if is_mock_token(token):
        return jsonify([])

    try:
        boards = monday_service.get_boards(token)
        return jsonify(boards)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            return jsonify({"error": "Monday.com authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502

@monday_bp.route("/monday/items", methods=["GET"])
@token_required
def get_monday_items(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="monday"
    ).first()

    if not integration:
        return jsonify({"error": "Monday.com not connected"}), 400

    token = integration.access_token

    if is_mock_token(token):
        return jsonify([])

    try:
        items = monday_service.get_items(token)
        return jsonify(items)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            return jsonify({"error": "Monday.com authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502

@monday_bp.route("/monday/updates", methods=["GET"])
@token_required
def get_monday_updates(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="monday"
    ).first()

    if not integration:
        return jsonify({"error": "Monday.com not connected"}), 400

    token = integration.access_token

    if is_mock_token(token):
        return jsonify([])

    try:
        updates = monday_service.get_updates(token)
        return jsonify(updates)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            return jsonify({"error": "Monday.com authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502
