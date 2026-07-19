from flask import request, jsonify
from config.database import db
from models.user_integration import UserIntegration
from utils.auth import token_required
from routes.integrations.main import integrations_bp


@integrations_bp.route('/integrations/google-analytics', methods=['GET'])
@token_required
def get_google_analytics_config(current_user_id):
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='google_analytics').first()
    if not integration:
        return jsonify({"property_id": ""}), 200
    return jsonify({"property_id": integration.property_id or ""}), 200


@integrations_bp.route('/integrations/google-analytics', methods=['POST'])
@token_required
def save_google_analytics_config(current_user_id):
    data = request.get_json() or {}
    property_id = data.get('property_id')
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider='google_analytics').first()
    if not integration:
        integration = UserIntegration(
            user_id=current_user_id,
            provider='google_analytics',
            access_token='ga_config_placeholder',
            property_id=property_id
        )
        db.session.add(integration)
    else:
        integration.property_id = property_id
    db.session.commit()
    return jsonify({"message": "Google Analytics configuration saved successfully", "property_id": property_id}), 200
