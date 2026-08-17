from flask import Blueprint, request, jsonify
from config.database import db
from models.standup import Standup
from models.workspace_member import WorkspaceMember
from models.user import User
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from datetime import datetime

standups_bp = Blueprint('standups', __name__)

@standups_bp.route('/standups', methods=['POST'])
@token_required
def submit_standup(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json(silent=True)
    if not data or not data.get('q1_yesterday') or not data.get('q2_today'):
        return jsonify({"error": "Standup answers for yesterday and today are required."}), 400

    local_date = data.get('date')
    if not local_date:
        # Fallback to current UTC date YYYY-MM-DD
        local_date = datetime.utcnow().strftime('%Y-%m-%d')

    # Restrict submissions to one per user per workspace per calendar date
    existing = Standup.query.filter_by(
        user_id=current_user_id,
        workspace_id=workspace_id,
        date=local_date
    ).first()
    
    if existing:
        return jsonify({"error": "You have already checked in for today."}), 400

    import json
    compiled_raw = data.get('compiled_json')
    compiled_str = json.dumps(compiled_raw) if isinstance(compiled_raw, dict) else compiled_raw

    standup = Standup(
        user_id=current_user_id,
        workspace_id=workspace_id,
        date=local_date,
        q1_yesterday=data.get('q1_yesterday'),
        q2_today=data.get('q2_today'),
        q3_blockers=data.get('q3_blockers'),
        compiled_json=compiled_str
    )

    db.session.add(standup)
    db.session.commit()

    return jsonify(standup.to_dict()), 201

@standups_bp.route('/standups', methods=['GET'])
@token_required
def get_standups(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    target_date = request.args.get('date')
    if not target_date:
        target_date = datetime.utcnow().strftime('%Y-%m-%d')

    # 1. Fetch standups submitted on the date
    standups = Standup.query.filter_by(
        workspace_id=workspace_id,
        date=target_date
    ).order_by(Standup.created_at.desc()).all()

    # 2. Fetch active workspace members
    memberships = WorkspaceMember.query.filter_by(
        workspace_id=workspace_id,
        status='active'
    ).all()

    # Map who has submitted
    submitted_user_ids = {s.user_id for s in standups}

    # 3. Identify non-responders
    non_responders = []
    for m in memberships:
        if m.user_id not in submitted_user_ids and m.user_id is not None:
            user_display_name = m.user.name if m.user else None
            non_responders.append({
                "user_id": m.user_id,
                "email": m.email,
                "user_name": user_display_name or m.email,
                "role": m.role
            })

    return jsonify({
        "date": target_date,
        "submissions": [s.to_dict() for s in standups],
        "non_responders": non_responders
    })
