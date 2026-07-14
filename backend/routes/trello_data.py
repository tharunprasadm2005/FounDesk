from flask import Blueprint, jsonify, request
import os
from utils.auth import token_required
from models.user_integration import UserIntegration
import services.trello_service as trello_service
import datetime

trello_bp = Blueprint("trello_bp", __name__)

def get_trello_credentials(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="trello"
    ).first()
    
    if not integration:
        return None, None, None
        
    key = os.getenv("TRELLO_API_KEY")
    token = integration.access_token
    if token and token.startswith("{"):
        try:
            import json
            parsed = json.loads(token)
            key = parsed.get("api_key", key)
            token = parsed.get("api_token", token)
        except Exception:
            pass
    return key, token, integration

@trello_bp.route("/trello/me", methods=["GET"])
@token_required
def get_me(current_user_id):
    key, token, integration = get_trello_credentials(current_user_id)
    if not integration:
        return jsonify({"error": "Trello not connected"}), 400
        
    try:
        member = trello_service.get_trello_member(key, token)
        return jsonify(member)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@trello_bp.route("/trello/boards", methods=["GET"])
@token_required
def get_boards(current_user_id):
    key, token, integration = get_trello_credentials(current_user_id)
    if not integration:
        return jsonify({"error": "Trello not connected"}), 400
        
    try:
        boards = trello_service.get_trello_boards(key, token)
        return jsonify(boards)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@trello_bp.route("/trello/boards/<board_id>/lists", methods=["GET"])
@token_required
def get_lists(current_user_id, board_id):
    key, token, integration = get_trello_credentials(current_user_id)
    if not integration:
        return jsonify({"error": "Trello not connected"}), 400
        
    try:
        lists = trello_service.get_trello_lists(key, token, board_id)
        return jsonify(lists)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@trello_bp.route("/trello/boards/<board_id>/cards", methods=["GET"])
@token_required
def get_cards(current_user_id, board_id):
    key, token, integration = get_trello_credentials(current_user_id)
    if not integration:
        return jsonify({"error": "Trello not connected"}), 400
        
    try:
        cards = trello_service.get_trello_cards(key, token, board_id)
        return jsonify(cards)
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@trello_bp.route("/trello/summary", methods=["GET"])
@token_required
def get_summary(current_user_id):
    key, token, integration = get_trello_credentials(current_user_id)
    if not integration:
        return jsonify({"error": "Trello not connected"}), 400
        
    try:
        summary = trello_service.get_trello_summary(key, token)
        return jsonify(summary)
    except Exception as e:
        return jsonify({"error": str(e)}), 502
