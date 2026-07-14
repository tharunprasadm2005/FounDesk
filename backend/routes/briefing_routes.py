from flask import Blueprint, jsonify
from services.briefing import compile_morning_briefing
from utils.auth import token_required

briefing_bp = Blueprint('briefing', __name__)

@briefing_bp.route('/briefing', methods=['GET'])
@token_required
def get_briefing(current_user_id):
    try:
        data = compile_morning_briefing(current_user_id)
        return jsonify(data), 200
    except Exception as e:
        print("Error compiling morning briefing:", e)
        return jsonify({"error": "Failed to compile morning briefing"}), 500
