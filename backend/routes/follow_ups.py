from flask import Blueprint, request, jsonify
from config.database import db
from models.follow_up import FollowUp
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from datetime import datetime

follow_ups_bp = Blueprint('follow_ups', __name__)

@follow_ups_bp.route('/follow-ups', methods=['POST'])
@token_required
def create_follow_up(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data or not data.get('person_name'):
        return jsonify({"error": "Person name is required"}), 400

    last_contact = None
    if data.get('last_contact_date'):
        try:
            last_contact = datetime.fromisoformat(data.get('last_contact_date').replace('Z', '+00:00'))
        except Exception:
            pass

    followup_due = None
    if data.get('followup_date'):
        try:
            followup_due = datetime.fromisoformat(data.get('followup_date').replace('Z', '+00:00'))
        except Exception:
            pass

    follow_up = FollowUp(
        person_name=data['person_name'],
        last_contact_date=last_contact,
        followup_date=followup_due,
        linked_meeting_id=data.get('linked_meeting_id') if data.get('linked_meeting_id') != '' else None,
        linked_task_id=data.get('linked_task_id') if data.get('linked_task_id') != '' else None,
        status='pending',
        user_id=current_user_id,
        workspace_id=workspace_id
    )

    db.session.add(follow_up)
    db.session.commit()
    return jsonify(follow_up.to_dict()), 201

@follow_ups_bp.route('/follow-ups', methods=['GET'])
@token_required
def get_follow_ups(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    status_filter = request.args.get('status', 'pending')
    query = FollowUp.query.filter_by(workspace_id=workspace_id)

    if status_filter != 'all':
        query = query.filter_by(status=status_filter)

    follow_ups = query.order_by(FollowUp.created_at.desc()).all()
    return jsonify([f.to_dict() for f in follow_ups])

@follow_ups_bp.route('/follow-ups/<int:fu_id>', methods=['PUT'])
@token_required
def update_follow_up(current_user_id, fu_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    follow_up = FollowUp.query.filter_by(id=fu_id, workspace_id=workspace_id).first()
    if not follow_up:
        return jsonify({"error": "Follow-up not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if 'status' in data:
        if data['status'] not in ['pending', 'completed', 'dismissed']:
            return jsonify({"error": "Invalid status value"}), 400
        follow_up.status = data['status']

    if 'linked_task_id' in data:
        follow_up.linked_task_id = data['linked_task_id'] if data['linked_task_id'] != '' else None

    db.session.commit()
    return jsonify(follow_up.to_dict())
