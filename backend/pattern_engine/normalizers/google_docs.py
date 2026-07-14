from datetime import datetime

def normalize(raw_doc):
    return {
        "source": "google_docs",
        "source_id": raw_doc.get("documentId"),
        "event_type": "document",
        "occurred_at": datetime.fromisoformat(raw_doc.get("modificationTime", "").replace("Z", "+00:00")) if raw_doc.get("modificationTime") else datetime.utcnow(),
        "raw_payload": raw_doc,
        "is_mock": raw_doc.get("is_mock", False),
    }
