from flask import Blueprint, jsonify, copy_current_request_context, request
from config.database import db
from models.task import Task
from models.goal import Goal
from models.blocker import Blocker
from models.follow_up import FollowUp
from models.meeting_notes import MeetingNotes
from models.decision_log import DecisionLog
from models.activity_event import ActivityEvent
from models.knowledge_item import KnowledgeItem
from sqlalchemy import case
from sqlalchemy.orm import load_only
from models.user_integration import UserIntegration
from models.workspace_member import WorkspaceMember
from models.workspace import Workspace
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from utils.mock_mode import mock_visibility_clause
from datetime import datetime, timedelta
import requests
import os
import threading

dashboard_bp = Blueprint('dashboard', __name__)

def _day_trunc(col):
    if db.engine.dialect.name == "sqlite":
        return db.func.strftime('%Y-%m-%d', col)
    return db.func.date_trunc('day', col)

def _day_key(value):
    if hasattr(value, "strftime"):
        return value.strftime('%Y-%m-%d')
    return str(value)

@dashboard_bp.route('/dashboard', methods=['GET'])
@token_required
def get_dashboard(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    now = datetime.utcnow()

    # Refresh activity feed in background — use separate session to avoid thread safety issues
    try:
        from services.activity_compiler import compile_activity_feed
        def _refresh_feed(wid):
            try:
                from config.database import db as _db
                _db.session.remove()
                compile_activity_feed(wid)
            except Exception as inner:
                print("Dashboard: activity compile thread error:", inner)
        t = threading.Thread(target=_refresh_feed, args=(workspace_id,), daemon=True)
        t.start()
    except Exception as e:
        print("Dashboard: data refresh failed:", e)

    # ─── Zone 1: Command Strip ────────────────────────────────────────
    # Active goal — prefer weekly with task links, fall back to any pending/in_progress goal
    active_goal = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.goal_type == 'weekly',
        Goal.status.in_(['pending', 'in_progress'])
    ).order_by(Goal.created_at.desc()).first()
    if active_goal:
        active_goal_tasks = Task.query.filter_by(workspace_id=workspace_id, goal_id=active_goal.id).count()
        # If the weekly goal has no direct tasks, promote its parent (monthly) as the active goal
        if active_goal_tasks == 0 and active_goal.parent_id:
            parent = Goal.query.get(active_goal.parent_id)
            if parent:
                active_goal = parent

    top_tasks = []
    if active_goal:
        goal_ids = [active_goal.id]
        if active_goal.goal_type == 'monthly':
            child_ids = db.session.query(Goal.id).filter(
                Goal.parent_id == active_goal.id
            ).all()
            goal_ids.extend([g[0] for g in child_ids])
        tasks_q = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.goal_id.in_(goal_ids),
            Task.priority.in_(['P0', 'P1']),
            Task.status.notin_(['Done', 'Cancelled'])
        ).order_by(Task.priority.asc(), Task.deadline.asc()).limit(5).all()
        top_tasks = [t.to_dict() for t in tasks_q]
    # If no goal-linked P0/P1 tasks exist, fall back to workspace-wide P0/P1 tasks
    if not top_tasks:
        workspace_p0p1 = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.priority.in_(['P0', 'P1']),
            Task.status.notin_(['Done', 'Cancelled'])
        ).order_by(Task.priority.asc(), Task.deadline.asc()).limit(5).all()
        top_tasks = [t.to_dict() for t in workspace_p0p1]

    # Calendar conflicts: Google Calendar events today
    calendar_conflicts = []
    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    connected_providers = {i.provider: i for i in integrations}
    if 'google' in connected_providers:
        connected_providers['google_calendar'] = connected_providers['google']
    google_cal = connected_providers.get('google_calendar')
    if google_cal and google_cal.access_token and not google_cal.access_token.startswith("mock_"):
        try:
            start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            headers = {"Authorization": f"Bearer {google_cal.access_token}"}
            cal_url = (
                f"https://www.googleapis.com/calendar/v3/calendars/primary/events"
                f"?timeMin={start_of_day.isoformat()}Z"
                f"&timeMax={end_of_day.isoformat()}Z"
                f"&orderBy=startTime&singleEvents=true"
            )
            cal_res = requests.get(cal_url, headers=headers, timeout=5)
            if cal_res.status_code == 200:
                items = cal_res.json().get('items', [])
                for ev in items:
                    s_dt = ev.get('start', {}).get('dateTime') or ev.get('start', {}).get('date')
                    e_dt = ev.get('end', {}).get('dateTime') or ev.get('end', {}).get('date')
                    meet_link = None
                    if ev.get('conferenceData') and ev['conferenceData'].get('entryPoints'):
                        for ep in ev['conferenceData']['entryPoints']:
                            if ep.get('entryPointType') == 'video':
                                meet_link = ep.get('uri')
                                break
                    calendar_conflicts.append({
                        "title": ev.get('summary', 'Untitled'),
                        "start": s_dt,
                        "end": e_dt,
                        "meet_link": meet_link
                    })
        except Exception as e:
            print("Dashboard: Failed to fetch calendar events:", e)

    # ─── Zone 2: Priority Signal Board ────────────────────────────────
    # Blocker model records (open)
    blocker_records = Blocker.query.filter_by(
        workspace_id=workspace_id,
        status='open'
    ).order_by(Blocker.created_at.desc()).all()
    task_ids = [b.task_id for b in blocker_records if b.task_id]
    tasks_map = {}
    if task_ids:
        tasks = Task.query.filter(Task.id.in_(task_ids)).all()
        tasks_map = {t.id: t for t in tasks}
    blockers = []
    for b in blocker_records:
        bd = b.to_dict()
        if b.source_integration:
            bd['source_label'] = f"via {b.source_integration}"
        elif b.source_provider:
            bd['source_label'] = f"via {b.source_provider}"
        else:
            bd['source_label'] = None
        if b.task_id and b.task_id in tasks_map:
            bd['task_title'] = tasks_map[b.task_id].title
        blockers.append(bd)

    # Blocked tasks (24h+ rule, fallback for tasks with blocker_description but no Blocker row)
    blocked_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.blocked_at.isnot(None),
        Task.blocked_at <= now - timedelta(hours=24),
        Task.status.notin_(['Done', 'Cancelled'])
    ).all()
    for t in blocked_tasks:
        if not any(b.get('task_id') == t.id for b in blockers):
            blockers.append({
                "task_id": t.id,
                "title": t.title,
                "blocker_description": t.blocker_description,
                "blocked_at": t.blocked_at.isoformat() if t.blocked_at else None,
                "hours_blocked": int((now - t.blocked_at).total_seconds() / 3600.0),
                "source_label": None
            })

    # Overdue follow-ups
    overdue_followups = []
    pending_fus = FollowUp.query.filter_by(workspace_id=workspace_id, status='pending').all()
    today = now.date()
    for fu in pending_fus:
        last_contact = fu.last_contact_date.date() if fu.last_contact_date else None
        followup_due = fu.followup_date.date() if fu.followup_date else None
        is_overdue = False
        if last_contact and last_contact <= today - timedelta(days=3):
            is_overdue = True
        if followup_due and followup_due < today:
            is_overdue = True
        if is_overdue:
            overdue_followups.append(fu.to_dict())

    # AI-inferred decisions awaiting confirmation
    inferred_decisions = []
    cutoff_7d = now - timedelta(days=7)
    recent_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == 'Done',
        Task.updated_at >= cutoff_7d,
        Task.linked_decision_id == None
    ).all()
    for t in recent_tasks:
        if any(word in t.title.lower() for word in ['choose', 'select', 'migrate', 'adopt', 'decide', 'hire', 'approve', 'plan']):
            inferred_decisions.append({
                "decision": f"We decided to {t.title.lower()}",
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
            lines = [l.strip() for l in m.summary.split('\n') if l.strip()]
            for line in lines:
                if any(phrase in line.lower() for phrase in ['we decided', 'decided', 'agreed on', 'agreed to', 'decision:', 'approved']):
                    dec_text = line
                    if 'decision:' in dec_text.lower():
                        dec_text = dec_text.split('decision:')[1].strip()
                    inferred_decisions.append({
                        "decision": dec_text,
                        "context": f"Drafted from meeting notes: '{m.title}'",
                        "source_type": "meeting",
                        "source_id": m.id
                    })

    # Active tasks count for workload context (with per-priority breakdown)
    active_task_count = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status.notin_(['Done', 'Cancelled'])
    ).count()
    p0_count = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.priority == 'P0',
        Task.status.notin_(['Done', 'Cancelled'])
    ).count()
    p1_count = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.priority == 'P1',
        Task.status.notin_(['Done', 'Cancelled'])
    ).count()

    # Real completed-this-week data for Velocity Trend chart
    week_ago = now - timedelta(days=7)
    completed_this_week = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == 'Done',
        Task.completed_at >= week_ago,
    ).count()
    daily_counts = db.session.query(
        _day_trunc(Task.completed_at).label('day'),
        db.func.count(Task.id)
    ).filter(
        Task.workspace_id == workspace_id,
        Task.status == 'Done',
        Task.completed_at >= week_ago,
    ).group_by(
        _day_trunc(Task.completed_at)
    ).all()
    counts_by_day = {_day_key(row[0]): row[1] for row in daily_counts}
    completion_data_points = [
        counts_by_day.get((now - timedelta(days=i)).strftime('%Y-%m-%d'), 0)
        for i in range(6, -1, -1)
    ]

    # ─── Zone 3: Right Sidebar ───────────────────────────────────────
    # Today's meetings with prep notes
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    todays_meetings = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == workspace_id,
        MeetingNotes.date >= today_start,
        MeetingNotes.date < today_end
    ).order_by(MeetingNotes.date.asc()).all()

    # Last 3 decisions (action-needed first, then by confidence, then newest)
    priority_order = case(
        (DecisionLog.ai_status == 'pending_confirmation', 0),
        (DecisionLog.ai_status == 'confirmed', 1),
        (DecisionLog.ai_status == 'dismissed', 2),
        else_=3
    )
    recent_decisions = DecisionLog.query.filter_by(
        workspace_id=workspace_id
    ).order_by(
        priority_order,
        DecisionLog.confidence_score.desc().nullslast(),
        DecisionLog.created_at.desc()
    ).limit(3).all()

    # Integration digest: count ActivityEvents by provider (last 24h, non-mock)
    digest_start = now - timedelta(hours=24)
    digest_rows = db.session.query(
        ActivityEvent.provider,
        db.func.count(ActivityEvent.id)
    ).filter(
        ActivityEvent.workspace_id == workspace_id,
        mock_visibility_clause(workspace_id),
        ActivityEvent.external_timestamp >= digest_start
    ).group_by(ActivityEvent.provider).all()
    integration_digest = {row[0]: row[1] for row in digest_rows if row[0] not in ('posthog', 'mixpanel', 'amplitude')}

    # ─── Zone 4: Needs Attention Digest ───────────────────────────
    at_risk_goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status == 'at_risk'
    ).options(load_only(Goal.id, Goal.title)).count()
    overdue_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.deadline < now,
        Task.deadline.isnot(None),
        Task.status.notin_(['Done', 'Cancelled'])
    ).count()
    critical_fus = FollowUp.query.filter(
        FollowUp.workspace_id == workspace_id,
        FollowUp.status == 'pending',
        FollowUp.priority.in_(['critical', 'high'])
    ).count()
    old_blockers = Blocker.query.filter(
        Blocker.workspace_id == workspace_id,
        Blocker.status == 'open',
        Blocker.created_at < now - timedelta(days=7)
    ).count()
    needs_review_ki = KnowledgeItem.query.filter_by(
        workspace_id=workspace_id,
        review_flag='needs_review'
    ).count()
    attention_digest = {
        "goals_at_risk": at_risk_goals,
        "tasks_overdue": overdue_tasks,
        "follow_ups_critical": critical_fus,
        "blockers_old": old_blockers,
        "knowledge_needs_review": needs_review_ki,
        "total": at_risk_goals + overdue_tasks + critical_fus + old_blockers + needs_review_ki,
    }

    response = {
        "command_strip": {
            "active_goal": active_goal.to_dict() if active_goal else None,
            "top_tasks": top_tasks,
            "calendar_conflicts": calendar_conflicts
        },
        "signal_board": {
            "blockers": blockers,
            "overdue_followups": overdue_followups,
            "inferred_decisions": inferred_decisions,
            "active_task_count": active_task_count,
            "p0_count": p0_count,
            "p1_count": p1_count,
            "completed_this_week": completed_this_week,
            "completion_data_points": completion_data_points,
        },
        "sidebar": {
            "todays_meetings": [m.to_dict() for m in todays_meetings],
            "recent_decisions": [d.to_dict() for d in recent_decisions],
            "integration_digest": integration_digest
        },
        "attention_digest": attention_digest
    }
    return jsonify(response)

@dashboard_bp.route('/blockers/<int:blocker_id>', methods=['PUT'])
@token_required
def update_blocker(current_user_id, blocker_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json(silent=True) or {}
    blocker = Blocker.query.filter_by(id=blocker_id, workspace_id=workspace_id).first()
    if not blocker:
        return jsonify({"error": "Blocker not found"}), 404

    new_status = data.get('status')
    if new_status and new_status in ('open', 'resolved'):
        blocker.status = new_status
        if new_status == 'resolved':
            blocker.resolved_at = datetime.utcnow()
        db.session.commit()

    return jsonify(blocker.to_dict())


@dashboard_bp.route('/blockers', methods=['GET'])
@token_required
def get_blockers(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    now = datetime.utcnow()

    # Blocker model records (open)
    blocker_records = Blocker.query.filter_by(
        workspace_id=workspace_id,
        status='open'
    ).order_by(Blocker.created_at.desc()).all()
    task_ids = [b.task_id for b in blocker_records if b.task_id]
    tasks_map = {}
    if task_ids:
        tasks = Task.query.filter(Task.id.in_(task_ids)).all()
        tasks_map = {t.id: t for t in tasks}
    blockers = []
    for b in blocker_records:
        bd = b.to_dict()
        if b.source_integration:
            bd['source_label'] = f"via {b.source_integration}"
        elif b.source_provider:
            bd['source_label'] = f"via {b.source_provider}"
        else:
            bd['source_label'] = None
        if b.task_id and b.task_id in tasks_map:
            bd['task_title'] = tasks_map[b.task_id].title
            bd['task_status'] = tasks_map[b.task_id].status
            bd['task_priority'] = tasks_map[b.task_id].priority
        blockers.append(bd)

    # Blocked tasks (24h+ rule, fallback for tasks with blocker_description but no Blocker row)
    blocked_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.blocked_at.isnot(None),
        Task.blocked_at <= now - timedelta(hours=24),
        Task.status.notin_(['Done', 'Cancelled'])
    ).all()
    for t in blocked_tasks:
        if not any(b.get('task_id') == t.id for b in blockers):
            blockers.append({
                "task_id": t.id,
                "title": t.title,
                "blocker_description": t.blocker_description,
                "blocked_at": t.blocked_at.isoformat() if t.blocked_at else None,
                "hours_blocked": int((now - t.blocked_at).total_seconds() / 3600.0),
                "source_label": None,
                "severity": "medium",
                "status": "open",
            })

    return jsonify(blockers)
