from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
from services.pipedrive_service import get_deals

pipedrive_bp = Blueprint("pipedrive_bp", __name__)


@pipedrive_bp.route("/pipedrive/deals", methods=["GET"])
@token_required
def pipedrive_deals(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="pipedrive"
    ).first()

    if not integration:
        return jsonify({"error": "Pipedrive not connected"}), 400

    try:
        data = get_deals(integration.access_token, limit=50)
    except Exception as e:
        return jsonify({"error": f"Pipedrive API error: {str(e)}"}), 502

    deals = data.get("data", [])
    won = sum(1 for d in deals if d.get("status") == "won")
    total_value = sum(float(d.get("value", 0) or 0) for d in deals)

    return jsonify({
        "total_deals": len(deals),
        "won_deals": won,
        "total_value": total_value,
        "deals": [{
            "id": d.get("id"),
            "title": d.get("title"),
            "value": d.get("value"),
            "currency": d.get("currency"),
            "status": d.get("status"),
            "stage": d.get("stage_id"),
            "person_name": d.get("person_id", {}).get("name") if d.get("person_id") else None,
            "org_name": d.get("org_id", {}).get("name") if d.get("org_id") else None
        } for d in deals]
    })
