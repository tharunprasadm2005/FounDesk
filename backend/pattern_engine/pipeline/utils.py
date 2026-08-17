from datetime import datetime
from config.database import db
from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.blocker import Blocker
from models.meeting_notes import MeetingNotes
from models.follow_up import FollowUp
from models.knowledge_item import KnowledgeItem
from models.workspace import Workspace
from models.chronicle_event import ChronicleEvent


def _get_workspace_creator(workspace_id):
    ws = Workspace.query.get(workspace_id)
    return ws.creator_id if ws else 1


def _get_workspace_stage(workspace_id):
    ws = Workspace.query.get(workspace_id)
    return ws.stage if ws else "Think"


def _clean_field(value, maxlen=None):
    if not value:
        return ""
    import re as _re
    cleaned = _re.sub(r'<[^>]+>', '', str(value))
    cleaned = _re.sub(
        r'^(inferred from|extracted from|based on)\s+.+?:\s*',
        '',
        cleaned,
        flags=_re.IGNORECASE
    ).strip()
    if maxlen:
        cleaned = cleaned[:maxlen]
    return cleaned


def _normalize_task_priority(value):
    if not value:
        return "P2"
    s = str(value).strip().lower()
    if s in ("p0", "critical", "urgent"):
        return "P0"
    if s in ("p1", "high", "highest"):
        return "P1"
    if s in ("p2", "medium", "normal", "default"):
        return "P2"
    if s in ("p3", "low", "lowest", "none"):
        return "P3"
    return value


def _normalize_task_status(value):
    if not value:
        return "Not Started"
    s = str(value).strip().lower()
    if s in ("done", "completed", "closed", "100%", "merged"):
        return "Done"
    if s in ("canceled", "cancelled", "archived", "rejected", "abandoned"):
        return "Cancelled"
    if s in ("in progress", "in_progress", "started", "active", "working on it", "review", "open", "reopened", "ready"):
        return "In Progress"
    if s in ("blocked", "waiting", "stuck"):
        return "Blocked"
    if s in ("backlog", "to do", "todo", "planning", "not started"):
        return "Not Started"
    return "Not Started"


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return None


def _find_existing(model_class, workspace_id, source_event_id):
    if not source_event_id or not hasattr(model_class, "source_event_id"):
        return None
    return model_class.query.filter_by(
        workspace_id=workspace_id,
        source_event_id=str(source_event_id)
    ).first()


def _update_record(existing, model_class, result, event, workspace_id, stats):
    new_confidence = result.get("confidence", 0)
    try:
        existing_confidence = getattr(existing, "confidence_score", 0) or 0
    except Exception:
        existing_confidence = 0
    if new_confidence <= existing_confidence:
        stats["skipped"] += 1
        return

    fields = result["fields"]
    if model_class == Task:
        existing.title = fields.get("title", existing.title)[:255]
        existing.description = fields.get("description", existing.description)
        existing.priority = _normalize_task_priority(fields.get("priority", existing.priority))
        existing.status = _normalize_task_status(fields.get("status", existing.status))
        existing.deadline = fields.get("deadline", existing.deadline)
        existing.estimated_hours = fields.get("estimated_hours", existing.estimated_hours)
    elif model_class == DecisionLog:
        existing.decision = fields.get("decision_text") or fields.get("decision") or fields.get("title") or existing.decision
        existing.context = fields.get("context", existing.context)
        existing.alternatives = fields.get("alternatives", existing.alternatives)
        existing.attendees = fields.get("attendees", existing.attendees)
        existing.consequences = fields.get("consequences", existing.consequences)
        existing.startup_stage = fields.get("startup_stage", existing.startup_stage)
        existing.linked_meeting_id = fields.get("linked_meeting_id", existing.linked_meeting_id)
        existing.status = fields.get("status", existing.status)
    elif model_class == Goal:
        existing.title = fields.get("title", existing.title)[:255]
        existing.description = fields.get("description", existing.description)
    elif model_class == Blocker:
        existing.title = fields.get("title", existing.title)[:255]
        existing.description = fields.get("description", existing.description)
        existing.severity = fields.get("severity", existing.severity)
    elif model_class == MeetingNotes:
        existing.title = fields.get("title", existing.title)[:255]
        existing.summary = fields.get("summary", existing.summary)
        existing.attendees = fields.get("attendees", existing.attendees)
        existing.meeting_type = fields.get("meeting_type", existing.meeting_type)
        existing.agenda = fields.get("agenda", existing.agenda)
        existing.tags = fields.get("tags", existing.tags)
        existing.duration = fields.get("duration", existing.duration)
        meeting_date = fields.get("date")
        if meeting_date:
            if isinstance(meeting_date, str):
                try:
                    meeting_date = datetime.fromisoformat(meeting_date.replace("Z", "+00:00").split("+")[0])
                except (ValueError, TypeError):
                    meeting_date = None
            if meeting_date:
                existing.date = meeting_date
    elif model_class == FollowUp:
        existing.person_name = fields.get("person_name", existing.person_name)
    elif model_class == KnowledgeItem:
        existing.title = fields.get("title", existing.title)[:255]
        existing.summary = fields.get("summary") or fields.get("content") or existing.summary
        existing.knowledge_type = fields.get("knowledge_type") or fields.get("category") or existing.knowledge_type
        existing.key_points = fields.get("key_points") or fields.get("tags") or existing.key_points

    try:
        existing.confidence_score = round(new_confidence, 2)
    except Exception:
        pass
    try:
        existing.source_signal = result.get("source_signal", getattr(existing, "source_signal", None))
    except Exception:
        pass
    if hasattr(existing, "updated_at"):
        existing.updated_at = datetime.utcnow()
    stats["updated"] += 1


def _build_record(model_class, fields, workspace_id):
    creator_id = _get_workspace_creator(workspace_id)
    try:
        if model_class == Task:
            task_title = _clean_field(fields.get("title"), 255)
            if not task_title:
                return None
            return Task(
                title=task_title,
                description=_clean_field(fields.get("description")),
                priority=_normalize_task_priority(fields.get("priority")) or "P2",
                status=_normalize_task_status(fields.get("status") or fields.get("state")),
                deadline=_parse_date(fields.get("deadline")),
                estimated_hours=fields.get("estimated_hours"),
                goal_id=fields.get("linked_goal_id"),
                linked_decision_id=fields.get("linked_decision_id"),
                workspace_id=workspace_id,
                user_id=creator_id,
            )
        elif model_class == DecisionLog:
            decision_text = _clean_field(fields.get("decision_text") or fields.get("decision") or fields.get("title"), 255)
            if not decision_text:
                return None
            return DecisionLog(
                decision=decision_text,
                context=_clean_field(fields.get("context"), 500),
                alternatives=fields.get("alternatives"),
                attendees=fields.get("attendees"),
                consequences=fields.get("consequences"),
                startup_stage=fields.get("startup_stage"),
                linked_meeting_id=fields.get("linked_meeting_id"),
                status=fields.get("status", "Proposed"),
                created_by=creator_id,
                workspace_id=workspace_id,
            )
        elif model_class == Goal:
            return Goal(
                title=fields.get("title", "Untitled Goal")[:255],
                description=fields.get("description"),
                goal_type=fields.get("goal_type", "monthly"),
                status="pending",
                user_id=creator_id,
                workspace_id=workspace_id,
            )
        elif model_class == Blocker:
            blocker_title = _clean_field(fields.get("title"), 255)
            if not blocker_title or blocker_title.lower() == "untitled blocker":
                return None
            return Blocker(
                title=blocker_title,
                description=fields.get("description"),
                severity=fields.get("severity", "medium"),
                status="open",
                workspace_id=workspace_id,
            )
        elif model_class == MeetingNotes:
            meeting_date = fields.get("date") or fields.get("occurred_at")
            if isinstance(meeting_date, str):
                try:
                    meeting_date = datetime.fromisoformat(meeting_date.replace("Z", "+00:00").split("+")[0])
                except (ValueError, TypeError):
                    meeting_date = None
            return MeetingNotes(
                title=fields.get("title", "Meeting")[:255],
                summary=fields.get("summary"),
                attendees=fields.get("attendees"),
                meeting_type=fields.get("meeting_type"),
                agenda=fields.get("agenda"),
                tags=fields.get("tags"),
                duration=fields.get("duration"),
                date=meeting_date or fields.get("date") or datetime.utcnow(),
                created_by=creator_id,
                workspace_id=workspace_id,
                status="Draft",
            )
        elif model_class == FollowUp:
            return FollowUp(
                person_name=fields.get("person_name", "Unknown")[:100],
                followup_date=_parse_date(fields.get("suggested_date")),
                status="pending",
                user_id=creator_id,
                workspace_id=workspace_id,
            )
        elif model_class == KnowledgeItem:
            return KnowledgeItem(
                title=fields.get("title", "Untitled Knowledge")[:255],
                summary=fields.get("summary") or fields.get("content") or fields.get("description"),
                knowledge_type=fields.get("knowledge_type") or fields.get("category", "insight"),
                key_points=fields.get("key_points") or fields.get("tags"),
                workspace_id=workspace_id,
                created_by=creator_id,
                status="Draft",
            )
    except Exception as e:
        print(f"Error building record: {e}")
        return None


def _create_chronicle(record, result, event, workspace_id):
    try:
        rtype = result.get("record_type", "none")
        fields = result.get("fields", {})
        title = fields.get("title") or fields.get("decision_text") or fields.get("person_name") or "Processed event"
        desc = fields.get("description") or fields.get("context") or fields.get("summary") or ""
        payload = event.raw_payload
        if isinstance(payload, str):
            import json
            payload = json.loads(payload)
        event_type = rtype if rtype != "none" else "activity"
        chronicle_title = title if rtype != "none" else f"Ingested: {payload.get('title', '') or event.source}"
        stage = _get_workspace_stage(workspace_id)
        user_id = getattr(record, "created_by", None) or getattr(record, "user_id", None) if record else None

        if rtype != "none":
            existing_chronicle = ChronicleEvent.query.filter_by(
                workspace_id=workspace_id,
                event_type=event_type,
                source_type=rtype if rtype not in ("none", "activity") else None,
                source_id=record.id if record else None,
            ).first()
            if existing_chronicle:
                return

        chronicle = ChronicleEvent(
            workspace_id=workspace_id,
            event_type=event_type,
            title=str(chronicle_title)[:200],
            description=str(desc)[:200] if desc else None,
            stage=stage,
            user_id=user_id,
            source_type=rtype if rtype not in ("none", "activity") else None,
            source_id=record.id if record else None,
            meta_data={"provider": event.source, "raw_title": payload.get("title", ""), "record_type": rtype, "record_id": record.id if record else None},
        )
        db.session.add(chronicle)
    except Exception as e:
        print(f"Chronicle creation error: {e}")
