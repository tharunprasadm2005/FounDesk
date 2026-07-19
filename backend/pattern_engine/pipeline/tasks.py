import json
from datetime import datetime, timedelta
from config.database import db
from models.task import Task
from models.activity_event import ActivityEvent

from .utils import _get_workspace_creator


TASK_TOOL_SOURCES = {"linear", "trello", "asana", "monday"}
TASK_TOOL_MODULES = {}


def _load_task_tool_module(source):
    if source not in TASK_TOOL_MODULES:
        try:
            mod = __import__(f"pattern_engine.sync.{source}", fromlist=["sync"])
            TASK_TOOL_MODULES[source] = mod
        except ImportError:
            TASK_TOOL_MODULES[source] = None
    return TASK_TOOL_MODULES[source]


def _map_tool_status(raw_status, source):
    """Map tool-specific statuses to FounDesk task statuses."""
    if not raw_status:
        return "Not Started"
    s = raw_status.strip().lower()
    if s in ("done", "completed", "closed", "100%"):
        return "Done"
    if s in ("canceled", "cancelled", "archived"):
        return "Cancelled"
    if s in ("in progress", "started", "active", "working on it", "review"):
        return "In Progress"
    if s in ("blocked", "waiting", "stuck"):
        return "Blocked"
    if s in ("backlog", "to do", "planning", "not started"):
        return "Not Started"
    return "Not Started"


def _map_tool_priority(priority_str):
    """Map tool-specific priority to P0-P3."""
    if not priority_str:
        return None
    s = str(priority_str).strip().lower()
    if s in ("p0", "critical", "urgent"):
        return "P0"
    if s in ("p1", "high"):
        return "P1"
    if s in ("p2", "medium"):
        return "P2"
    if s in ("p3", "low", "none"):
        return "P3"
    return None


def _parse_source_category(details, src):
    """Extract native grouping from task-tool details text."""
    if not details:
        return src.capitalize() if src else "Manual"
    if src == "linear":
        m = __import__('re').search(r'Team:\s*(.+?)(?:\||$)', details)
        return m.group(1).strip() if m else "Linear"
    if src == "asana":
        m = __import__('re').search(r'Project:\s*(.+?)(?:\||$)', details)
        return m.group(1).strip() if m else "Asana"
    if src == "monday":
        m = __import__('re').search(r'Board:\s*(.+?)(?:,|$)', details)
        board = m.group(1).strip() if m else None
        g = __import__('re').search(r'Group:\s*(.+?)(?:\||$)', details)
        group = g.group(1).strip() if g else None
        if board and group:
            return f"{board} / {group}"
        return board or group or "Monday.com"
    if src == "trello":
        m = __import__('re').search(r'Board:\s*(.+?)(?:\||$)', details)
        return m.group(1).strip() if m else "Trello"
    return src.capitalize()


def _process_task_tool_events(workspace_id, raw_events):
    creator_id = _get_workspace_creator(workspace_id)
    count = 0
    for event in raw_events:
        src = (event.source or "").lower()
        if src not in TASK_TOOL_SOURCES:
            continue
        if event.processing_status == 'done':
            continue
        payload = event.raw_payload
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except (json.JSONDecodeError, TypeError):
                continue
        if not isinstance(payload, dict):
            continue
        title = (payload.get("title") or "").strip()
        if not title:
            continue
        details = payload.get("details") or ""
        raw_status = payload.get("status") or ""
        mapped_status = _map_tool_status(raw_status, src)
        priority = _map_tool_priority(payload.get("priority"))
        raw_progress = payload.get("progress_percentage")
        try: progress = int(raw_progress) if raw_progress is not None else None
        except (ValueError, TypeError): progress = None
        risk = payload.get("risk_level")
        existing = Task.query.filter_by(
            workspace_id=workspace_id,
            source=src,
            source_ref=event.source_ref,
        ).first()
        source_category = _parse_source_category(details, src)
        if existing:
            existing.title = title[:255]
            existing.description = details
            existing.status = mapped_status
            existing.source_category = source_category
            if priority:
                existing.priority = priority
            if progress is not None:
                existing.progress_percentage = progress
            if risk:
                existing.risk_level = risk
            count += 1
            continue
        task = Task(
            title=title[:255],
            description=details,
            status=mapped_status,
            priority=priority or "P2",
            progress_percentage=progress,
            risk_level=risk,
            source_category=source_category,
            workspace_id=workspace_id,
            user_id=creator_id or 1,
            source=src,
            source_ref=event.source_ref,
            source_event_id=event.id,
        )
        db.session.add(task)
        event.processing_status = 'done'
        event.processed_at = datetime.utcnow()
        count += 1
    if count:
        db.session.flush()
        print(f"[TASK-TOOL] Created/updated {count} tasks from task-tool sources (ws={workspace_id})")


def _detect_overdue_tasks(workspace_id):
    """Flag tasks past deadline or stale for >7 days as 'at_risk'."""
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    cutoff = now - timedelta(days=7)
    flagged = 0

    # Tasks past deadline
    overdue = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.deadline.isnot(None),
        Task.deadline < now,
        Task.status.in_(["Not Started", "In Progress", "Blocked"]),
    ).all()
    for t in overdue:
        if not t.phase_tag or "overdue" not in (t.phase_tag or ""):
            t.phase_tag = "overdue"
            flagged += 1

    # Stale unstarted tasks (no update for 7+ days)
    stale = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status.in_(["Not Started", "In Progress"]),
        Task.updated_at < cutoff,
    ).all()
    for t in stale:
        if not t.phase_tag or "stale" not in (t.phase_tag or ""):
            t.phase_tag = "stale" if "overdue" not in (t.phase_tag or "") else f"{t.phase_tag},stale"
            flagged += 1

    if flagged:
        db.session.commit()
        print(f"[TASK] Flagged {flagged} overdue/stale tasks (ws={workspace_id})")


def _handle_task_deletes(workspace_id):
    """Mark tasks as 'Cancelled' when upstream ActivityEvent indicates delete/archive.
    ActivityEvent has no 'action' column, so we match via title/activity_type flags."""
    from models.activity_event import ActivityEvent
    deleted_refs = set()
    deleted_keywords = ("deleted", "archived", "removed", "delete", "archive", "remove")
    deleted_events = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider.in_(["linear", "trello", "asana", "monday"]),
    ).all()
    for ae in deleted_events:
        text = f"{ae.title or ''} {ae.details or ''} {ae.activity_type or ''}".lower()
        if any(kw in text for kw in deleted_keywords):
            if ae.raw_ref:
                deleted_refs.add(ae.raw_ref)

    if deleted_refs:
        affected = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.source_ref.in_(deleted_refs),
            Task.status.in_(["Not Started", "In Progress", "Blocked"]),
        ).update({"status": "Cancelled", "updated_at": datetime.utcnow()}, synchronize_session='fetch')
        if affected:
            db.session.commit()
            print(f"[TASK] Cancelled {affected} tasks deleted/archived upstream")
