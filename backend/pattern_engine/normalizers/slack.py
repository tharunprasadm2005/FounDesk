from datetime import datetime

def normalize(raw_message):
    ts = raw_message.get("ts")
    occurred_at = datetime.utcfromtimestamp(float(ts)) if ts else datetime.utcnow()
    return {
        "source": "slack",
        "source_id": raw_message.get("ts"),
        "event_type": "message",
        "occurred_at": occurred_at,
        "raw_payload": raw_message,
        "is_mock": raw_message.get("is_mock", False),
    }
