from datetime import datetime

def normalize(raw_page):
    return {
        "source": "notion",
        "source_id": raw_page.get("id"),
        "event_type": raw_page.get("object", "page"),
        "occurred_at": datetime.fromisoformat(raw_page.get("last_edited_time", "").replace("Z", "+00:00")) if raw_page.get("last_edited_time") else datetime.utcnow(),
        "raw_payload": raw_page,
        "is_mock": raw_page.get("is_mock", False),
    }
