import json
import os
from datetime import datetime, timedelta
from config.database import db
from models.blocker import Blocker
from models.task import Task
from models.activity_event import ActivityEvent

from .utils import _get_workspace_creator


def _process_blocker_events(workspace_id, raw_events):
    from pattern_engine.extraction import extract_blocker_from_event
    from pattern_engine.models import LLMUsageLog
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_calls = LLMUsageLog.query.filter(LLMUsageLog.created_at >= today_start).count()
    max_daily = int(os.environ.get("LLM_DAILY_LIMIT", "200"))
    remaining = max_daily - daily_calls
    if remaining <= 0:
        return

    creator_id = _get_workspace_creator(workspace_id)
    source_texts = ["slack", "gmail", "notion", "google_docs"]
    for event in raw_events[:min(30, remaining)]:
        if event.source not in source_texts:
            continue
        payload = event.raw_payload
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except (json.JSONDecodeError, TypeError):
                continue
        if not isinstance(payload, dict):
            continue
        title = payload.get("title", "") or ""
        details = payload.get("details", "") or ""
        event_text = f"Title: {title}\nDetails: {details}" if details else title
        try:
            result = extract_blocker_from_event(event_text, event.source)
            if result and result.get("is_blocker"):
                title_text = (result.get("title") or "").strip()[:255]
                if not title_text or title_text.lower() == "untitled blocker":
                    continue
                existing = Blocker.query.filter_by(
                    workspace_id=workspace_id,
                    title=title_text,
                    status="open",
                ).first()
                if not existing:
                    blocker = Blocker(
                        title=title_text,
                        description=result.get("description", "")[:500],
                        severity=result.get("severity", "medium"),
                        status="open",
                        source_integration=event.source,
                        confidence_score=0.7,
                        workspace_id=workspace_id,
                    )
                    db.session.add(blocker)
                    print(f"[BLOCKER] Detected from {event.source}: '{title_text[:50]}'")
        except Exception:
            pass

    stalled_cutoff = datetime.utcnow() - timedelta(days=7)
    stalled_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "In Progress",
        Task.updated_at <= stalled_cutoff,
    ).all()
    for t in stalled_tasks:
        # Skip tasks that already have an explicit blocker description (user-set block)
        if t.blocker_description:
            continue
        # Skip tasks that already have a linked blocker record from a non-system source
        existing_real = Blocker.query.filter(
            Blocker.workspace_id == workspace_id,
            Blocker.task_id == t.id,
            Blocker.status == "open",
            Blocker.source_integration != "system",
        ).first()
        if existing_real:
            continue
        existing_system = Blocker.query.filter_by(
            workspace_id=workspace_id,
            task_id=t.id,
            source_integration="system",
            status="open",
        ).first()
        if not existing_system:
            blocker = Blocker(
                title=f"Task stalled: {t.title[:200]}",
                description=f"Task '{t.title}' has been in progress since {t.updated_at.strftime('%b %d')} with no status change",
                severity="medium",
                status="open",
                source_integration="system",
                confidence_score=0.9,
                task_id=t.id,
                workspace_id=workspace_id,
            )
            db.session.add(blocker)
            print(f"[BLOCKER] Stalled task: '{t.title[:40]}' (stalled {t.updated_at.strftime('%b %d')})")


def _process_crm_blockers(workspace_id):
    """Detect deal blockers from HubSpot/Pipedrive notes fields."""
    from models.activity_event import ActivityEvent
    deal_events = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider.in_(["hubspot", "pipedrive"]),
        ActivityEvent.activity_type == "deal",
        ActivityEvent.details.contains("Notes:"),
    ).all()
    created = 0
    for ev in deal_events:
        notes = ""
        if "| Notes:" in (ev.details or ""):
            notes = ev.details.split("| Notes:")[-1].strip()
        if not notes or len(notes) < 10:
            continue
        title_text = f"Deal blocker: {ev.title.replace('HubSpot Deal: ', '').replace('Pipedrive Deal: ', '')[:200]}"
        existing = Blocker.query.filter_by(
            workspace_id=workspace_id,
            title=title_text,
            status="open",
        ).first()
        if not existing:
            blocker = Blocker(
                title=title_text,
                description=notes[:500],
                severity="high",
                status="open",
                source_integration=ev.provider,
                source_signal="structured",
                confidence_score=1.0,
                workspace_id=workspace_id,
            )
            db.session.add(blocker)
            created += 1
            print(f"[CRM-BLOCKER] Deal blocker: '{title_text[:50]}'")
    if created:
        db.session.commit()
        print(f"[CRM-BLOCKER] Created {created} deal blockers (ws={workspace_id})")


def _auto_resolve_blockers(workspace_id):
    """Auto-resolve blockers when the blocking condition clears."""
    now = datetime.utcnow()
    open_blockers = Blocker.query.filter_by(workspace_id=workspace_id, status="open").all()
    resolved = 0
    for b in open_blockers:
        if b.task_id:
            task = Task.query.get(b.task_id)
            if task:
                if task.status in ("Done", "Completed", "Cancelled"):
                    b.status = "resolved"
                    b.resolved_at = now
                    resolved += 1
                    print(f"[BLOCKER] Auto-resolved: '{b.title[:40]}' \u2014 linked task done/cancelled")
                    continue
                # Conditions 2 & 3 only apply to stalled-task blockers (source_integration="system")
                # CRM, standup, and AI-detected blockers have different semantics \u2014 task
                # activity doesn't mean the blocker is resolved.
                if b.source_integration == "system":
                    if task.status == "In Progress" and task.updated_at > (now - timedelta(hours=24)):
                        b.status = "resolved"
                        b.resolved_at = now
                        resolved += 1
                        print(f"[BLOCKER] Auto-resolved: '{b.title[:40]}' \u2014 task resumed activity")
                        continue
                    if task.status != "Blocked" and task.blocked_at is None and task.status != "In Progress":
                        b.status = "resolved"
                        b.resolved_at = now
                        resolved += 1
                        print(f"[BLOCKER] Auto-resolved: '{b.title[:40]}' \u2014 task no longer blocked/in-progress")
                        continue

    if resolved:
        db.session.commit()
        print(f"[BLOCKER] Auto-resolved {resolved} blockers (ws={workspace_id})")


def _update_blocker_priority(workspace_id):
    """Update blocker severity based on age (7+ days -> high)."""
    now = datetime.utcnow()
    open_blockers = Blocker.query.filter_by(workspace_id=workspace_id, status="open").all()
    for b in open_blockers:
        age_days = (now - b.created_at).days
        if age_days >= 7 and b.severity != "high":
            b.severity = "high"
            print(f"[BLOCKER] Escalated '{b.title[:40]}' to high (age={age_days}d)")
    db.session.commit()
