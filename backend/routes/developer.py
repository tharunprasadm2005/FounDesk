from flask import Blueprint, request, jsonify
from config.database import db
from utils.auth import token_required
from models.api_key import ApiKey
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

    raw_key = ApiKey.generate_key()
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:8]

    api_key = ApiKey(
        user_id=current_user_id,
        name=name,
        key_prefix=key_prefix,
        key_hash=key_hash
    )
    db.session.add(api_key)
    db.session.commit()

    return jsonify({
        "api_key": api_key.to_dict(),
        "raw_key": raw_key,
        "message": "Save this key — it won't be shown again."
    }), 201


@developer_bp.route('/developer/api-keys/<int:key_id>', methods=['DELETE'])
@token_required
def revoke_api_key(current_user_id, key_id):
    key = ApiKey.query.filter_by(id=key_id, user_id=current_user_id).first()
    if not key:
        return jsonify({"error": "API key not found"}), 404

    key.is_active = False
    db.session.commit()
    return jsonify({"message": f"API key '{key.name}' revoked"})
