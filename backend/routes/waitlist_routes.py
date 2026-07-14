from flask import Blueprint, request, jsonify
from config.database import db
from models.waitlist import Waitlist
from datetime import datetime

waitlist_bp = Blueprint("waitlist_bp", __name__)

@waitlist_bp.route("/waitlist", methods=["POST"])
def add_to_waitlist():
    data = request.get_json() or {}
    email = data.get("email")
    source = data.get("source", "landing_page")
    created_at_str = data.get("created_at")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    email = email.strip().lower()

    # Basic email format check
    if "@" not in email or "." not in email or len(email) < 5:
        return jsonify({"error": "Please enter a valid email address."}), 400

    # Check if duplicate exists
    try:
        existing = Waitlist.query.filter_by(email=email).first()
        if existing:
            return jsonify({"error": "This email is already registered on the waitlist."}), 400
    except Exception as e:
        return jsonify({"error": f"Database check failed: {str(e)}"}), 500

    # Parse created_at safely
    created_at = None
    if created_at_str:
        try:
            cleaned = created_at_str.replace("Z", "+00:00")
            created_at = datetime.fromisoformat(cleaned)
        except Exception:
            created_at = datetime.utcnow()
    else:
        created_at = datetime.utcnow()

    try:
        new_entry = Waitlist(
            email=email,
            source=source,
            created_at=created_at
        )
        db.session.add(new_entry)
        db.session.commit()
        return jsonify({
            "message": "Successfully added to waitlist",
            "email": email
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save waitlist entry: {str(e)}"}), 500
