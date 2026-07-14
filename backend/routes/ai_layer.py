from flask import Blueprint, request, jsonify
from config.database import db
from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from models.recurring_workflow import RecurringWorkflow
from models.ai_feedback import AiFeedback
from models.workspace_member import WorkspaceMember
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from datetime import datetime, timedelta
from sqlalchemy import func

ai_bp = Blueprint('ai', __name__)


def _get_rejected_keys(workspace_id, suggestion_type=None):
    query = AiFeedback.query.filter_by(workspace_id=workspace_id, action='rejected')
    if suggestion_type:
        query = query.filter_by(suggestion_type=suggestion_type)
    return set(f.suggestion_key for f in query.all())


def _normalize_title(title):
    return title.lower().strip()


def _keyword_overlap(text_a, text_b):
    words_a = set(_normalize_title(text_a).split())
    words_b = set(_normalize_title(text_b).split())
    if not words_a or not words_b:
        return 0.0
    common = words_a & words_b
    return len(common) / max(len(words_a), len(words_b))


DECISION_KEYWORDS = ['choose', 'select', 'migrate', 'set pricing', 'adopt', 'decide', 'hire']
DECISION_PHRASES = ['we decided', 'agreed on', 'agreed to', 'decision:']
RISKY_KEYWORDS = ['oauth', 'legal', 'contract', 'investor', 'compliance', 'auth', 'migration',
                  'api', 'integration', 'review', 'coordinate', 'safe']


@ai_bp.route('/ai/insights', methods=['GET'])
@token_required
def get_insights(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    now = datetime.utcnow()
    rejected = {}
    for st in ['goal_binding', 'blocker_prediction', 'recurring_workflow', 'inferred_decision']:
        rejected[st] = _get_rejected_keys(workspace_id, st)

    weekly_goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.goal_type == 'weekly',
        Goal.status.in_(['pending', 'in_progress'])
    ).all()

    # ── Goal Binding ────────────────────────────────────────────────
    goal_binding = []
    unlinked_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.goal_id.is_(None),
        Task.status.notin_(['Done', 'Cancelled'])
    ).all()
    for t in unlinked_tasks:
        if str(t.id) in rejected['goal_binding']:
            continue
        best_goal = None
        best_score = 0.0
        for g in weekly_goals:
            title_score = _keyword_overlap(t.title, g.title)
            desc_score = _keyword_overlap(t.description or '', g.description or '') * 0.5
            combined = title_score + desc_score
            if combined > best_score:
                best_score = combined
                best_goal = g
        if best_goal and best_score > 0:
            goal_binding.append({
                "task_id": t.id,
                "task_title": t.title,
                "recommended_goal_id": best_goal.id,
                "recommended_goal_title": best_goal.title,
                "reason": f"Task '{t.title}' matches goal '{best_goal.title}'"
            })

    # ── Blocker Prediction ──────────────────────────────────────────
    blocker_prediction = []
    active_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status.notin_(['Done', 'Cancelled'])
    ).all()
    assignee_load = {}
    for t in active_tasks:
        if t.assignee_id:
            assignee_load[t.assignee_id] = assignee_load.get(t.assignee_id, 0) + 1
    for t in active_tasks:
        if str(t.id) in rejected['blocker_prediction']:
            continue
        reasons = []
        if t.priority == 'P0':
            reasons.append("P0 priority requires immediate attention")
        if t.assignee_id and assignee_load.get(t.assignee_id, 0) >= 3:
            reasons.append(f"Assignee has high load ({assignee_load[t.assignee_id]} active tasks)")
        if t.description:
            found_risks = [kw for kw in RISKY_KEYWORDS if kw in t.description.lower()]
            if found_risks:
                reasons.append(f"Risky keywords detected: {', '.join(found_risks)}")
        if reasons:
            blocker_prediction.append({
                "task_id": t.id,
                "title": t.title,
                "reason": "; ".join(reasons)
            })

    # ── Recurring Workflow Detection ────────────────────────────────
    recurring_workflow = []
    done_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == 'Done',
        Task.updated_at >= now - timedelta(days=30)
    ).order_by(Task.updated_at.desc()).all()
    title_groups = {}
    for t in done_tasks:
        key = _normalize_title(t.title)
        title_groups.setdefault(key, []).append(t)
    for norm_title, tasks in title_groups.items():
        if norm_title in rejected['recurring_workflow']:
            continue
        if len(tasks) >= 2:
            sorted_tasks = sorted(tasks, key=lambda x: x.updated_at)
            deltas = []
            for i in range(1, len(sorted_tasks)):
                delta = (sorted_tasks[i].updated_at - sorted_tasks[i-1].updated_at).days
                deltas.append(delta)
            if deltas:
                avg_delta = sum(deltas) / len(deltas)
                if 5 <= avg_delta <= 10:
                    freq = "weekly"
                    dow = sorted_tasks[-1].updated_at.weekday()
                    recurring_workflow.append({
                        "title": tasks[0].title,
                        "frequency": freq,
                        "day_of_week": dow,
                        "reason": f"Completed {len(tasks)} times in the last 30 days (avg {int(avg_delta)}d apart)"
                    })

    # ── Inferred Decisions ─────────────────────────────────────────
    inferred_decision = []
    last_decision = DecisionLog.query.filter_by(workspace_id=workspace_id).order_by(DecisionLog.created_at.desc()).first()
    if not last_decision or (now - last_decision.created_at).days >= 3:
        cutoff_7d = now - timedelta(days=7)
        recent_tasks = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.status == 'Done',
            Task.updated_at >= cutoff_7d,
            Task.linked_decision_id == None
        ).all()
        for t in recent_tasks:
            dec_text = f"We decided to {t.title.lower()}"
            if dec_text[:100] in rejected['inferred_decision']:
                continue
            if any(word in t.title.lower() for word in DECISION_KEYWORDS):
                inferred_decision.append({
                    "decision": dec_text,
                    "context": f"Drafted from completed task: '{t.title}'",
                    "source_type": "task",
                    "source_id": t.id
                })
        recent_meetings = MeetingNotes.query.filter(
            MeetingNotes.workspace_id == workspace_id,
            MeetingNotes.date >= cutoff_7d
        ).all()
        for m in recent_meetings:
            if m.summary:
                for line in m.summary.split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    if any(phrase in line.lower() for phrase in DECISION_PHRASES):
                        dec_text = line
                        if 'decision:' in dec_text.lower():
                            dec_text = dec_text.split('decision:', 1)[1].strip()
                        if dec_text[:100] in rejected['inferred_decision']:
                            continue
                        inferred_decision.append({
                            "decision": dec_text,
                            "context": f"Drafted from meeting notes: '{m.title}'",
                            "source_type": "meeting",
                            "source_id": m.id
                        })

    # ── Active Workflows ────────────────────────────────────────────
    workflows = RecurringWorkflow.query.filter_by(workspace_id=workspace_id).all()
    active_workflows = [w.to_dict() for w in workflows]

    return jsonify({
        "goal_binding": goal_binding,
        "blocker_prediction": blocker_prediction,
        "recurring_workflow": recurring_workflow,
        "inferred_decision": inferred_decision,
        "active_workflows": active_workflows
    })


VALID_SUGGESTION_TYPES = {'goal_binding', 'blocker_prediction', 'recurring_workflow', 'inferred_decision'}
VALID_ACTIONS = {'accepted', 'rejected', 'dismissed'}


@ai_bp.route('/ai/feedback', methods=['POST'])
@token_required
def submit_feedback(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    suggestion_type = data.get('suggestion_type')
    suggestion_key = str(data.get('suggestion_key', ''))
    action = data.get('action')

    if suggestion_type not in VALID_SUGGESTION_TYPES:
        return jsonify({"error": f"Invalid suggestion_type. Must be one of: {', '.join(sorted(VALID_SUGGESTION_TYPES))}"}), 400
    if action not in VALID_ACTIONS:
        return jsonify({"error": f"Invalid action. Must be one of: {', '.join(sorted(VALID_ACTIONS))}"}), 400
    if not suggestion_key:
        return jsonify({"error": "suggestion_key is required"}), 400

    feedback = AiFeedback(
        workspace_id=workspace_id,
        suggestion_type=suggestion_type,
        suggestion_key=suggestion_key,
        action=action
    )
    db.session.add(feedback)
    db.session.commit()

    return jsonify({"message": "Feedback recorded", "id": feedback.id}), 201


@ai_bp.route('/ai/workflows/create', methods=['POST'])
@token_required
def create_workflow(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({"error": "Title is required"}), 400

    frequency = data.get('frequency', 'weekly')
    if frequency not in ('weekly', 'monthly'):
        return jsonify({"error": "Invalid frequency. Must be 'weekly' or 'monthly'"}), 400

    day_of_week = data.get('day_of_week')
    day_of_month = data.get('day_of_month')

    if frequency == 'weekly':
        if day_of_week is None:
            return jsonify({"error": "day_of_week is required for weekly frequency (0-6)"}), 400
        try:
            day_of_week = int(day_of_week)
        except (TypeError, ValueError):
            return jsonify({"error": "day_of_week must be an integer 0-6"}), 400
        if day_of_week < 0 or day_of_week > 6:
            return jsonify({"error": "day_of_week must be between 0 and 6"}), 400
    else:
        if day_of_month is None:
            return jsonify({"error": "day_of_month is required for monthly frequency (1-31)"}), 400
        try:
            day_of_month = int(day_of_month)
        except (TypeError, ValueError):
            return jsonify({"error": "day_of_month must be an integer 1-31"}), 400
        if day_of_month < 1 or day_of_month > 31:
            return jsonify({"error": "day_of_month must be between 1 and 31"}), 400

    existing = RecurringWorkflow.query.filter_by(
        workspace_id=workspace_id,
        title=data['title']
    ).first()
    if existing:
        return jsonify({"error": "Workflow with this title already exists"}), 409

    wf = RecurringWorkflow(
        title=data['title'],
        description=data.get('description'),
        frequency=frequency,
        day_of_week=day_of_week if frequency == 'weekly' else None,
        day_of_month=day_of_month if frequency == 'monthly' else None,
        workspace_id=workspace_id
    )
    db.session.add(wf)
    db.session.commit()

    return jsonify(wf.to_dict()), 201


@ai_bp.route('/ai/workflows/trigger', methods=['POST'])
@token_required
def trigger_workflows(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    now = datetime.utcnow()
    today_weekday = now.weekday()
    today_day = now.day

    due = RecurringWorkflow.query.filter_by(workspace_id=workspace_id).all()
    generated = 0
    for wf in due:
        is_due = False
        if wf.frequency == 'weekly' and wf.day_of_week == today_weekday:
            is_due = True
        elif wf.frequency == 'monthly' and wf.day_of_month == today_day:
            is_due = True

        if not is_due:
            continue

        if wf.last_generated_at and wf.last_generated_at.date() == now.date():
            continue

        task = Task(
            title=wf.title,
            description=wf.description or f"Auto-generated from recurring workflow '{wf.title}'",
            priority='P2',
            status='Not Started',
            user_id=current_user_id,
            workspace_id=workspace_id
        )
        db.session.add(task)
        wf.last_generated_at = now
        generated += 1

    db.session.commit()

    return jsonify({"generated": generated, "message": f"Generated {generated} tasks from due workflows"}), 200


@ai_bp.route('/ai/decisions/confirm', methods=['POST'])
@token_required
def confirm_decision(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data or not data.get('decision'):
        return jsonify({"error": "Decision text is required"}), 400

    decision = DecisionLog(
        decision=data['decision'],
        context=data.get('context', ''),
        source=data.get('source_type', 'manual'),
        source_ref=str(data.get('source_id', '')) if data.get('source_id') else None,
        created_by=current_user_id,
        workspace_id=workspace_id
    )
    db.session.add(decision)
    db.session.commit()

    return jsonify(decision.to_dict()), 201
