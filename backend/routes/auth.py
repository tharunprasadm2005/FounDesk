from flask import Blueprint, request, jsonify, current_app
from config.database import db
from models.user import User
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
import jwt
import datetime
import secrets
import hashlib

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    company = (data.get("company") or "").strip()

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(name=name, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    workspace = Workspace(
        name=f"{name}'s Workspace",
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

    jwt_token = jwt.encode(
        {
            "user_id": user.id,
            "email": user.email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30),
        },
        current_app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    return jsonify({
        "message": "Account created successfully",
        "token": jwt_token,
        "user": {"id": user.id, "email": user.email, "name": user.name},
        "workspace": {"id": workspace.id, "name": workspace.name},
    }), 201


@auth_bp.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    jwt_token = jwt.encode(
        {
            "user_id": user.id,
            "email": user.email,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(days=30),
        },
        current_app.config["SECRET_KEY"],
        algorithm="HS256",
    )

    membership = WorkspaceMember.query.filter_by(
        user_id=user.id, status="active"
    ).first()
    workspace = Workspace.query.get(membership.workspace_id) if membership else None

    return jsonify({
        "message": "Login successful",
        "token": jwt_token,
        "user": {"id": user.id, "email": user.email, "name": user.name},
        "workspace": workspace.to_dict() if workspace else None,
    })


@auth_bp.route("/auth/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "If an account exists, a reset link has been sent."})

    reset_token = secrets.token_urlsafe(32)
    user.password_reset_token = reset_token
    user.password_reset_expires = datetime.datetime.utcnow() + datetime.timedelta(hours=1)
    db.session.commit()

    return jsonify({
        "message": "If an account exists, a reset link has been sent.",
    })


@auth_bp.route("/auth/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    new_password = data.get("password") or ""

    if not token or not new_password:
        return jsonify({"error": "Token and password are required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    user = User.query.filter_by(password_reset_token=token).first()
    if not user:
        return jsonify({"error": "Invalid or expired reset token"}), 400

    if user.password_reset_expires and user.password_reset_expires < datetime.datetime.utcnow():
        return jsonify({"error": "Reset token has expired"}), 400

    user.set_password(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.session.commit()

    return jsonify({"message": "Password has been reset successfully."})
