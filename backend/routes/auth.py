import os
import re
import secrets
import datetime
import jwt
from flask import Blueprint, request, jsonify, current_app
from config.database import db
from models.user import User
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.refresh_token import RefreshToken
from utils.email import send_email, send_welcome_email
from utils.rate_limit import limiter

auth_bp = Blueprint("auth", __name__)
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://foundesk.onrender.com")

_TOKEN_EXPIRY = 60  # 60 minutes for access tokens
_REFRESH_EXPIRY = 30  # 30 days for refresh tokens


def _generate_token_pair(user):
    now = datetime.datetime.utcnow()
    access_token = jwt.encode(
        {
            "user_id": user.id,
            "email": user.email,
            "ver": user.token_version,
            "exp": now + datetime.timedelta(minutes=_TOKEN_EXPIRY),
            "iat": now,
        },
        current_app.config["SECRET_KEY"],
        algorithm="HS256",
    )
    raw_refresh = RefreshToken.generate_token()
    refresh = RefreshToken(
        user_id=user.id,
        token_hash=RefreshToken.hash_token(raw_refresh),
        expires_at=now + datetime.timedelta(days=_REFRESH_EXPIRY),
        user_agent=request.headers.get("User-Agent", "")[:500] if request else "",
        ip_address=request.remote_addr or "",
    )
    db.session.add(refresh)
    db.session.commit()
    return access_token, raw_refresh, refresh.id


def _validate_password(password, prefix="Password"):
    if len(password) < 12:
        return f"{prefix} must be at least 12 characters"
    if not re.search(r'[A-Z]', password):
        return f"{prefix} must contain an uppercase letter"
    if not re.search(r'[a-z]', password):
        return f"{prefix} must contain a lowercase letter"
    if not re.search(r'[0-9]', password):
        return f"{prefix} must contain a digit"
    if not re.search(r'[^a-zA-Z0-9]', password):
        return f"{prefix} must contain a special character"
    return None


@auth_bp.route("/auth/signup", methods=["POST"])
@limiter.limit("5 per minute")
def signup():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    company = (data.get("company") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400
    pwd_err = _validate_password(password)
    if pwd_err:
        return jsonify({"error": pwd_err}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "If the email is available, an account will be created"}), 409

    verify_token = secrets.token_urlsafe(32)
    user = User(name=name, email=email, email_verify_token=User.hash_token(verify_token))
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    ws_name = company if company else f"{name.split(' ')[0]}'s Workspace"
    workspace = Workspace(
        name=ws_name,
        stage="Build",
        creator_id=user.id,
    )
    db.session.add(workspace)
    db.session.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user.id,
        email=email,
        role="owner",
        status="active",
    )
    db.session.add(member)
    db.session.commit()

    verify_link = f"{FRONTEND_URL}/verify-email?token={verify_token}"
    send_email(
        email,
        "Verify your FounDesk email",
        f"<p>Click <a href='{verify_link}'>here</a> to verify your email.</p>",
        f"Verify your email: {verify_link}",
    )

    access_token, raw_refresh, _ = _generate_token_pair(user)

    return jsonify({
        "message": "Account created. Please verify your email.",
        "token": access_token,
        "refresh_token": raw_refresh,
        "user": {"id": user.id, "email": user.email, "name": user.name},
        "workspace": {"id": workspace.id, "name": workspace.name},
    }), 201


@auth_bp.route("/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    access_token, raw_refresh, _ = _generate_token_pair(user)

    membership = WorkspaceMember.query.filter_by(
        user_id=user.id, status="active"
    ).first()
    workspace = Workspace.query.get(membership.workspace_id) if membership else None

    return jsonify({
        "message": "Login successful",
        "token": access_token,
        "refresh_token": raw_refresh,
        "user": {"id": user.id, "email": user.email, "name": user.name},
        "workspace": workspace.to_dict() if workspace else None,
    })


@auth_bp.route("/auth/refresh", methods=["POST"])
@limiter.limit("10 per minute")
def refresh_token():
    data = request.get_json() or {}
    raw_refresh = (data.get("refresh_token") or "").strip()
    if not raw_refresh:
        return jsonify({"error": "Refresh token is required"}), 400

    token_hash = RefreshToken.hash_token(raw_refresh)
    stored = RefreshToken.query.filter_by(token_hash=token_hash).first()
    if not stored or not stored.is_valid():
        return jsonify({"error": "Invalid or expired refresh token"}), 401

    stored.last_used_at = datetime.datetime.utcnow()
    stored.revoked = True
    user = User.query.get(stored.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 401

    access_token, new_raw, _ = _generate_token_pair(user)
    return jsonify({
        "token": access_token,
        "refresh_token": new_raw,
    })


@auth_bp.route("/auth/verify-email", methods=["POST"])
@limiter.limit("10 per minute")
def verify_email():
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    if not token:
        return jsonify({"error": "Token is required"}), 400
    user = User.query.filter_by(email_verify_token=User.hash_token(token)).first()
    if not user:
        return jsonify({"error": "Invalid or expired verification token"}), 400
    user.email_verified = True
    user.email_verify_token = None
    db.session.commit()
    send_welcome_email(user.email, user.name)
    return jsonify({"message": "Email verified successfully"})


@auth_bp.route("/auth/forgot-password", methods=["POST"])
@limiter.limit("3 per minute")
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "If an account exists, a reset link has been sent."})

    user.password_reset_token = None
    user.password_reset_expires = None
    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = User.hash_token(reset_token)
    user.password_reset_expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    db.session.commit()

    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"
    send_email(
        email,
        "Reset your FounDesk password",
        f"<p>Click <a href='{reset_link}'>here</a> to reset your password. This link expires in 1 hour.</p>",
        f"Reset your password: {reset_link}",
    )

    return jsonify({"message": "If an account exists, a reset link has been sent."})


@auth_bp.route("/auth/reset-password", methods=["POST"])
@limiter.limit("3 per minute")
def reset_password():
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    new_password = data.get("password") or ""

    if not token or not new_password:
        return jsonify({"error": "Token and password are required"}), 400
    pwd_err = _validate_password(new_password)
    if pwd_err:
        return jsonify({"error": pwd_err}), 400

    user = User.query.filter_by(password_reset_token=User.hash_token(token)).first()
    if not user:
        return jsonify({"error": "Invalid or expired reset token"}), 400

    if user.password_reset_expires and user.password_reset_expires < datetime.datetime.utcnow():
        return jsonify({"error": "Reset token has expired"}), 400

    user.set_password(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.token_version += 1
    RefreshToken.query.filter_by(user_id=user.id, revoked=False).update({"revoked": True})
    db.session.commit()

    return jsonify({"message": "Password has been reset successfully."})
