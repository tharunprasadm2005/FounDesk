from datetime import datetime, timedelta, timezone


def _map_tool_priority(priority_str):
    """Map a tool-specific priority string/level to P0-P3."""
    if not priority_str:
        return None
    s = str(priority_str).strip().lower()
    if s in ("critical", "urgent", "p0", "1", "1 - urgent"):
        return "P0"
    if s in ("high", "p1", "2", "2 - high"):
        return "P1"
    if s in ("medium", "p2", "3", "3 - medium"):
        return "P2"
    if s in ("low", "p3", "4", "4 - low", "none"):
        return "P3"
    return None


def clean_task_title(name, status):
    status_lower = status.lower() if status else ""
    # Clean up Monday raw formatting or prefixes if present
    name_clean = name
    if name_clean.startswith("Monday:"):
        name_clean = name_clean[len("Monday:"):].strip()
    if name_clean.startswith("|") and name_clean.endswith("|"):
        parts = [p.strip() for p in name_clean.split("|") if p.strip()]
        if len(parts) >= 1:
            name_clean = parts[0]
            if len(parts) >= 2 and not status:
                status_lower = parts[1].lower()
                
    # Emoji/format based on status
    if any(s in status_lower for s in ("done", "complete", "finished", "won", "ready")):
        return f"✅ {name_clean} completed"
    elif any(s in status_lower for s in ("stuck", "blocked", "fail", "error", "critical")):
        return f"⚠️ {name_clean} blocked"
    elif any(s in status_lower for s in ("progress", "working", "run", "review")):
        return f"🚧 {name_clean} in progress"
    else:
        return f"📋 {name_clean} ({status if status else 'Pending'})"
