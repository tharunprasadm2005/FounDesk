from flask import Blueprint, request, jsonify
from config.database import db
from models.decision_log import DecisionLog
from models.workspace import Workspace
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from sqlalchemy.orm import selectinload
from sqlalchemy import case
from datetime import datetime
import traceback

decisions_bp = Blueprint('decisions', __name__)

def _safe_to_dict(obj):
    try:
        return obj.to_dict() if hasattr(obj, 'to_dict') else {"id": obj.id, "error": "serialization failed"}
    except Exception:
        return {"id": getattr(obj, 'id', None), "error": "serialization failed"}

@decisions_bp.route('/decisions', methods=['GET'])
@token_required
def get_decisions(current_user_id):
    try:
        workspace_id = get_current_workspace_id(current_user_id)
        if not workspace_id:
            return jsonify({"error": "No active workspace context"}), 400

        search = request.args.get('search', '').strip()
        stage = request.args.get('stage', '').strip()
        status_filter = request.args.get('status', '').strip()
        decision_type_filter = request.args.get('decision_type', '').strip()
        query = DecisionLog.query.options(selectinload(DecisionLog.linked_tasks)).filter_by(workspace_id=workspace_id)
        if search:
            query = query.filter(
                (DecisionLog.decision.ilike(f"%{search}%")) |
                (DecisionLog.context.ilike(f"%{search}%")) |
                (DecisionLog.alternatives.ilike(f"%{search}%"))
            )
        if stage:
            query = query.filter(DecisionLog.startup_stage == stage)
        if status_filter:
            query = query.filter(DecisionLog.ai_status == status_filter)
        if decision_type_filter:
            query = query.filter(DecisionLog.decision_type == decision_type_filter)

        priority_order = case(
            (DecisionLog.ai_status == 'pending_confirmation', 0),
            (DecisionLog.ai_status == 'confirmed', 1),
            (DecisionLog.ai_status == 'dismissed', 2),
            else_=3
        )
        decisions = query.order_by(
            priority_order,
            DecisionLog.confidence_score.desc().nullslast(),
            DecisionLog.created_at.desc()
        ).all()
        return jsonify([_safe_to_dict(d) for d in decisions])
    except Exception as e:
        print(f"GET /decisions error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to fetch decisions", "message": str(e)}), 500

@decisions_bp.route('/decisions', methods=['POST'])
@token_required
def create_decision(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data or not data.get('decision'):
        return jsonify({"error": "Decision text is required"}), 400
        
    workspace = Workspace.query.get(workspace_id)
    startup_stage = data.get('startup_stage') or (workspace.stage if workspace else None)
        
    decision = DecisionLog(
        decision=data.get('decision'),
        context=data.get('context', ''),
        alternatives=data.get('alternatives', ''),
        attendees=data.get('attendees', ''),
        startup_stage=startup_stage,
        status=data.get('status', 'Proposed'),
        consequences=data.get('consequences', ''),
        superseded_by_id=data.get('superseded_by_id'),
        linked_meeting_id=data.get('linked_meeting_id'),
        created_by=current_user_id,
        workspace_id=workspace_id,
        decision_type=data.get('decision_type', 'product')
    )
    
    db.session.add(decision)
    db.session.commit()
    return jsonify(decision.to_dict()), 201

@decisions_bp.route('/decisions/<int:decision_id>', methods=['PUT'])
@token_required
def update_decision(current_user_id, decision_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    decision = DecisionLog.query.filter_by(id=decision_id, workspace_id=workspace_id).first()
    if not decision:
        return jsonify({"error": "Decision log not found in this workspace"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if 'decision' in data:
        if not data['decision'].strip():
            return jsonify({"error": "Decision text cannot be empty"}), 400
        decision.decision = data['decision']
    if 'context' in data:
        decision.context = data['context']
    if 'alternatives' in data:
        decision.alternatives = data['alternatives']
    if 'attendees' in data:
        decision.attendees = data['attendees']
    if 'startup_stage' in data:
        decision.startup_stage = data['startup_stage']

    # Status lifecycle: proposed -> confirmed -> reversed/superseded
    if 'status' in data:
        new_status = data['status']
        valid_transitions = {
            'Proposed': ['Confirmed', 'Dismissed'],
            'Confirmed': ['Implemented', 'Reversed', 'Superseded'],
            'Implemented': [],
            'Reversed': [],
            'Superseded': [],
            'Dismissed': [],
        }
        current = decision.status or 'Proposed'
        allowed = valid_transitions.get(current, [])
        if new_status != current and new_status not in allowed:
            return jsonify({
                "error": f"Cannot transition from '{current}' to '{new_status}'. Allowed: {allowed}",
                "current_status": current,
                "allowed_transitions": allowed
            }), 400
        decision.status = new_status
        if new_status == 'Confirmed' and not decision.confirmed_at:
            decision.confirmed_at = datetime.utcnow()
            if decision.ai_status in (None, 'pending_confirmation'):
                decision.ai_status = 'confirmed'

    if 'consequences' in data:
        decision.consequences = data['consequences']
    if 'superseded_by_id' in data:
        decision.superseded_by_id = data['superseded_by_id']
    if 'ai_status' in data:
        decision.ai_status = data['ai_status']
    if 'decision_type' in data:
        decision.decision_type = data['decision_type']

    db.session.commit()
    return jsonify(decision.to_dict())

@decisions_bp.route('/decisions/<int:decision_id>', methods=['DELETE'])
@token_required
def delete_decision(current_user_id, decision_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    decision = DecisionLog.query.filter_by(id=decision_id, workspace_id=workspace_id).first()
    if not decision:
        return jsonify({"error": "Decision log not found in this workspace"}), 404
        
    db.session.delete(decision)
    db.session.commit()
    return jsonify({"message": "Decision log deleted successfully"})
