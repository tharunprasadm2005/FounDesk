from datetime import datetime

def normalize(raw_email):
    ts = raw_email.get("internalDate")
    if ts:
        try:
            occurred_at = datetime.fromtimestamp(int(ts) / 1000)
        except (ValueError, OSError):
            occurred_at = datetime.utcnow()
    else:
        occurred_at = datetime.utcnow()
    return {
        "source": "gmail",
        "source_id": raw_email.get("id"),
        "event_type": "email",
        "occurred_at": occurred_at,
        "raw_payload": raw_email,
        "is_mock": raw_email.get("is_mock", False),
    }
