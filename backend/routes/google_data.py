from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
from services.google_service import get_calendar_events, get_gmail_messages

google_bp = Blueprint("google_bp", __name__)

@google_bp.route("/google/data", methods=["GET"])
@token_required
def get_google_data(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="google"
    ).first()

    if not integration:
        return jsonify({"error": "Google not connected"}), 400

    access_token = integration.access_token

    calendar = get_calendar_events(access_token)
    gmail = get_gmail_messages(access_token)

    return jsonify({
        "calendar": calendar,
        "gmail": gmail
    })