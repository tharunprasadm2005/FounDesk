import json
from datetime import datetime, timedelta
from config.database import db
from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.blocker import Blocker
from models.meeting_notes import MeetingNotes
from models.standup import Standup
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.activity_event import ActivityEvent
from sqlalchemy.exc import OperationalError

from .utils import _get_workspace_creator


def _compile_daily_briefing(workspace_id, user_id):
    """Deterministic compiler: gathers all relevant records for a user's daily briefing.
    Every record is selected by code, not by the LLM.
    Returns a structured dict with source IDs for full traceability."""
    from models.standup import Standup
    from models.activity_event import ActivityEvent
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start

    compiled = {
        "yesterday": {},
        "today": {},
        "risks": {},
        "business": {},
        "source_refs": {
            "task_ids": [],
            "blocker_ids": [],
            "meeting_ids": [],
            "decision_ids": [],
            "goal_ids": [],
            "activity_ids": [],
        },
        "summary": "",
    }

    # \u2500\u2500 TASKS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    # Completed yesterday
    completed_yesterday = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "Done",
        Task.updated_at >= yesterday_start,
        Task.updated_at < yesterday_end,
    ).order_by(Task.updated_at.desc()).all()

    # In progress
    in_progress = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "In Progress",
    ).order_by(Task.priority.asc(), Task.deadline.asc().nullslast()).limit(10).all()

    # Overdue
    overdue_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.deadline < now,
        Task.deadline.isnot(None),
        Task.status.notin_(["Done", "Cancelled"]),
    ).order_by(Task.deadline.asc()).all()

    # Blocked
    blocked_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "Blocked",
    ).all()

    # Due today
    due_today = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.deadline >= today_start,
        Task.deadline < today_start + timedelta(days=1),
        Task.status.notin_(["Done", "Cancelled"]),
    ).all()

    compiled["yesterday"]["completed_tasks"] = [
        {"id": t.id, "title": t.title, "source": t.source}
        for t in completed_yesterday
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in completed_yesterday)

    compiled["today"]["priority_tasks"] = [
        {"id": t.id, "title": t.title, "priority": t.priority, "status": t.status, "deadline": t.deadline.isoformat() if t.deadline else None}
        for t in in_progress
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in in_progress)

    compiled["today"]["due_today"] = [
        {"id": t.id, "title": t.title, "priority": t.priority}
        for t in due_today
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in due_today)

    compiled["risks"]["overdue_tasks"] = [
        {"id": t.id, "title": t.title, "deadline": t.deadline.isoformat() if t.deadline else None, "days_overdue": (now - t.deadline).days if t.deadline else 0}
        for t in overdue_tasks
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in overdue_tasks)

    compiled["risks"]["blocked_tasks"] = [
        {"id": t.id, "title": t.title, "blocker_description": t.blocker_description}
        for t in blocked_tasks
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in blocked_tasks)

    # \u2500\u2500 BLOCKERS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    open_blockers = Blocker.query.filter_by(
        workspace_id=workspace_id,
        status="open",
    ).order_by(
        db.case((Blocker.severity == "high", 0), (Blocker.severity == "medium", 1), else_=2),
        Blocker.created_at.asc(),
    ).all()

    compiled["risks"]["blockers"] = []
    for b in open_blockers:
        entry = {
            "id": b.id,
            "title": b.title,
            "severity": b.severity,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "age_days": (now - b.created_at).days if b.created_at else 0,
            "source_integration": b.source_integration,
        }
        if b.task_id:
            task = Task.query.get(b.task_id)
            if task:
                entry["linked_task"] = {"id": task.id, "title": task.title}
        compiled["risks"]["blockers"].append(entry)
        compiled["source_refs"]["blocker_ids"].append(b.id)

    # \u2500\u2500 MEETINGS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    meetings_yesterday = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == workspace_id,
        MeetingNotes.date >= yesterday_start,
        MeetingNotes.date < yesterday_end,
    ).order_by(MeetingNotes.date.desc()).all()

    meetings_today = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == workspace_id,
        MeetingNotes.date >= today_start,
        MeetingNotes.date < today_start + timedelta(days=1),
    ).order_by(MeetingNotes.date.asc()).all()

    compiled["yesterday"]["meetings"] = [
        {"id": m.id, "title": m.title, "attendees": m.attendees, "action_items": m.action_items}
        for m in meetings_yesterday
    ]
    compiled["source_refs"]["meeting_ids"].extend(m.id for m in meetings_yesterday)

    compiled["today"]["upcoming_meetings"] = [
        {"id": m.id, "title": m.title, "attendees": m.attendees, "action_items": m.action_items}
        for m in meetings_today
    ]
    compiled["source_refs"]["meeting_ids"].extend(m.id for m in meetings_today)

    # \u2500\u2500 DECISIONS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    decisions_yesterday = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        DecisionLog.created_at >= yesterday_start,
        DecisionLog.created_at < yesterday_end,
    ).order_by(DecisionLog.confidence_score.desc().nullslast(), DecisionLog.created_at.desc()).all()

    unresolved_decisions = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        DecisionLog.ai_status == "pending_confirmation",
    ).order_by(DecisionLog.confidence_score.desc().nullslast(), DecisionLog.created_at.desc()).limit(5).all()

    compiled["yesterday"]["decisions"] = [
        {"id": d.id, "title": d.decision, "confidence": d.confidence_score, "status": d.ai_status}
        for d in decisions_yesterday
    ]
    compiled["source_refs"]["decision_ids"].extend(d.id for d in decisions_yesterday)

    compiled["risks"]["unresolved_decisions"] = [
        {"id": d.id, "title": d.decision, "confidence": d.confidence_score}
        for d in unresolved_decisions if d.id not in compiled["source_refs"]["decision_ids"]
    ]
    compiled["source_refs"]["decision_ids"].extend(d.id for d in unresolved_decisions)

    # \u2500\u2500 GOALS \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    all_goals = Goal.query.filter_by(workspace_id=workspace_id).filter(Goal.status != "duplicate").all()

    goals_progressed = []
    goals_at_risk = []
    goals_completed = []
    for g in all_goals:
        goal_completed_time = g.confirmed_at or g.created_at
        if g.status == "completed" and goal_completed_time and goal_completed_time >= yesterday_start:
            goals_completed.append(g)
        if g.status == "at_risk":
            goals_at_risk.append(g)
        if g.status in ("in_progress", "pending"):
            linked_tasks = Task.query.filter_by(goal_id=g.id, workspace_id=workspace_id).all()
            total = len(linked_tasks)
            done = sum(1 for t in linked_tasks if t.status == "Done")
            progress = round((done / total) * 100) if total > 0 else 0
            goals_progressed.append(g)

    compiled["yesterday"]["goals_completed"] = [
        {"id": g.id, "title": g.title}
        for g in goals_completed
    ]
    compiled["source_refs"]["goal_ids"].extend(g.id for g in goals_completed)

    compiled["today"]["goal_progress"] = [
        {"id": g.id, "title": g.title, "status": g.status}
        for g in goals_progressed
    ]
    compiled["source_refs"]["goal_ids"].extend(g.id for g in goals_progressed)

    compiled["risks"]["goals_at_risk"] = [
        {"id": g.id, "title": g.title}
        for g in goals_at_risk
    ]
    compiled["source_refs"]["goal_ids"].extend(g.id for g in goals_at_risk)

    # \u2500\u2500 CRM \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    crm_providers = ("hubspot", "pipedrive", "zoho_crm")
    recent_crm = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider.in_(crm_providers),
        ActivityEvent.external_timestamp >= yesterday_start,
        ActivityEvent.external_timestamp < yesterday_end,
    ).order_by(ActivityEvent.external_timestamp.desc()).limit(10).all()

    compiled["business"]["crm_updates"] = [
        {"id": ae.id, "title": ae.title, "provider": ae.provider, "details": ae.details}
        for ae in recent_crm
    ]
    compiled["source_refs"]["activity_ids"].extend(ae.id for ae in recent_crm)

    # \u2500\u2500 Important recent emails (non-newsletter, non-automated) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    important_emails = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider == "gmail",
        ActivityEvent.external_timestamp >= yesterday_start,
        ActivityEvent.external_timestamp < yesterday_end,
    ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()

    compiled["business"]["important_emails"] = [
        {"id": ae.id, "title": ae.title, "actor": ae.actor}
        for ae in important_emails
    ]
    compiled["source_refs"]["activity_ids"].extend(ae.id for ae in important_emails)

    return compiled


def _generate_standup_from_compiled(workspace_id, user_id):
    """Generate a daily briefing from compiled data, with optional LLM rewrite."""
    from models.standup import Standup
    import json

    today = datetime.utcnow().strftime("%Y-%m-%d")

    existing = Standup.query.filter_by(
        user_id=user_id,
        workspace_id=workspace_id,
        date=today,
    ).first()
    if existing:
        return

    compiled = _compile_daily_briefing(workspace_id, user_id)

    # Build the three text fields from compiled data
    yesterday_lines = []
    if compiled["yesterday"].get("completed_tasks"):
        yesterday_lines.append("Completed:")
        for t in compiled["yesterday"]["completed_tasks"]:
            yesterday_lines.append(f"  - {t['title']}")
    if compiled["yesterday"].get("meetings"):
        yesterday_lines.append("Meetings:")
        for m in compiled["yesterday"]["meetings"]:
            yesterday_lines.append(f"  - {m['title']}")
    if compiled["yesterday"].get("decisions"):
        yesterday_lines.append("Decisions:")
        for d in compiled["yesterday"]["decisions"]:
            yesterday_lines.append(f"  - {d['title']}")
    q1 = "\n".join(yesterday_lines) if yesterday_lines else "No recorded activity yesterday."

    today_lines = []
    if compiled["today"].get("priority_tasks"):
        today_lines.append("Priority work:")
        for t in compiled["today"]["priority_tasks"][:5]:
            today_lines.append(f"  - {t['title']} ({t['priority']})")
    if compiled["today"].get("due_today"):
        today_lines.append("Due today:")
        for t in compiled["today"]["due_today"]:
            today_lines.append(f"  - {t['title']}")
    if compiled["today"].get("upcoming_meetings"):
        today_lines.append("Meetings:")
        for m in compiled["today"]["upcoming_meetings"]:
            today_lines.append(f"  - {m['title']}")
    q2 = "\n".join(today_lines) if today_lines else "No planned work."

    risk_lines = []
    if compiled["risks"].get("blockers"):
        risk_lines.append("Blockers:")
        for b in compiled["risks"]["blockers"]:
            if "untitled" in b["title"].lower():
                print(f"[STANDUP] Skipping untitled blocker: '{b['title']}'")
                continue
            age = f" ({b['age_days']}d old)" if b["age_days"] > 0 else ""
            risk_lines.append(f"  - [{b['severity'].upper()}] {b['title']}{age}")
    if compiled["risks"].get("overdue_tasks"):
        risk_lines.append("Overdue:")
        for t in compiled["risks"]["overdue_tasks"][:5]:
            risk_lines.append(f"  - {t['title']} ({t['days_overdue']}d overdue)")
    if compiled["risks"].get("goals_at_risk"):
        risk_lines.append("Goals at risk:")
        for g in compiled["risks"]["goals_at_risk"]:
            risk_lines.append(f"  - {g['title']}")
    q3 = "\n".join(risk_lines) if risk_lines else "No blockers or risks."

    # Attempt LLM rewrite of the compiled data
    llm_summary = ""
    try:
        from pattern_engine.extraction import rewrite_standup_narrative
        llm_summary = rewrite_standup_narrative(compiled)
    except Exception as e:
        print(f"[STANDUP] LLM rewrite failed (non-fatal): {e}")

    compiled["summary"] = llm_summary

    standup = Standup(
        user_id=user_id,
        workspace_id=workspace_id,
        date=today,
        q1_yesterday=q1,
        q2_today=q2,
        q3_blockers=q3,
        compiled_json=json.dumps(compiled),
    )
    db.session.add(standup)
    db.session.commit()
    print(f"[STANDUP] Generated daily briefing for user {user_id} (ws={workspace_id})")
    total_records = sum(len(v) for v in compiled["source_refs"].values())
    print(f"[STANDUP]   Sources: {total_records} records from {len([k for k, v in compiled['source_refs'].items() if v])} categories")


def _auto_standup_for_all_members(workspace_id):
    """Generate standup briefings for all active members who haven't submitted today."""
    from models.standup import Standup
    from models.workspace_member import WorkspaceMember
    today = datetime.utcnow().strftime("%Y-%m-%d")
    created = 0

    members = WorkspaceMember.query.filter_by(workspace_id=workspace_id, status="active").all()
    for m in members:
        if m.user_id is None:
            continue
        existing = Standup.query.filter_by(
            user_id=m.user_id,
            workspace_id=workspace_id,
            date=today,
        ).first()
        if existing:
            continue
        _generate_standup_from_compiled(workspace_id, m.user_id)
        created += 1

    if created:
        db.session.commit()
        print(f"[STANDUP] Auto-generated {created} briefings for ws={workspace_id}")


def _cross_link_standup_blockers(workspace_id):
    """Link standup q3_blockers text to actual Blocker records.
    If a standup mentions a blocker by title, link it. If no matching blocker
    exists and the text is clearly a blocker, create one."""
    from models.standup import Standup
    from difflib import SequenceMatcher
    today = datetime.utcnow().strftime("%Y-%m-%d")
    standups = Standup.query.filter_by(workspace_id=workspace_id, date=today).all()
    open_blockers = Blocker.query.filter_by(workspace_id=workspace_id, status="open").all()
    linked = 0

    for s in standups:
        if not s.q3_blockers or s.q3_blockers.strip() in ("No blockers.", ""):
            continue
        blocker_text = s.q3_blockers.lower()
        matched = False
        for b in open_blockers:
            if b.title.lower() in blocker_text or SequenceMatcher(None, b.title.lower(), blocker_text[:len(b.title)]).ratio() > 0.6:
                matched = True
                break
        if not matched:
            for line in s.q3_blockers.split("\n"):
                line = line.strip().lstrip("- ").strip()
                if "untitled" in line.lower():
                    print(f"[STANDUP] Skipping untitled line: '{line[:40]}'")
                    continue
                if line and len(line) > 10 and line.lower() not in ("no blockers.", "no blockers", ""):
                    existing = Blocker.query.filter_by(workspace_id=workspace_id, title=line[:255], status="open").first()
                    if not existing:
                        blocker = Blocker(
                            workspace_id=workspace_id,
                            title=line[:255],
                            description=f"From standup #{s.id} (user {s.user_id})",
                            severity="medium",
                            status="open",
                            source_integration="standup",
                        )
                        db.session.add(blocker)
                        linked += 1
                        print(f"[STANDUP] Created blocker from standup: '{line[:40]}'")

    if linked:
        db.session.commit()
        print(f"[STANDUP] Created {linked} blockers from standup text (ws={workspace_id})")


def _auto_standup(workspace_id):
    """Generate a rich daily briefing using the deterministic compiler + LLM rewrite."""
    from models.workspace_member import WorkspaceMember
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id).order_by(WorkspaceMember.id.asc()).first()
    user_id = member.user_id if member else 1
    _generate_standup_from_compiled(workspace_id, user_id=user_id)
