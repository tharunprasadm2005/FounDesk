from datetime import datetime

AUTO_CONFIRM_THRESHOLD = 0.8
DECISION_AUTO_CONFIRM_THRESHOLD = 0.9
MEETING_NOTE_AUTO_CONFIRM_THRESHOLD = 0.85


def _set_attr_safe(record, name, value):
    try:
        setattr(record, name, value)
    except Exception:
        pass


def apply_tags(record, source_event, confidence, source_signal):
    if hasattr(record, "source"):
        record.source = "ai_pattern_engine"
    if hasattr(record, "source_integration"):
        record.source_integration = source_event.source
    if hasattr(record, "source_event_id"):
        record.source_event_id = source_event.id
    if hasattr(record, "confidence_score"):
        record.confidence_score = round(confidence, 2)
    if hasattr(record, "source_signal"):
        record.source_signal = source_signal

    record_type = _resolve_record_type(record)
    threshold = _get_auto_confirm_threshold(record_type)

    if confidence >= threshold:
        _set_attr_safe(record, "ai_status", "confirmed")
        _set_attr_safe(record, "confirmed_at", datetime.utcnow())
    elif source_signal == "explicit" and confidence >= 0.6:
        _set_attr_safe(record, "ai_status", "confirmed")
        _set_attr_safe(record, "confirmed_at", datetime.utcnow())
    else:
        _set_attr_safe(record, "ai_status", "pending_confirmation")


def _get_auto_confirm_threshold(record_type):
    if record_type == "decision":
        return DECISION_AUTO_CONFIRM_THRESHOLD
    if record_type == "meeting_note":
        return MEETING_NOTE_AUTO_CONFIRM_THRESHOLD
    return AUTO_CONFIRM_THRESHOLD


def _resolve_record_type(record):
    class_name = record.__class__.__name__
    mapping = {
        "Task": "task",
        "DecisionLog": "decision",
        "Goal": "goal",
        "Blocker": "blocker",
        "MeetingNotes": "meeting_note",
        "FollowUp": "follow_up",
        "KnowledgeItem": "knowledge_item",
    }
    return mapping.get(class_name, "unknown")
