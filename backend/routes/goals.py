from flask import Blueprint, request, jsonify
from config.database import db
from models.goal import Goal
from models.task import Task
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from datetime import datetime, timedelta, date

goals_bp = Blueprint('goals', __name__)


def compute_goal_risk(goal, tasks, linked_decision_ids):
    """Return (is_at_risk, risk_reason) for a goal."""
    if goal.status in ("completed", "failed"):
        return False, None

    total = len(tasks)
    done = sum(1 for t in tasks if t.status == "Done")
    reasons = []

    if goal.due_date:
        if isinstance(goal.due_date, date):
            due = goal.due_date
        else:
            due = goal.due_date.date() if hasattr(goal.due_date, 'date') else goal.due_date
        today = date.today()
        days_left = (due - today).days

        if days_left < 0:
            reasons.append(f"Overdue by {abs(days_left)}d")
        elif days_left <= 3 and total > 0 and done / total < 0.5:
            reasons.append(f"Due in {days_left}d, only {done}/{total} tasks done")
        elif days_left <= 7 and total == 0:
            reasons.append(f"Due in {days_left}d with no linked tasks")

    # Stalled: no completions in 14 days
    if goal.status == "in_progress" and total > 0:
        recent = sum(1 for t in tasks if t.status == "Done" and (t.completed_at or t.updated_at) and (t.completed_at or t.updated_at) >= (datetime.utcnow() - timedelta(days=14)))
        if recent == 0 and done > 0:
            reasons.append("No progress in 14 days")
        elif total > 0 and done == 0 and goal.created_at and (datetime.utcnow() - goal.created_at).days > 14:
            reasons.append("No tasks started in 14 days")

    if reasons:
        return True, "; ".join(reasons)
    return False, None


def compute_progress_trend(goal, tasks):
    """Return 'accelerating', 'stalling', or 'steady' based on completion velocity."""
    if not tasks:
        return "steady"
    now = datetime.utcnow()
    this_week = sum(1 for t in tasks if t.status == "Done" and (t.completed_at or t.updated_at) and (t.completed_at or t.updated_at) >= (now - timedelta(days=7)))
    last_week = sum(1 for t in tasks if t.status == "Done" and (t.completed_at or t.updated_at) and (t.completed_at or t.updated_at) >= (now - timedelta(days=14)) and (t.completed_at or t.updated_at) < (now - timedelta(days=7)))
    if this_week > last_week:
        return "accelerating"
    if this_week < last_week:
        return "stalling"
    return "steady"


def get_source_info(goal):
    """Return human-readable source info for a goal."""
    info = {"type": "manual", "label": "Manual", "ref_ids": []}
    if goal.source == "meeting" and goal.source_event_id:
        meeting = MeetingNotes.query.get(goal.source_event_id)
        if meeting:
            info = {"type": "meeting", "label": f"Meeting: {meeting.title}", "ref_ids": [meeting.id]}
    elif goal.source in ("ai", "extraction") and goal.linked_decisions:
        info = {"type": "decision", "label": f"{len(goal.linked_decisions)} linked decision(s)", "ref_ids": [d.id for d in goal.linked_decisions]}
    elif goal.source_integration:
        info = {"type": "integration", "label": f"From {goal.source_integration}", "ref_ids": [goal.source_event_id] if goal.source_event_id else []}
    return info


@goals_bp.route('/goals', methods=['GET'])
@token_required
def get_goals(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    source = request.args.get('source')
    query = Goal.query.filter_by(workspace_id=workspace_id).filter(Goal.status != 'duplicate')
    if source:
        query = query.filter_by(source=source)
    goals = query.order_by(Goal.created_at.desc()).all()

    tasks = Task.query.filter_by(workspace_id=workspace_id).all()

    goal_list = []
    weekly_progress_map = {}
    weekly_tasks_map = {}
    weekly_decision_ids_map = {}
    session_changed = False

    for g in goals:
        if g.goal_type == 'weekly':
            weekly_tasks = [t for t in tasks if t.goal_id == g.id]
            weekly_tasks_map[g.id] = [
                {"id": t.id, "title": t.title, "priority": t.priority, "status": t.status,
                 "updated_at": t.updated_at.isoformat() if t.updated_at else None}
                for t in weekly_tasks
            ]
            weekly_decision_ids_map[g.id] = [d.id for d in g.linked_decisions] if g.linked_decisions else []
            if weekly_tasks:
                completed_count = len([t for t in weekly_tasks if t.status == 'Done'])
                progress = int((completed_count / len(weekly_tasks)) * 100)
                if progress == 100 and g.status != 'completed':
                    g.status = 'completed'; session_changed = True
                elif progress > 0 and progress < 100 and g.status != 'in_progress':
                    g.status = 'in_progress'; session_changed = True
                elif progress == 0 and g.status != 'pending':
                    g.status = 'pending'; session_changed = True
            else:
                progress = 0
            weekly_progress_map[g.id] = progress

    if session_changed:
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()

    for g in goals:
        g_dict = g.to_dict()
        g_dict['linked_decision_ids'] = [d.id for d in g.linked_decisions] if g.linked_decisions else []
        g_dict['linked_task_ids'] = [t.id for t in (g.tasks or [])]

        if g.goal_type == 'weekly':
            g_dict['progress'] = weekly_progress_map.get(g.id, 0)
            g_dict['tasks'] = weekly_tasks_map.get(g.id, [])
        elif g.goal_type == 'monthly':
            sub_goals = [sg for sg in goals if sg.parent_id == g.id]
            if sub_goals:
                sub_progresses = [weekly_progress_map.get(sg.id, 0) for sg in sub_goals]
                g_dict['progress'] = int(sum(sub_progresses) / len(sub_goals))
            else:
                g_dict['progress'] = 0
        elif g.goal_type in ('daily',):
            linked_tasks = [t for t in tasks if t.goal_id == g.id]
            total = len(linked_tasks) + len(g.linked_decisions)
            done = sum(1 for t in linked_tasks if t.status == "Done") + sum(1 for d in g.linked_decisions if d.status in ("Confirmed", "Implemented"))
            g_dict['progress'] = round((done / total) * 100) if total > 0 else (100 if g.status == 'completed' else 0)

        goal_tasks = [t for t in tasks if t.goal_id == g.id]
        completed_count = sum(1 for t in goal_tasks if t.status == "Done")
        g_dict['completed_task_count'] = completed_count
        g_dict['total_task_count'] = len(goal_tasks)

        is_at_risk, risk_reason = compute_goal_risk(g, goal_tasks, g_dict['linked_decision_ids'])
        g_dict['at_risk'] = is_at_risk
        g_dict['risk_reason'] = risk_reason

        g_dict['progress_trend'] = compute_progress_trend(g, goal_tasks)
        g_dict['source_info'] = get_source_info(g)

        goal_list.append(g_dict)

    # Sort: at-risk first, then by deadline
    def sort_key(gd):
        risk = 0 if gd.get('at_risk') else 1
        return (risk, gd.get('due_date') or '9999-12-31')
    goal_list.sort(key=sort_key)

    return jsonify(goal_list)


@goals_bp.route('/goals', methods=['POST'])
@token_required
def create_goal(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data or not data.get('title') or not data.get('goal_type'):
        return jsonify({"error": "Title and goal type are required"}), 400

    title = data.get('title')
    description = data.get('description', '')
    goal_type = data.get('goal_type')
    status = data.get('status', 'pending')
    parent_id = data.get('parent_id')

    if goal_type not in ['monthly', 'weekly', 'daily']:
        return jsonify({"error": "Invalid goal type. Must be 'monthly', 'weekly', or 'daily'"}), 400

    if parent_id:
        parent_goal = Goal.query.filter_by(id=parent_id, workspace_id=workspace_id).first()
        if not parent_goal:
            return jsonify({"error": "Parent goal not found in this workspace"}), 400

    goal = Goal(
        title=title,
        description=description,
        goal_type=goal_type,
        status=status,
        parent_id=parent_id,
        user_id=current_user_id,
        workspace_id=workspace_id,
        due_date=datetime.strptime(data['due_date'], '%Y-%m-%d').date() if data.get('due_date') else None,
    )

    db.session.add(goal)
    db.session.commit()
    return jsonify(goal.to_dict()), 201


@goals_bp.route('/goals/<int:goal_id>', methods=['PUT'])
@token_required
def update_goal(current_user_id, goal_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    goal = Goal.query.filter_by(id=goal_id, workspace_id=workspace_id).first()
    if not goal:
        return jsonify({"error": "Goal not found in this workspace"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No update data provided"}), 400

    if 'title' in data:
        goal.title = data['title']
    if 'description' in data:
        goal.description = data['description']
    if 'status' in data:
        if data['status'] not in ['pending', 'in_progress', 'completed', 'failed', 'at_risk']:
            return jsonify({"error": "Invalid status value"}), 400
        goal.status = data['status']
    if 'parent_id' in data:
        parent_id = data['parent_id']
        if parent_id:
            parent_goal = Goal.query.filter_by(id=parent_id, workspace_id=workspace_id).first()
            if not parent_goal:
                return jsonify({"error": "Parent goal not found in this workspace"}), 400
        goal.parent_id = parent_id
    if 'due_date' in data:
        dd = data['due_date']
        goal.due_date = datetime.strptime(dd, '%Y-%m-%d').date() if dd else None

    db.session.commit()
    return jsonify(goal.to_dict())


@goals_bp.route('/goals/<int:goal_id>', methods=['DELETE'])
@token_required
def delete_goal(current_user_id, goal_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    goal = Goal.query.filter_by(id=goal_id, workspace_id=workspace_id).first()
    if not goal:
        return jsonify({"error": "Goal not found in this workspace"}), 404

    db.session.delete(goal)
    db.session.commit()
    return jsonify({"message": "Goal deleted successfully"})


@goals_bp.route('/goals/<int:goal_id>/detail', methods=['GET'])
@token_required
def get_goal_detail(current_user_id, goal_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    goal = Goal.query.filter_by(id=goal_id, workspace_id=workspace_id).first()
    if not goal:
        return jsonify({"error": "Goal not found in this workspace"}), 404

    linked_tasks = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id).all()
    linked_decisions = goal.linked_decisions or []

    # Find source meeting if any
    source_meeting = None
    if goal.source == "meeting" and goal.source_event_id:
        meeting = MeetingNotes.query.get(goal.source_event_id)
        if meeting:
            source_meeting = {"id": meeting.id, "title": meeting.title, "date": meeting.date.isoformat() if hasattr(meeting.date, 'isoformat') else str(meeting.date)}

    # Find recent activity (tasks completed/updated in last 30 days)
    recent_activity = []
    now = datetime.utcnow()
    for t in linked_tasks:
        if t.updated_at and t.updated_at >= (now - timedelta(days=30)):
            recent_activity.append({
                "type": "task",
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "timestamp": t.updated_at.isoformat() if t.updated_at else None,
            })
    for d in linked_decisions:
        if d.created_at and d.created_at >= (now - timedelta(days=30)):
            recent_activity.append({
                "type": "decision",
                "id": d.id,
                "title": d.decision[:80] if d.decision else "",
                "status": d.status,
                "timestamp": d.created_at.isoformat() if d.created_at else None,
            })

    recent_activity.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

    # Sub-goals
    sub_goals = Goal.query.filter_by(parent_id=goal.id, workspace_id=workspace_id).all()

    return jsonify({
        "goal": goal.to_dict(),
        "tasks": [t.to_dict() for t in linked_tasks],
        "decisions": [d.to_dict() for d in linked_decisions],
        "sub_goals": [sg.to_dict() for sg in sub_goals],
        "source_meeting": source_meeting,
        "recent_activity": recent_activity[:20],
    })


@goals_bp.route('/goals/<int:goal_id>/breakdown', methods=['POST'])
@token_required
def break_down_goal(current_user_id, goal_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    goal = Goal.query.filter_by(id=goal_id, workspace_id=workspace_id).first()
    if not goal:
        return jsonify({"error": "Goal not found in this workspace"}), 404
    if goal.goal_type != 'weekly':
        return jsonify({"error": "Only weekly goals can be broken down into daily tasks"}), 400

    existing = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.goal_id == goal.id,
        Task.phase_tag == 'daily_bucket'
    ).count()
    if existing > 0:
        return jsonify({"error": "Goal already has daily task buckets. Clear or complete them first."}), 409

    now = datetime.utcnow()
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    created = []
    for offset in range(7):
        day_date = now + timedelta(days=offset)
        task = Task(
            title=f"{goal.title[:50]} — {day_names[day_date.weekday()]}",
            priority='P2',
            status='Not Started',
            goal_id=goal.id,
            phase_tag='daily_bucket',
            user_id=current_user_id,
            workspace_id=workspace_id
        )
        db.session.add(task)
        created.append(task.to_dict())

    db.session.commit()
    return jsonify({"message": f"Created {len(created)} daily task buckets", "tasks": created}), 201
