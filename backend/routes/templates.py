from flask import Blueprint, request, jsonify
from config.database import db
from models.phase_template import PhaseTemplate, PhaseTemplateGoal, PhaseTemplateTask
from models.goal import Goal
from models.task import Task
from models.workspace import Workspace
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id

templates_bp = Blueprint('templates', __name__)

@templates_bp.route('/templates', methods=['GET'])
@token_required
def get_templates(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    ws = Workspace.query.get(workspace_id)
    active_phase = ws.active_phase if ws else None

    templates = PhaseTemplate.query.all()
    result = []
    for t in templates:
        t_dict = t.to_dict()
        t_dict['is_active'] = (t.name == active_phase)
        result.append(t_dict)
    return jsonify(result)

@templates_bp.route('/workspaces/apply-template', methods=['POST'])
@token_required
def apply_template(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    data = request.get_json(silent=True) or {}
    template_id = data.get('template_id')
    template_name = data.get('template_name')

    if template_id:
        template = PhaseTemplate.query.get(template_id)
    elif template_name:
        template = PhaseTemplate.query.filter_by(name=template_name).first()
    else:
        return jsonify({"error": "Template ID or Name is required"}), 400

    if not template:
        return jsonify({"error": "Phase template not found"}), 404

    # 1. Fetch template goals & tasks
    template_goals = PhaseTemplateGoal.query.filter_by(template_id=template.id).all()
    template_tasks = PhaseTemplateTask.query.filter_by(template_id=template.id).all()

    # Maps to hold: PhaseTemplateGoal.id -> newly created Goal.id
    monthly_goal_map = {}
    weekly_goal_map = {}

    # Step A: Create monthly goals
    for tg in template_goals:
        if tg.goal_type == 'monthly':
            g = Goal(
                title=tg.title,
                description=tg.description,
                goal_type='monthly',
                status='pending',
                parent_id=None,
                user_id=current_user_id,
                workspace_id=workspace_id
            )
            db.session.add(g)
            db.session.commit() # commit to generate IDs
            monthly_goal_map[tg.id] = g.id

    # Step B: Create weekly goals linking by parent monthly goal ID
    for tg in template_goals:
        if tg.goal_type == 'weekly':
            new_parent_id = monthly_goal_map.get(tg.parent_goal_id) if tg.parent_goal_id else None
            g = Goal(
                title=tg.title,
                description=tg.description,
                goal_type='weekly',
                status='pending',
                parent_id=new_parent_id,
                user_id=current_user_id,
                workspace_id=workspace_id
            )
            db.session.add(g)
            db.session.commit() # commit to generate IDs
            weekly_goal_map[tg.id] = g.id

    # Step C: Create daily tasks linking by parent weekly goal ID
    for tt in template_tasks:
        new_goal_id = weekly_goal_map.get(tt.parent_goal_id)
        task = Task(
            title=tt.title,
            description=tt.description,
            priority=tt.priority,
            status='Not Started',
            deadline=None,
            assignee_id=None,
            goal_id=new_goal_id,
            parent_id=None,
            blocked_at=None,
            blocker_description=None,
            estimated_hours=None,
            started_at=None,
            phase_tag=template.name,
            is_seen=False,
            user_id=current_user_id,
            workspace_id=workspace_id
        )
        db.session.add(task)
    
    # 2. Update workspace active phase (additive loader)
    ws.active_phase = template.name
    db.session.commit()

    return jsonify({
        "message": f"Successfully applied template '{template.name}' additively to workspace.",
        "active_phase": template.name
    }), 200

@templates_bp.route('/phase/<name>', methods=['GET'])
@token_required
def get_phase_detail(current_user_id, name):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    template = PhaseTemplate.query.filter_by(name=name).first()
    if not template:
        return jsonify({"error": "Phase template not found"}), 404

    goals = PhaseTemplateGoal.query.filter_by(template_id=template.id).all()
    tasks = PhaseTemplateTask.query.filter_by(template_id=template.id).all()

    # Build hierarchy: monthly -> weekly -> tasks
    monthly_goals = [g.to_dict() for g in goals if g.goal_type == 'monthly']
    weekly_goals = {g.id: g.to_dict() for g in goals if g.goal_type == 'weekly'}

    tasks_by_goal = {}
    for t in tasks:
        tasks_by_goal.setdefault(t.parent_goal_id, []).append(t.to_dict())

    for m in monthly_goals:
        children = [w for w in weekly_goals.values() if w['parent_goal_id'] == m['id']]
        for w in children:
            w['checklist'] = tasks_by_goal.get(w['id'], [])
        m['sub_goals'] = children

    return jsonify({
        "template": template.to_dict(),
        "checklist": monthly_goals
    })

@templates_bp.route('/workspaces/auto-load-template', methods=['POST'])
@token_required
def auto_load_template(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    from models.workspace import Workspace
    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    active_phase = ws.active_phase if ws.active_phase else ws.stage
    if not active_phase:
        return jsonify({"error": "No active phase or stage set on workspace"}), 400

    template = PhaseTemplate.query.filter_by(name=active_phase).first()
    if not template:
        return jsonify({"error": f"No template found for phase '{active_phase}'"}), 404

    # Check if template was already applied
    from models.task import Task
    existing = Task.query.filter_by(workspace_id=workspace_id, phase_tag=template.name).first()
    if existing:
        return jsonify({"message": f"Template '{template.name}' already applied to this workspace", "active_phase": template.name}), 200

    # Apply template: create goals and tasks
    template_goals = PhaseTemplateGoal.query.filter_by(template_id=template.id).all()
    template_tasks = PhaseTemplateTask.query.filter_by(template_id=template.id).all()

    monthly_goal_map = {}
    weekly_goal_map = {}

    for tg in template_goals:
        if tg.goal_type == 'monthly':
            from models.goal import Goal
            g = Goal(
                title=tg.title,
                description=tg.description,
                goal_type='monthly',
                status='pending',
                parent_id=None,
                user_id=current_user_id,
                workspace_id=workspace_id
            )
            db.session.add(g)
            db.session.commit()
            monthly_goal_map[tg.id] = g.id

    for tg in template_goals:
        if tg.goal_type == 'weekly':
            from models.goal import Goal
            new_parent_id = monthly_goal_map.get(tg.parent_goal_id) if tg.parent_goal_id else None
            g = Goal(
                title=tg.title,
                description=tg.description,
                goal_type='weekly',
                status='pending',
                parent_id=new_parent_id,
                user_id=current_user_id,
                workspace_id=workspace_id
            )
            db.session.add(g)
            db.session.commit()
            weekly_goal_map[tg.id] = g.id

    for tt in template_tasks:
        new_goal_id = weekly_goal_map.get(tt.parent_goal_id)
        task = Task(
            title=tt.title,
            description=tt.description,
            priority=tt.priority,
            status='Not Started',
            deadline=None,
            assignee_id=None,
            goal_id=new_goal_id,
            parent_id=None,
            blocked_at=None,
            blocker_description=None,
            estimated_hours=None,
            started_at=None,
            phase_tag=template.name,
            is_seen=False,
            user_id=current_user_id,
            workspace_id=workspace_id
        )
        db.session.add(task)

    ws.active_phase = template.name
    db.session.commit()

    return jsonify({
        "message": f"Auto-loaded template '{template.name}' for current phase",
        "active_phase": template.name
    }), 200
