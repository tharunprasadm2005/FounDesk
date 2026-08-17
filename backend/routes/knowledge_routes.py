from flask import Blueprint, request, jsonify
from config.database import db
from models.knowledge_item import KnowledgeItem
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from sqlalchemy import case

knowledge_bp = Blueprint('knowledge', __name__)


@knowledge_bp.route('/knowledge', methods=['GET'])
@token_required
def get_knowledge_items(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    search = request.args.get('search', '').strip()
    ktype = request.args.get('knowledge_type', '').strip()
    status_filter = request.args.get('status', '').strip()
    query = KnowledgeItem.query.filter_by(workspace_id=workspace_id)

    if search:
        query = query.filter(
            (KnowledgeItem.title.ilike(f"%{search}%")) |
            (KnowledgeItem.summary.ilike(f"%{search}%"))
        )
    if ktype:
        query = query.filter(KnowledgeItem.knowledge_type == ktype)
    if status_filter:
        if status_filter == 'archived':
            query = query.filter(KnowledgeItem.status == 'archived')
        else:
            query = query.filter(KnowledgeItem.status.in_(['auto_inferred', 'verified']))

    status_order = case(
        (KnowledgeItem.status == 'verified', 0),
        (KnowledgeItem.status == 'auto_inferred', 1),
        (KnowledgeItem.status == 'archived', 2),
        else_=3
    )
    items = query.order_by(status_order, KnowledgeItem.confidence.desc().nullslast(), KnowledgeItem.created_at.desc()).all()
    return jsonify([i.to_dict() for i in items])


@knowledge_bp.route('/knowledge', methods=['POST'])
@token_required
def create_knowledge_item(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json(silent=True)
    if not data or not data.get('title'):
        return jsonify({"error": "Title is required"}), 400

    item = KnowledgeItem(
        title=data['title'],
        knowledge_type=data.get('knowledge_type', 'documentation'),
        summary=data.get('summary', ''),
        key_points=data.get('key_points', []),
        applicable_to=data.get('applicable_to', ''),
        confidence=1.0,
        source='manual',
        workspace_id=workspace_id,
        created_by=current_user_id,
        status='verified',
        linked_decision_id=data.get('linked_decision_id'),
        linked_goal_id=data.get('linked_goal_id'),
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201


@knowledge_bp.route('/knowledge/<int:item_id>', methods=['PUT'])
@token_required
def update_knowledge_item(current_user_id, item_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    item = KnowledgeItem.query.filter_by(id=item_id, workspace_id=workspace_id).first()
    if not item:
        return jsonify({"error": "Knowledge item not found"}), 404

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if 'title' in data:
        if not data['title'].strip():
            return jsonify({"error": "Title cannot be empty"}), 400
        item.title = data['title']
    if 'knowledge_type' in data:
        item.knowledge_type = data['knowledge_type']
    if 'summary' in data:
        item.summary = data['summary']
    if 'key_points' in data:
        item.key_points = data['key_points']
    if 'applicable_to' in data:
        item.applicable_to = data['applicable_to']
    if 'status' in data:
        item.status = data['status']
    if 'linked_decision_id' in data:
        item.linked_decision_id = data['linked_decision_id']
    if 'linked_goal_id' in data:
        item.linked_goal_id = data['linked_goal_id']
    if 'review_flag' in data:
        item.review_flag = data['review_flag']
    if 'reviewed_at' in data:
        from datetime import datetime
        item.reviewed_at = datetime.utcnow()

    db.session.commit()
    return jsonify(item.to_dict())


@knowledge_bp.route('/knowledge/<int:item_id>', methods=['DELETE'])
@token_required
def delete_knowledge_item(current_user_id, item_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    item = KnowledgeItem.query.filter_by(id=item_id, workspace_id=workspace_id).first()
    if not item:
        return jsonify({"error": "Knowledge item not found"}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Knowledge item deleted successfully"})
