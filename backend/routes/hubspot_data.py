from flask import Blueprint, jsonify
from utils.auth import token_required
from models.user_integration import UserIntegration
from services.hubspot_service import get_contacts, get_deals, get_companies

hubspot_bp = Blueprint("hubspot_bp", __name__)


@hubspot_bp.route("/hubspot/summary", methods=["GET"])
@token_required
def hubspot_summary(current_user_id):
    integration = UserIntegration.query.filter_by(
        user_id=current_user_id,
        provider="hubspot"
    ).first()

    if not integration:
        return jsonify({"error": "HubSpot not connected"}), 400

    try:
        contacts_data = get_contacts(integration.access_token, limit=5)
        deals_data = get_deals(integration.access_token, limit=5)
        companies_data = get_companies(integration.access_token, limit=5)
    except Exception as e:
        return jsonify({"error": f"HubSpot API error: {str(e)}"}), 502

    contacts = contacts_data.get("results", [])
    deals = deals_data.get("results", [])
    companies = companies_data.get("results", [])

    return jsonify({
        "contacts_count": len(contacts),
        "deals_count": len(deals),
        "companies_count": len(companies),
        "contacts": [{"id": c.get("id"), "name": (c.get("properties") or {}).get("firstname", "") + " " + (c.get("properties") or {}).get("lastname", ""), "email": (c.get("properties") or {}).get("email", "")} for c in contacts],
        "deals": [{"id": d.get("id"), "name": (d.get("properties") or {}).get("dealname", ""), "amount": (d.get("properties") or {}).get("amount", ""), "stage": (d.get("properties") or {}).get("dealstage", "")} for d in deals],
        "companies": [{"id": co.get("id"), "name": (co.get("properties") or {}).get("name", ""), "domain": (co.get("properties") or {}).get("domain", "")} for co in companies]
    })
