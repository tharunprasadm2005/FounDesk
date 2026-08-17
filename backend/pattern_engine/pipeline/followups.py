import json
import os
from datetime import datetime, timedelta
from config.database import db
from models.follow_up import FollowUp
from models.activity_event import ActivityEvent

from .utils import _get_workspace_creator, _parse_date


def _llm_follow_up_detection(workspace_id, raw_events):
    """Job 8: Classify follow-ups from Gmail, Slack, and other conversational sources."""
    from pattern_engine.extraction import extract_follow_up_from_event
    from pattern_engine.models import LLMUsageLog
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_calls = LLMUsageLog.query.filter(LLMUsageLog.created_at >= today_start).count()
    max_daily = int(os.environ.get("LLM_DAILY_LIMIT", "200"))
    remaining = max_daily - daily_calls
    if remaining <= 0:
        return

    creator_id = _get_workspace_creator(workspace_id)
    follow_up_sources = {"gmail", "slack", "hubspot", "pipedrive"}
    created = 0
    candidates = [e for e in raw_events if (e.source or "").lower() in follow_up_sources]
    for event in candidates[:min(5, remaining)]:
        src = (event.source or "").lower()
        if src not in follow_up_sources:
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
        actor = payload.get("actor") or payload.get("from") or ""
        event_text = f"Title: {title}\nDetails: {details}" if details else title
        if actor:
            event_text = f"From: {actor}\n{event_text}"
        if len(event_text.strip()) < 30:
            continue
        try:
            result = extract_follow_up_from_event(event_text, src)
            if result and result.get("is_follow_up"):
                person = result.get("person_name", "") or "Unknown"
                # Skip placeholder names \u2014 low confidence extractions
                if person.lower() in ("unknown", "meeting participant", "participant", "someone", "attendee", "guest", "person", "member", "user", "client", "team member", ""):
                    print(f"[FOLLOW-UP] Skipped placeholder person_name='{person}' from {src}")
                    continue
                context = result.get("context", "")[:200]
                action = result.get("action_needed", "")[:200]
                suggested_date = result.get("suggested_followup_date", "")
                full_context = f"{context} - {action}" if action else context
                already_exists = FollowUp.query.filter_by(
                    workspace_id=workspace_id,
                    source=src,
                    source_event_id=str(event.id),
                ).first()
                if already_exists:
                    print(f"[FOLLOW-UP] Skipped duplicate for event {event.id} (existing FU #{already_exists.id})")
                    continue
                fu = FollowUp(
                    person_name=person[:100],
                    context=full_context[:200] if full_context else None,
                    followup_date=_parse_date(suggested_date) if suggested_date else (datetime.utcnow() + timedelta(days=3)),
                    status="pending",
                    user_id=creator_id,
                    workspace_id=workspace_id,
                    source=src,
                    source_event_id=str(event.id),
                )
                db.session.add(fu)
                created += 1
                print(f"[FOLLOW-UP] Created from {src}: '{person}' \u2014 {context[:40]}")
        except Exception:
            pass
    if created:
        db.session.commit()
        print(f"[FOLLOW-UP] Created {created} follow-ups from Job 8 (ws={workspace_id})")


def _crm_follow_up_detection(workspace_id):
    """Rule-based: detect stalled HubSpot/Pipedrive deals and create follow-ups."""
    from models.activity_event import ActivityEvent
    from models.goal import Goal
    creator_id = _get_workspace_creator(workspace_id)
    if not creator_id:
        return

    stalled_cutoff = datetime.utcnow() - timedelta(days=7)
    crm_sources = {"hubspot", "pipedrive"}
    for src in crm_sources:
        # Find deals with no recent activity
        recent = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider == src,
            ActivityEvent.external_timestamp >= stalled_cutoff,
        ).with_entities(ActivityEvent.raw_ref).distinct().all()
        active_deals = set(r[0] for r in recent if r[0])

        all_deals = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider == src,
        ).with_entities(ActivityEvent.raw_ref, ActivityEvent.external_timestamp).distinct().all()
        deal_activity = {}
        for ref, ts in all_deals:
            if ref:
                if ref not in deal_activity or ts > deal_activity[ref]:
                    deal_activity[ref] = ts

        for deal_ref, last_active in deal_activity.items():
            if last_active and last_active < stalled_cutoff and deal_ref not in active_deals:
                existing = FollowUp.query.filter_by(
                    workspace_id=workspace_id,
                    source=src,
                    source_event_id=deal_ref,
                    status="pending",
                ).first()
                if not existing:
                    fu = FollowUp(
                        person_name=f"{src}: {deal_ref[:50]}",
                        context=f"Deal stalled \u2014 no stage movement since {last_active.strftime('%b %d')}",
                        followup_date=datetime.utcnow() + timedelta(days=1),
                        status="pending",
                        user_id=creator_id,
                        workspace_id=workspace_id,
                        source=src,
                        source_event_id=deal_ref,
                        priority="high",
                    )
                    db.session.add(fu)
                    print(f"[FOLLOW-UP] CRM stalled deal: {deal_ref[:40]} ({src})")
    db.session.commit()


def _auto_resolve_follow_ups(workspace_id):
    """Auto-resolve follow-ups when the concern is addressed by a later event."""
    pending = FollowUp.query.filter_by(workspace_id=workspace_id, status="pending").all()
    resolved = 0
    for fu in pending:
        # 1. Check if a meeting note mentions this person
        if fu.linked_meeting_id:
            from models.meeting_notes import MeetingNotes
            meeting = MeetingNotes.query.get(fu.linked_meeting_id)
            if meeting and meeting.attendees and fu.person_name.lower() in meeting.attendees.lower():
                fu.status = "resolved"
                resolved += 1
                print(f"[FOLLOW-UP] Auto-resolved: '{fu.person_name}' \u2014 meeting covered topic")
                continue

        # 2. Check if a later meeting mentions this person
        if fu.person_name and fu.person_name != "Unknown" and fu.person_name != "Meeting participant":
            from models.meeting_notes import MeetingNotes
            later_meetings = MeetingNotes.query.filter(
                MeetingNotes.workspace_id == workspace_id,
                MeetingNotes.date > fu.created_at,
            ).all()
            for m in later_meetings:
                if m.attendees and fu.person_name.lower() in m.attendees.lower():
                    fu.status = "resolved"
                    resolved += 1
                    print(f"[FOLLOW-UP] Auto-resolved: '{fu.person_name}' \u2014 met again ({m.title[:30]})")
                    break

        # 3. Check if a linked task was completed
        if fu.linked_task_id:
            from models.task import Task
            task = Task.query.get(fu.linked_task_id)
            if task and task.status == "Done":
                fu.status = "resolved"
                resolved += 1
                print(f"[FOLLOW-UP] Auto-resolved: '{fu.person_name}' \u2014 linked task done")
                continue

        # 4. Check CRM: if deal had activity after follow-up creation
        if fu.source in ("hubspot", "pipedrive") and fu.source_event_id:
            from models.activity_event import ActivityEvent
            later = ActivityEvent.query.filter(
                ActivityEvent.workspace_id == workspace_id,
                ActivityEvent.provider == fu.source,
                ActivityEvent.raw_ref == fu.source_event_id,
                ActivityEvent.external_timestamp > fu.created_at,
            ).first()
            if later:
                fu.status = "resolved"
                resolved += 1
                print(f"[FOLLOW-UP] Auto-resolved: CRM deal '{fu.person_name}' \u2014 activity resumed")
                continue

    if resolved:
        db.session.commit()
        print(f"[FOLLOW-UP] Auto-resolved {resolved} follow-ups (ws={workspace_id})")


def _update_follow_up_priority(workspace_id):
    """Update follow-up priority based on staleness."""
    from datetime import datetime
    now = datetime.utcnow()
    pending = FollowUp.query.filter_by(workspace_id=workspace_id, status="pending").all()
    for fu in pending:
        age_days = (now - fu.created_at).days
        if age_days >= 14:
            fu.priority = "critical"
        elif age_days >= 7:
            fu.priority = "high"
        elif age_days >= 3:
            fu.priority = "normal"
        else:
            fu.priority = fu.priority or "normal"
    db.session.commit()


def _update_meeting_follow_up_dedup(workspace_id, raw_events):
    """Dedup follow-ups: prevent creating multiple follow-ups for same meeting."""
    from models.follow_up import FollowUp
    existing_meeting_ids = set()
    for fu in FollowUp.query.filter_by(workspace_id=workspace_id, status="pending").all():
        if fu.linked_meeting_id:
            existing_meeting_ids.add(fu.linked_meeting_id)
    return existing_meeting_ids
