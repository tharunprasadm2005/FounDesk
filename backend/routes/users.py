import os
from flask import Blueprint, request, jsonify
from config.database import db
from utils.auth import token_required
from models.user import User
from models.workspace_member import WorkspaceMember
from models.user_integration import UserIntegration
from models.goal import Goal
from models.task import Task
from models.blocker import Blocker
from models.api_key import ApiKey
from models.workspace import Workspace
from models.refresh_token import RefreshToken
from models.email_notification import EmailNotification
from utils.email import send_email
from datetime import datetime, timedelta
import json, base64, hashlib, secrets

users_bp = Blueprint('users', __name__)


@users_bp.route('/users/me', methods=['GET'])
@token_required
def get_user_profile(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id).all()
    active_memberships = [m for m in memberships if m.status == "active"]
    workspace_ids = [m.workspace_id for m in active_memberships]
    pending_invites = [m for m in memberships if m.status == "pending"]

    integration_count = UserIntegration.query.filter_by(user_id=current_user_id).count()
    all_integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    goal_count = task_count = blocker_count = 0
    if workspace_ids:
        goal_count = Goal.query.filter(Goal.workspace_id.in_(workspace_ids)).count()
        task_count = Task.query.filter(Task.workspace_id.in_(workspace_ids)).count()
        blocker_count = Blocker.query.filter(Blocker.workspace_id.in_(workspace_ids)).count()

    ws_list = []
    for m in active_memberships:
        ws = m.workspace
        if ws:
            ws_list.append({"id": ws.id, "name": ws.name, "stage": ws.stage, "role": m.role, "active_phase": ws.active_phase, "plan": ws.plan or "starter"})

    # Determine plan from real workspace subscription data (no heuristic fabrication)
    plan_rank = {"free": 0, "starter": 1, "pro": 2, "enterprise": 3}
    plan = "free"
    for w in ws_list:
        ws_plan = str(w.get("plan") or "free").lower()
        if plan_rank.get(ws_plan, 0) > plan_rank.get(plan, 0):
            plan = ws_plan

    # Derive last login from the most recent real session token
    last_login = None
    most_recent_session = RefreshToken.query.filter_by(user_id=current_user_id).order_by(
        RefreshToken.last_used_at.desc().nullslast(),
        RefreshToken.created_at.desc()
    ).first()
    if most_recent_session:
        last_login = most_recent_session.last_used_at or most_recent_session.created_at
    elif active_memberships:
        last_login = max(m.created_at for m in active_memberships)

    google_integration = UserIntegration.query.filter_by(user_id=current_user_id, provider="google").first()
    connected_providers = {}
    for integ in all_integrations:
        connected_providers[integ.provider] = {"connected": True, "email": integ.connected_email, "connected_at": integ.created_at.isoformat() if integ.created_at else None}

    # Real session data from unrevoked refresh tokens (matches /users/me/sessions shape)
    session_tokens = RefreshToken.query.filter_by(user_id=current_user_id, revoked=False).order_by(RefreshToken.created_at.desc()).limit(20).all()
    sessions = []
    for t in session_tokens:
        sessions.append({
            "id": t.id,
            "device": t.user_agent or "Unknown",
            "ip_address": t.ip_address or "",
            "last_active_at": t.last_used_at.isoformat() if t.last_used_at else t.created_at.isoformat() if t.created_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    return jsonify({
        **user.to_dict(),
        "last_login": last_login.isoformat() + "Z" if last_login else None,
        "has_password": user.password_hash is not None,
        "google_connected": google_integration is not None,
        "google_email": google_integration.connected_email if google_integration else None,
        "connected_providers": connected_providers,
        "workspaces": ws_list,
        "workspace_count": len(ws_list),
        "integration_count": integration_count,
        "goal_count": goal_count,
        "task_count": task_count,
        "blocker_count": blocker_count,
        "pending_invites_count": len(pending_invites),
        "plan_name": plan.capitalize(),
        "sessions": sessions
    })


@users_bp.route('/users/me', methods=['PUT'])
@token_required
def update_user_profile(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    allowed = ["name", "email", "timezone", "locale", "theme", "date_format", "week_start_day", "avatar_url"]

    if 'email' in data and data['email'] != user.email:
        existing = User.query.filter_by(email=data['email']).first()
        if existing:
            return jsonify({"error": "Email already in use"}), 400

    for field in allowed:
        if field in data:
            setattr(user, field, data[field])

    db.session.commit()
    return jsonify({**user.to_dict(), "message": "Profile updated"})


@users_bp.route('/users/me', methods=['DELETE'])
@token_required
def delete_account(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    data = request.get_json(silent=True) or {}
    if not data.get('confirm'):
        return jsonify({"error": "Must confirm account deletion"}), 400
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Account permanently deleted"})


# ─── Password ─────────────────────────────────

@users_bp.route('/users/me/password', methods=['PUT'])
@token_required
def change_password(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    data = request.get_json(silent=True) or {}
    current_pw = data.get("current_password", "")
    new_pw = data.get("new_password", "")
    if len(new_pw) < 12:
        return jsonify({"error": "Password must be at least 12 characters"}), 400
    import re
    if not re.search(r'[A-Z]', new_pw):
        return jsonify({"error": "Password must contain an uppercase letter"}), 400
    if not re.search(r'[a-z]', new_pw):
        return jsonify({"error": "Password must contain a lowercase letter"}), 400
    if not re.search(r'[0-9]', new_pw):
        return jsonify({"error": "Password must contain a digit"}), 400
    if not re.search(r'[^a-zA-Z0-9]', new_pw):
        return jsonify({"error": "Password must contain a special character"}), 400
    if not user.password_hash:
        return jsonify({"error": "Set up a password by using the forgot-password flow"}), 400
    if not user.check_password(current_pw):
        return jsonify({"error": "Current password is incorrect"}), 400
    user.set_password(new_pw)
    db.session.commit()
    return jsonify({"message": "Password updated"})


# ─── 2FA ──────────────────────────────────────

@users_bp.route('/users/me/2fa/generate', methods=['POST'])
@token_required
def generate_2fa(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    secret = base64.b32encode(secrets.token_bytes(10)).decode()
    user.totp_secret = secret
    db.session.commit()
    return jsonify({"message": "2FA secret generated. Use /users/me/2fa/verify to activate."})


@users_bp.route('/users/me/2fa/verify', methods=['POST'])
@token_required
def verify_2fa(current_user_id):
    user = User.query.get(current_user_id)
    if not user or not user.totp_secret:
        return jsonify({"error": "2FA not initialized"}), 400
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    if not code:
        return jsonify({"error": "Code is required"}), 400
    import hmac
    key = base64.b32decode(user.totp_secret)
    for offset in [-1, 0, 1]:
        time_counter = int(datetime.utcnow().timestamp()) // 30 + offset
        msg = time_counter.to_bytes(8, "big")
        h = hmac.new(key, msg, "sha1").digest()
        offset_val = h[-1] & 0x0F
        truncated = int.from_bytes(h[offset_val:offset_val + 4], "big") & 0x7FFFFFFF
        expected = str(truncated % 1000000).zfill(6)
        if hmac.compare_digest(code, expected):
            user.totp_enabled = True
            db.session.commit()
            return jsonify({"message": "2FA enabled", "totp_enabled": True})
    return jsonify({"error": "Invalid code"}), 400


@users_bp.route('/users/me/2fa/disable', methods=['POST'])
@token_required
def disable_2fa(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    user.totp_secret = None
    user.totp_enabled = False
    db.session.commit()
    return jsonify({"message": "2FA disabled", "totp_enabled": False})


@users_bp.route('/users/me/2fa/recovery-codes', methods=['GET'])
@token_required
def get_recovery_codes(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not user.totp_enabled:
        return jsonify({"error": "2FA is not enabled"}), 400
    codes = [secrets.token_hex(5) for _ in range(10)]
    import bcrypt
    hashed_codes = [bcrypt.hashpw(c.encode(), bcrypt.gensalt()).decode() for c in codes]
    user.recovery_codes = json.dumps(hashed_codes)
    db.session.commit()
    return jsonify({"recovery_codes": codes, "message": "These codes will not be shown again."})


@users_bp.route('/users/me/2fa/verify-recovery', methods=['POST'])
@token_required
def verify_recovery_code(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not user.totp_enabled:
        return jsonify({"error": "2FA is not enabled"}), 400
    data = request.get_json(silent=True) or {}
    code = data.get("code", "")
    if not code:
        return jsonify({"error": "Code is required"}), 400
    import bcrypt
    stored_codes = json.loads(user.recovery_codes) if user.recovery_codes else []
    for i, hashed in enumerate(stored_codes):
        if bcrypt.checkpw(code.encode(), hashed.encode()):
            stored_codes.pop(i)
            user.recovery_codes = json.dumps(stored_codes) if stored_codes else None
            db.session.commit()
            return jsonify({"message": "Recovery code valid", "valid": True})
    return jsonify({"error": "Invalid recovery code", "valid": False}), 400


@users_bp.route('/users/me/avatar', methods=['POST'])
@token_required
def upload_avatar(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if 'avatar' not in request.files:
        return jsonify({"error": "No avatar file provided"}), 400
    file = request.files['avatar']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    ALLOWED_TYPES = {'image/png', 'image/jpeg', 'image/gif', 'image/webp'}
    if file.content_type not in ALLOWED_TYPES:
        return jsonify({"error": f"Invalid file type. Allowed: {', '.join(ALLOWED_TYPES)}"}), 400
    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > 5 * 1024 * 1024:
        return jsonify({"error": "File too large. Maximum size is 5MB."}), 400
    static_dir = os.getenv("STATIC_DIR", "")
    if static_dir and os.path.isdir(static_dir):
        import uuid
        ext = file.filename.rsplit('.', 1)[-1] if '.' in file.filename else 'png'
        filename = f"avatar_{current_user_id}_{uuid.uuid4().hex[:8]}.{ext}"
        filepath = os.path.join(static_dir, filename)
        file.save(filepath)
        user.avatar_url = f"/static/{filename}"
    else:
        import base64
        data = file.read()
        b64 = base64.b64encode(data).decode()
        user.avatar_url = f"data:{file.content_type or 'image/png'};base64,{b64}"
    user.avatar_updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({"avatar_url": user.avatar_url, "message": "Avatar updated"})


# ─── Sessions ─────────────────────────────────

@users_bp.route('/users/me/sessions', methods=['GET'])
@token_required
def get_sessions(current_user_id):
    tokens = RefreshToken.query.filter_by(user_id=current_user_id, revoked=False).order_by(RefreshToken.created_at.desc()).limit(20).all()
    sessions = []
    for t in tokens:
        sessions.append({
            "id": t.id,
            "device": t.user_agent or "Unknown",
            "ip_address": t.ip_address or request.remote_addr or "",
            "last_active_at": t.last_used_at.isoformat() if t.last_used_at else t.created_at.isoformat() if t.created_at else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return jsonify({"sessions": sessions})


@users_bp.route('/users/me/sessions/<int:session_id>', methods=['DELETE'])
@token_required
def revoke_session(current_user_id, session_id):
    import traceback
    try:
        token = RefreshToken.query.filter_by(id=session_id, user_id=current_user_id).first()
        if not token:
            return jsonify({"error": "Session not found"}), 404
        token.revoked = True
        db.session.commit()
        return jsonify({"message": "Session revoked"})
    except Exception as e:
        print(f"DELETE /users/me/sessions/{session_id} error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to revoke session", "message": str(e)}), 500


# ─── Connected Accounts ───────────────────────

@users_bp.route('/users/me/connected-accounts', methods=['GET'])
@token_required
def get_connected_accounts(current_user_id):
    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    return jsonify({
        "accounts": [
            {"provider": i.provider, "email": i.connected_email,
             "connected_at": i.created_at.isoformat() + "Z" if i.created_at else None}
            for i in integrations
        ]
    })


@users_bp.route('/users/me/connected-accounts/<provider>', methods=['DELETE'])
@token_required
def disconnect_account(current_user_id, provider):
    integration = UserIntegration.query.filter_by(user_id=current_user_id, provider=provider).first()
    if not integration:
        return jsonify({"error": "Account not connected"}), 404
    db.session.delete(integration)
    db.session.commit()
    return jsonify({"message": f"{provider} account disconnected"})


# ─── Export ───────────────────────────────────

@users_bp.route('/users/me/export', methods=['GET'])
@token_required
def export_user_data(current_user_id):
    fmt = request.args.get("format", "json")
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id).all()
    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    api_keys = ApiKey.query.filter_by(user_id=current_user_id).all()

    data = {
        "user": user.to_dict(),
        "workspace_memberships": [m.to_dict() for m in memberships],
        "integrations": [i.to_dict() for i in integrations],
        "api_keys": [k.to_dict() for k in api_keys],
        "exported_at": datetime.utcnow().isoformat() + "Z"
    }

    if fmt == "csv":
        lines = ["section,key,value"]
        def flatten(prefix, d):
            for k, v in d.items():
                lines.append(f"{prefix},{k},{v}" if not isinstance(v, dict) else None)
                if isinstance(v, dict):
                    flatten(f"{prefix}.{k}", v)
                elif isinstance(v, list):
                    for item in v:
                        if isinstance(item, dict):
                            flatten(f"{prefix}.{k}", item)
        flatten("user", data["user"])
        return jsonify({"csv": "\n".join(lines)})

    return jsonify(data)
