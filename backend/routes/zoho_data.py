from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
from services.zoho_service import get_deals, get_contacts, get_leads

zoho_bp = Blueprint("zoho_bp", __name__)


@zoho_bp.route("/zoho/summary", methods=["GET"])
@token_required
def zoho_summary(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="zoho_crm"
    ).first()

    if not integration:
        return jsonify({"error": "Zoho CRM not connected"}), 400

    try:
        deals_data = get_deals(integration.access_token, limit=50)
        contacts_data = get_contacts(integration.access_token, limit=10)
        leads_data = get_leads(integration.access_token, limit=10)
    except Exception as e:
        return jsonify({"error": f"Zoho API error: {str(e)}"}), 502

    deals = deals_data.get("data", [])
    contacts = contacts_data.get("data", [])
    leads = leads_data.get("data", [])

    won = sum(1 for d in deals if d.get("Stage", "").lower() == "closed won")
    total_value = sum(float(d.get("Amount", 0) or 0) for d in deals)

    return jsonify({
        "deals_count": len(deals),
        "won_deals": won,
        "total_value": total_value,
        "contacts_count": len(contacts),
        "leads_count": len(leads),
        "deals": [{
            "id": d.get("id"),
            "title": d.get("Deal_Name"),
            "amount": d.get("Amount"),
            "stage": d.get("Stage"),
            "account": d.get("Account_Name")
        } for d in deals[:10]],
        "contacts": [{
            "id": c.get("id"),
            "name": c.get("Full_Name"),
            "email": c.get("Email")
        } for c in contacts],
        "leads": [{
            "id": l.get("id"),
            "name": l.get("Full_Name"),
            "company": l.get("Company")
        } for l in leads]
    })
