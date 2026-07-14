from flask import Blueprint, jsonify
import os
import sys
from utils.auth import token_required
from models.user_integration import UserIntegration
import services.google_docs_service as google_docs_service

google_docs_bp = Blueprint("google_docs_bp", __name__)

def is_mock_token(token):
    # Enable mock sandbox mode for test runs or demo mode
    return token.startswith("mock_") and (
        os.getenv("APP_MODE") == "demo" or 
        "test" in sys.argv[0] or 
        "pytest" in sys.modules
    )

@google_docs_bp.route("/google-docs/recent", methods=["GET"])
@token_required
def get_recent_docs(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="google"
    ).first()

    if not integration:
        return jsonify({"error": "Google account not connected"}), 400

    token = integration.access_token

    if is_mock_token(token):
        return jsonify({"documents": []})

    try:
        docs = google_docs_service.get_recent_documents(token)
        return jsonify({"documents": docs})
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            return jsonify({"error": "Google authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502

@google_docs_bp.route("/google-docs/document/<document_id>", methods=["GET"])
@token_required
def get_doc_content(current_user_id, document_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="google"
    ).first()

    if not integration:
        return jsonify({"error": "Google account not connected"}), 400

    token = integration.access_token

    if is_mock_token(token):
        return jsonify({"content": ""})

    try:
        doc = google_docs_service.get_document(document_id, token)
        return jsonify(doc)
    except Exception as e:
        err_msg = str(e)
        if "401" in err_msg:
            return jsonify({"error": "Google authorization expired. Please reconnect.", "needs_reconnect": True}), 401
        return jsonify({"error": err_msg}), 502
