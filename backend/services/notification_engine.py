from datetime import datetime, timedelta
from config.database import db
from models.notification_preference import NotificationPreference, InAppNotification
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.blocker import Blocker
from models.decision_log import DecisionLog
from models.follow_up import FollowUp
from models.chronicle_event import ChronicleEvent
from models.goal import Goal
from models.task import Task


def run_notification_engine(workspace_id):
    workspace = Workspace.query.get(workspace_id)
    if not workspace:
        return 0

    members = WorkspaceMember.query.filter_by(workspace_id=workspace_id, status="active").all()
    total_created = 0

    for member in members:
        user_id = member.user_id
        prefs = NotificationPreference.query.filter_by(
            user_id=user_id, workspace_id=workspace_id, enabled=True
        ).all()
        enabled_rules = {p.rule_key for p in prefs}

        if not enabled_rules:
            continue

        if "blocker_detected" in enabled_rules:
            total_created += _check_blockers(user_id, workspace_id)
        if "daily_briefing" in enabled_rules:
            total_created += _generate_briefing(user_id, workspace_id)
        if "follow_up_due" in enabled_rules:
            total_created += _check_follow_ups(user_id, workspace_id)
        if "decision_confirmation" in enabled_rules:
            total_created += _check_decisions(user_id, workspace_id)
        if "member_joined" in enabled_rules:
            total_created += _check_recent_member_changes(user_id, workspace_id)
        if "phase_change" in enabled_rules:
            total_created += _check_phase_changes(user_id, workspace_id)
        if "weekly_digest" in enabled_rules:
            total_created += _generate_weekly_digest(user_id, workspace_id)

        db.session.commit()

    return total_created


def _has_recent_notif(user_id, workspace_id, ntype, hours=24):
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return InAppNotification.query.filter_by(
        user_id=user_id, workspace_id=workspace_id, notification_type=ntype
    ).filter(InAppNotification.created_at >= cutoff).first() is not None


def _create(user_id, workspace_id, title, message, ntype):
    note = InAppNotification(
        user_id=user_id, workspace_id=workspace_id,
        title=title, message=message, notification_type=ntype
    )
    db.session.add(note)
    return 1


def _check_blockers(user_id, workspace_id):
    if _has_recent_notif(user_id, workspace_id, "blocker_detected", 4):
        return 0
    open_blockers = Blocker.query.filter_by(
        workspace_id=workspace_id, status="open"
    ).count()
    if open_blockers == 0:
        return 0
    return _create(user_id, workspace_id,
        f"{open_blockers} blocker{'s' if open_blockers > 1 else ''} on active tasks",
        f"There {'are' if open_blockers > 1 else 'is'} {open_blockers} unresolved blocker{'s' if open_blockers > 1 else ''} that need attention.",
        "blocker_detected")


def _generate_briefing(user_id, workspace_id):
    if _has_recent_notif(user_id, workspace_id, "daily_briefing", 12):
        return 0
    tasks_due = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status.notin_(["Completed", "Done"]),
        Task.deadline != None,
        Task.deadline <= datetime.utcnow()
    ).count()

    goals_pending = Goal.query.filter_by(
        workspace_id=workspace_id, status="pending"
    ).count()
    blockers = Blocker.query.filter_by(
        workspace_id=workspace_id, status="open"
    ).count()

    parts = []
    if tasks_due > 0:
        parts.append(f"{tasks_due} task{'s' if tasks_due > 1 else ''} due")
    if goals_pending > 0:
        parts.append(f"{goals_pending} active goal{'s' if goals_pending > 1 else ''}")
    if blockers > 0:
        parts.append(f"{blockers} blocker{'s' if blockers > 1 else ''}")
    summary = " · ".join(parts) if parts else "No pressing items today."

    return _create(user_id, workspace_id,
        "Morning Briefing",
        f"Good morning. {summary}",
        "daily_briefing")


def _check_follow_ups(user_id, workspace_id):
    if _has_recent_notif(user_id, workspace_id, "follow_up_due", 6):
        return 0
    now = datetime.utcnow()
    deadline = now + timedelta(hours=24)
    due = FollowUp.query.filter(
        FollowUp.workspace_id == workspace_id,
        FollowUp.followup_date != None,
        FollowUp.followup_date <= deadline,
        FollowUp.followup_date >= now,
        FollowUp.status != "completed"
    ).count()

    if due == 0:
        return 0
    return _create(user_id, workspace_id,
        f"{due} follow-up{'s' if due > 1 else ''} due soon",
        f"{due} follow-up{'s' if due > 1 else ''} {'are' if due > 1 else 'is'} approaching deadline within 24 hours.",
        "follow_up_due")


def _check_decisions(user_id, workspace_id):
    if _has_recent_notif(user_id, workspace_id, "decision_confirmation", 6):
        return 0
    pending = DecisionLog.query.filter_by(
        workspace_id=workspace_id, ai_status="pending_confirmation"
    ).count()
    if pending == 0:
        return 0
    return _create(user_id, workspace_id,
        f"{pending} decision{'s' if pending > 1 else ''} awaiting confirmation",
        f"AI extracted {pending} decision{'s' if pending > 1 else ''} that {'need' if pending > 1 else 'needs'} your review.",
        "decision_confirmation")


def _check_recent_member_changes(user_id, workspace_id):
    cutoff = datetime.utcnow() - timedelta(days=2)
    recent = ChronicleEvent.query.filter(
        ChronicleEvent.workspace_id == workspace_id,
        ChronicleEvent.event_type.in_(["team_joined", "team_left"]),
        ChronicleEvent.created_at >= cutoff
    ).all()

    if not recent:
        return 0
    joined = sum(1 for e in recent if e.event_type == "team_joined")
    left = sum(1 for e in recent if e.event_type == "team_left")
    ntype = "member_joined" if joined > 0 else "member_left"
    if _has_recent_notif(user_id, workspace_id, ntype, 24):
        return 0
    parts = []
    if joined:
        parts.append(f"{joined} joined")
    if left:
        parts.append(f"{left} left")
    return _create(user_id, workspace_id,
        f"Team update: {' · '.join(parts)}",
        f"Recent team changes in your workspace: {', '.join(parts)}.",
        ntype)


def _check_phase_changes(user_id, workspace_id):
    if _has_recent_notif(user_id, workspace_id, "phase_change", 48):
        return 0
    ws = Workspace.query.get(workspace_id)
    if not ws or not ws.active_phase:
        return 0
    cutoff = datetime.utcnow() - timedelta(days=3)
    recent_phase = ChronicleEvent.query.filter(
        ChronicleEvent.workspace_id == workspace_id,
        ChronicleEvent.event_type == "phase_changed",
        ChronicleEvent.created_at >= cutoff
    ).first()
    if not recent_phase:
        return 0
    return _create(user_id, workspace_id,
        f"Active phase: {ws.active_phase.replace('_', ' ')}",
        f"Your workspace is in the '{ws.active_phase.replace('_', ' ')}' phase. Check your goals and tasks.",
        "phase_change")


def _generate_weekly_digest(user_id, workspace_id):
    if _has_recent_notif(user_id, workspace_id, "weekly_digest", 120):
        return 0
    week_ago = datetime.utcnow() - timedelta(days=7)
    tasks_completed = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status.in_(["Completed", "Done"]),
        Task.updated_at >= week_ago if hasattr(Task, 'updated_at') else True
    ).count()

    goals_completed = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status == "completed"
    ).count()

    blockers_created = Blocker.query.filter(
        Blocker.workspace_id == workspace_id,
        Blocker.created_at >= week_ago
    ).count()

    total_goals = Goal.query.filter_by(workspace_id=workspace_id).count()
    total_tasks = Task.query.filter_by(workspace_id=workspace_id).count()

    return _create(user_id, workspace_id,
        "Weekly Digest",
        f"This week: {goals_completed} goal{'s' if goals_completed != 1 else ''} completed, {tasks_completed} task{'s' if tasks_completed != 1 else ''} done, {blockers_created} blocker{'s' if blockers_created != 1 else ''} logged. Overall progress: {total_goals} goal{'s' if total_goals != 1 else ''}, {total_tasks} task{'s' if total_tasks != 1 else ''}.",
        "weekly_digest")
