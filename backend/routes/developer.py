from flask import Blueprint, request, jsonify
from config.database import db
from utils.auth import token_required
from models.api_key import ApiKey
from models.api_key_audit import ApiKeyAuditLog
from datetime import datetime
import hashlib

developer_bp = Blueprint('developer', __name__)

@developer_bp.route('/developer/api-keys', methods=['GET'])
@token_required
def list_api_keys(current_user_id):
    keys = ApiKey.query.filter_by(user_id=current_user_id).order_by(ApiKey.created_at.desc()).all()
    return jsonify({"api_keys": [k.to_dict() for k in keys]})


@developer_bp.route('/developer/api-keys', methods=['POST'])
@token_required
def create_api_key(current_user_id):
    data = request.get_json()
    name = (data or {}).get('name', '').strip()
    if not name:
        return jsonify({"error": "API key name is required"}), 400

    permissions = (data or {}).get('permissions', {"read": True, "write": False, "admin": False})

    raw_key = ApiKey.generate_key()
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]

    api_key = ApiKey(
        user_id=current_user_id,
        name=name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        permissions=permissions,
    )
    db.session.add(api_key)
    db.session.flush()

    audit = ApiKeyAuditLog(
        api_key_id=api_key.id,
        user_id=current_user_id,
        action="create",
        details=f"Created API key '{name}'",
        ip_address=request.remote_addr,
    )
    db.session.add(audit)
    db.session.commit()

    return jsonify({
        "api_key": api_key.to_dict(),
        "raw_key": raw_key,
        "message": "Save this key — it won't be shown again."
    }), 201


@developer_bp.route('/developer/api-keys/<int:key_id>', methods=['PUT'])
@token_required
def rename_api_key(current_user_id, key_id):
    key = ApiKey.query.filter_by(id=key_id, user_id=current_user_id).first()
    if not key:
        return jsonify({"error": "API key not found"}), 404
    data = request.get_json() or {}
    new_name = data.get('name', '').strip()
    if not new_name:
        return jsonify({"error": "Name is required"}), 400
    old_name = key.name
    key.name = new_name
    audit = ApiKeyAuditLog(
        api_key_id=key.id,
        user_id=current_user_id,
        action="rename",
        details=f"Renamed API key from '{old_name}' to '{new_name}'",
        ip_address=request.remote_addr,
    )
    db.session.add(audit)
    db.session.commit()
    return jsonify({"message": "API key renamed", "api_key": key.to_dict()})


@developer_bp.route('/developer/api-keys/<int:key_id>', methods=['DELETE'])
@token_required
def revoke_api_key(current_user_id, key_id):
    key = ApiKey.query.filter_by(id=key_id, user_id=current_user_id).first()
    if not key:
        return jsonify({"error": "API key not found"}), 404

    key.is_active = False
    audit = ApiKeyAuditLog(
        api_key_id=key.id,
        user_id=current_user_id,
        action="revoke",
        details=f"Revoked API key '{key.name}'",
        ip_address=request.remote_addr,
    )
    db.session.add(audit)
    db.session.commit()
    return jsonify({"message": f"API key '{key.name}' revoked"})


@developer_bp.route('/developer/api-keys/<int:key_id>/hard', methods=['DELETE'])
@token_required
def hard_delete_api_key(current_user_id, key_id):
    key = ApiKey.query.filter_by(id=key_id, user_id=current_user_id).first()
    if not key:
        return jsonify({"error": "API key not found"}), 404
    data = request.get_json() or {}
    if not data.get("confirm"):
        return jsonify({"error": "Must confirm hard delete with confirm: true"}), 400
    audit = ApiKeyAuditLog(
        api_key_id=key.id,
        user_id=current_user_id,
        action="hard_delete",
        details=f"Permanently deleted API key '{key.name}'",
        ip_address=request.remote_addr,
    )
    db.session.add(audit)
    db.session.delete(key)
    db.session.commit()
    return jsonify({"message": "API key permanently deleted"})


@developer_bp.route('/developer/api-keys/<int:key_id>/audit', methods=['GET'])
@token_required
def get_api_key_audit(current_user_id, key_id):
    key = ApiKey.query.filter_by(id=key_id, user_id=current_user_id).first()
    if not key:
        return jsonify({"error": "API key not found"}), 404
    logs = ApiKeyAuditLog.query.filter_by(api_key_id=key.id).order_by(ApiKeyAuditLog.created_at.desc()).all()
    return jsonify({"audit_logs": [log.to_dict() for log in logs]})


@developer_bp.route('/developer/api-keys/<int:key_id>/test', methods=['POST'])
@token_required
def test_api_key(current_user_id, key_id):
    key = ApiKey.query.filter_by(id=key_id, user_id=current_user_id).first()
    if not key:
        return jsonify({"error": "API key not found"}), 404
    if not key.is_active:
        return jsonify({"valid": False, "message": "API key is revoked"})
    key.last_used_at = datetime.utcnow()
    key.last_used_ip = request.remote_addr
    db.session.commit()
    return jsonify({"valid": True, "message": "API key is active and valid"})
