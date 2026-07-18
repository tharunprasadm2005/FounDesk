import jwt
import os
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
            else:
                token = auth_header

        if not token:
            return jsonify({"error": "Token is missing"}), 401

        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
            token_ver = data.get('ver', 0)
            from config.database import db
            from models.user import User
            user = db.session.get(User, current_user_id) if hasattr(db.session, 'get') else User.query.get(current_user_id)
            if not user:
                return jsonify({"error": "User does not exist or has been deleted"}), 401
            if user.token_version != token_ver:
                return jsonify({"error": "Token has been revoked. Please login again."}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please refresh."}), 401
        except Exception as e:
            return jsonify({"error": "Invalid token"}), 401

        billing_enabled = os.environ.get("BILLING_ENFORCEMENT_ENABLED", "false").lower() == "true"
        if billing_enabled:
            path = request.path
            exempt = any(path.startswith(p) for p in BILLING_EXEMPT_PREFIXES)
            if not exempt:
                from config.database import db
                from models.workspace_member import WorkspaceMember
                from models.workspace import Workspace
                member = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").first()
                if member:
                    ws = Workspace.query.get(member.workspace_id)
                    if ws:
                        trial_days = int(os.environ.get("BILLING_TRIAL_DAYS", "14"))
                        trial_end = ws.trial_ends_at or (ws.created_at + timedelta(days=trial_days))
                        is_trial_expired = (
                            ws.subscription_status == "trial"
                            and trial_end
                            and trial_end < datetime.utcnow()
                        )
                        if ws.subscription_status == "cancelled" or is_trial_expired:
                            return jsonify({
                                "error": "Subscription required",
                                "code": "billing_required",
                                "message": "Your trial has ended or subscription is cancelled. Please visit /billing to resubscribe.",
                            }), 402

        return f(current_user_id, *args, **kwargs)

    return decorated


BILLING_EXEMPT_PREFIXES = [
    "/api/billing/webhook", "/api/billing/config", "/api/billing/plan",
    "/api/billing/create-order", "/api/billing/verify",
    "/api/auth/", "/api/users/me", "/api/workspaces",
]
