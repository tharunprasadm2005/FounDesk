from flask import Blueprint, request, jsonify
from config.database import db
from models.task import Task
from models.chronicle_event import ChronicleEvent
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from datetime import datetime

tasks_bp = Blueprint('tasks', __name__)

@tasks_bp.route('/tasks', methods=['GET'])
@token_required
def get_tasks(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    flat = request.args.get('flat', 'false').lower() == 'true'
    status = request.args.get('status')
    priority = request.args.get('priority')
    goal_id = request.args.get('goal_id')
    source = request.args.get('source')
    
    query = Task.query.filter_by(workspace_id=workspace_id)
    
    if status:
        query = query.filter_by(status=status)
    if priority:
        query = query.filter_by(priority=priority)
    if goal_id:
        query = query.filter_by(goal_id=goal_id)
    if source:
        query = query.filter_by(source=source)
        
    if not flat and not status and not priority and not goal_id and not source:
        # Return only top-level tasks; sub_tasks are nested recursively
        tasks = query.filter_by(parent_id=None).order_by(Task.created_at.desc()).all()
    else:
        tasks = query.order_by(Task.created_at.desc()).all()
        
    return jsonify([t.to_dict() for t in tasks])

@tasks_bp.route('/tasks', methods=['POST'])
@token_required
def create_task(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({"error": "Title is required"}), 400
        
    deadline = None
    if data.get('deadline'):
        try:
            date_str = data.get('deadline').replace('Z', '+00:00')
            deadline = datetime.fromisoformat(date_str)
        except Exception:
            pass
            
    # Auto-calculate blocker timestamp
    status = data.get('status', 'Not Started')
    blocked_at = datetime.utcnow() if status == 'Blocked' else None
    started_at = datetime.utcnow() if status == 'In Progress' else None
    
    # Check if a new assignee is set (which means is_seen must be False)
    assignee_id = data.get('assignee_id')
    if assignee_id == '':
        assignee_id = None
    else:
        assignee_id = int(assignee_id) if assignee_id is not None else None

    task = Task(
        title=data.get('title'),
        description=data.get('description'),
        priority=data.get('priority', 'P2'),
        status=status,
        deadline=deadline,
        assignee_id=assignee_id,
        goal_id=data.get('goal_id') if data.get('goal_id') != '' else None,
        parent_id=data.get('parent_id') if data.get('parent_id') != '' else None,
        blocked_at=blocked_at,
        blocker_description=data.get('blocker_description'),
        estimated_hours=data.get('estimated_hours') if data.get('estimated_hours') != '' else None,
        started_at=started_at,
        phase_tag=data.get('phase_tag'),
        is_seen=False,  # Explicitly set to false at creation time
        linked_decision_id=data.get('linked_decision_id') if data.get('linked_decision_id') != '' else None,
        linked_meeting_id=data.get('linked_meeting_id') if data.get('linked_meeting_id') != '' else None,
        user_id=current_user_id,
        workspace_id=workspace_id
    )
    
    # Save many-to-many related tasks link
    linked_task_ids = data.get('linked_task_ids', [])
    if linked_task_ids:
        related = Task.query.filter(Task.id.in_(linked_task_ids)).all()
        task.related_tasks.extend(related)
        
    db.session.add(task)
    db.session.commit()
    
    return jsonify(task.to_dict()), 201

@tasks_bp.route('/tasks/<int:task_id>', methods=['PUT'])
@token_required
def update_task(current_user_id, task_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    task = Task.query.filter_by(id=task_id, workspace_id=workspace_id).first()
    if not task:
        return jsonify({"error": "Task not found in this workspace"}), 404
        
    data = request.get_json()
    if not data:
        return jsonify({"error": "No update data provided"}), 400
        
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'priority' in data:
        task.priority = data['priority']
        
    # Auto-sync status, started_at, blocked_at
    if 'status' in data:
        old_status = task.status
        new_status = data['status']
        task.status = new_status
        
        if new_status == 'Done' and old_status != 'Done':
            task.completed_at = datetime.utcnow()
        elif new_status != 'Done' and old_status == 'Done':
            task.completed_at = None
        if new_status == 'Blocked' and old_status != 'Blocked':
            task.blocked_at = datetime.utcnow()
        elif new_status == 'In Progress' and old_status != 'In Progress':
            if task.started_at is None:
                task.started_at = datetime.utcnow()
        if new_status != 'Blocked':
            task.blocked_at = None
            
    if 'deadline' in data:
        if data['deadline']:
            try:
                date_str = data['deadline'].replace('Z', '+00:00')
                task.deadline = datetime.fromisoformat(date_str)
            except Exception:
                pass
        else:
            task.deadline = None
            
    if 'goal_id' in data:
        task.goal_id = data['goal_id'] if data['goal_id'] != '' else None
    if 'parent_id' in data:
        task.parent_id = data['parent_id'] if data['parent_id'] != '' else None
    if 'blocker_description' in data:
        task.blocker_description = data['blocker_description']
    if 'estimated_hours' in data:
        task.estimated_hours = int(data['estimated_hours']) if data['estimated_hours'] != '' else None
    if 'phase_tag' in data:
        task.phase_tag = data['phase_tag']
    if 'is_seen' in data:
        task.is_seen = bool(data['is_seen'])
    if 'linked_decision_id' in data:
        task.linked_decision_id = data['linked_decision_id'] if data['linked_decision_id'] != '' else None
    if 'linked_meeting_id' in data:
        task.linked_meeting_id = data['linked_meeting_id'] if data['linked_meeting_id'] != '' else None
        
    # Handle assignee changes (reset is_seen)
    if 'assignee_id' in data:
        new_assignee_id = data['assignee_id']
        if new_assignee_id == '':
            new_assignee_id = None
        else:
            new_assignee_id = int(new_assignee_id) if new_assignee_id is not None else None
            
        if task.assignee_id != new_assignee_id:
            task.assignee_id = new_assignee_id
            task.is_seen = False
            
    # Handle many-to-many task linking
    if 'linked_task_ids' in data:
        task.related_tasks = []
        linked_ids = data['linked_task_ids']
        if linked_ids:
            related = Task.query.filter(Task.id.in_(linked_ids)).all()
            task.related_tasks.extend(related)
            
    # Touch updated_at time
    task.updated_at = datetime.utcnow()

    # Create chronicle event on task completion
    if 'status' in data and data['status'] in ('Done', 'Completed') and old_status not in ('Done', 'Completed'):
        from models.workspace import Workspace
        ws = Workspace.query.get(workspace_id)
        chronicle = ChronicleEvent(
            workspace_id=workspace_id,
            event_type="task_completed",
            title=f"Task Completed: {task.title}",
            description=f"Task \"{task.title}\" was marked as {data['status']}.",
            stage=ws.stage if ws else "Think",
            user_id=current_user_id,
            source_type="task",
            source_id=task.id,
            meta_data={"priority": task.priority, "assignee_id": task.assignee_id}
        )
        db.session.add(chronicle)

    db.session.commit()
    return jsonify(task.to_dict())

@tasks_bp.route('/tasks/<int:task_id>/detail', methods=['GET'])
@token_required
def get_task_detail(current_user_id, task_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    task = Task.query.filter_by(id=task_id, workspace_id=workspace_id).first()
    if not task:
        return jsonify({"error": "Task not found"}), 404

    result = task.to_dict()

    # Resolve linked decision
    if task.linked_decision_id:
        from models.decision_log import DecisionLog
        decision = DecisionLog.query.get(task.linked_decision_id)
        result['linked_decision'] = decision.to_dict() if decision else None

    # Resolve linked meeting
    if task.linked_meeting_id:
        from models.meeting_notes import MeetingNotes
        meeting = MeetingNotes.query.get(task.linked_meeting_id)
        result['linked_meeting'] = meeting.to_dict() if meeting else None

    # Resolve linked tasks
    if task.related_tasks:
        result['linked_tasks'] = [t.to_dict() for t in task.related_tasks]

    # Resolve goal
    if task.goal_id:
        from models.goal import Goal
        goal = Goal.query.get(task.goal_id)
        result['goal'] = goal.to_dict() if goal else None

    # Resolve parent
    if task.parent_id:
        parent = Task.query.get(task.parent_id)
        result['parent_task'] = parent.to_dict() if parent else None

    # Assignee name
    if task.assignee_id:
        from models.user import User
        user = User.query.get(task.assignee_id)
        result['assignee_name'] = user.name if user else None

    return jsonify(result)

@tasks_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@token_required
def delete_task(current_user_id, task_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    task = Task.query.filter_by(id=task_id, workspace_id=workspace_id).first()
    if not task:
        return jsonify({"error": "Task not found in this workspace"}), 404
        
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"})

@tasks_bp.route('/tasks/suggest-context', methods=['POST'])
@token_required
def suggest_context(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    title = (data.get('title') or '').lower()
    description = (data.get('description') or '').lower()
    combined = f"{title} {description}"
    words = set(combined.split())

    from models.decision_log import DecisionLog
    from models.meeting_notes import MeetingNotes
    from models.goal import Goal

    suggestions = []

    goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status.in_(['pending', 'in_progress'])
    ).all()
    for g in goals:
        g_words = set(f"{g.title} {g.description or ''}".lower().split())
        if words & g_words:
            suggestions.append({
                "type": "goal",
                "id": g.id,
                "title": g.title,
                "reason": "Task content matches this goal"
            })

    decisions = DecisionLog.query.filter_by(workspace_id=workspace_id).order_by(DecisionLog.created_at.desc()).limit(10).all()
    for d in decisions:
        d_words = set(f"{d.decision} {d.context or ''}".lower().split())
        if words & d_words:
            suggestions.append({
                "type": "decision",
                "id": d.id,
                "title": d.decision[:80],
                "reason": "Task content relates to this decision"
            })

    meetings = MeetingNotes.query.filter_by(workspace_id=workspace_id).order_by(MeetingNotes.date.desc()).limit(20).all()
    for m in meetings:
        m_words = set(f"{m.title} {m.summary or ''}".lower().split())
        if words & m_words:
            suggestions.append({
                "type": "meeting",
                "id": m.id,
                "title": m.title,
                "reason": "Task content relates to this meeting"
            })

    return jsonify(suggestions[:10])
