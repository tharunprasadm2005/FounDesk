import hashlib
import re
from datetime import datetime, timedelta, timezone

NOTIFICATION_SENDERS = [
    "no-reply@", "team@mail.", "info@e.", "learn@go.",
    "noreply@", "notifications@", "mail@", "newsletter@",
    "announcements@", "updates@", "hello@", "team@learn.",
    "send.", "mail.mond", "market@", "promo@", "marketing@"
]

ONBOARDING_PATTERNS = [
    "welcome to", "you started your", "new to ", "turn conversations into action",
    "organization made easy", "get started with", "we've got you",
    "tasks due soon", "introducing", "check out", "tips for using",
    "how to use", "welcome aboard", "the one thing your work is missing",
    "reduce meeting no-shows", "run all your work from one place",
    "turn chaos into cash flow", "stop deciding alone"
]

def is_notification_or_onboarding(title, actor):
    title_lower = title.lower()
    actor_lower = actor.lower()
    for sender in NOTIFICATION_SENDERS:
        if sender in actor_lower:
            return True
    for pattern in ONBOARDING_PATTERNS:
        if pattern in title_lower:
            return True
    return False


def extract_priority_actions(feed_items):
    actions = []
    
    for item in feed_items:
        # Check high priority triggers
        if item.get("priority") == "high":
            title = item.get("title") or ""
            actor = item.get("actor") or "Unknown"
            timestamp = item.get("timestamp") or "1970-01-01T00:00:00"
            
            # Skip notification and onboarding emails
            if is_notification_or_onboarding(title, actor):
                continue
            
            # Gmail Action
            if item.get("source") == "gmail":
                clean_title = re.sub(r'^(Re:\s*|Fwd:\s*)+', '', title, flags=re.IGNORECASE)
                actions.append({
                    "title": f"Reply to important email: \"{clean_title}\" from {actor}",
                    "ref": item.get("hash") or item.get("id"),
                    "type": "email",
                    "priority_score": 3,
                    "timestamp": timestamp
                })
            # Stuck / Blocked Task Action
            elif item.get("type") == "task" and any(k in title.lower() for k in ("blocked", "stuck")):
                clean_title = title.replace("⚠️", "").strip()
                actions.append({
                    "title": f"Resolve blocked task: \"{clean_title}\"",
                    "ref": item.get("hash") or item.get("id"),
                    "type": "task",
                    "priority_score": 2,
                    "timestamp": timestamp
                })
            # Meeting Prep Action
            elif item.get("type") == "meeting":
                actions.append({
                    "title": f"Prepare for upcoming meeting: \"{title}\"",
                    "ref": item.get("hash") or item.get("id"),
                    "type": "meeting",
                    "priority_score": 1,
                    "timestamp": timestamp
                })
                
    # Sort actions by weight DESC, then recency DESC
    actions.sort(key=lambda x: (x["priority_score"], x["timestamp"]), reverse=True)
    
    # Strip sorting attributes before returning to match expected format
    cleaned_actions = []
    for act in actions[:5]:
        cleaned_actions.append({
            "title": act["title"],
            "ref": act["ref"],
            "type": act["type"]
        })
        
    return {"actions": cleaned_actions}


def extract_alerts(feed):
    alerts = []
    now = datetime.utcnow()
    
    blocked_count = 0
    blocked_titles = []
    meeting_alerts = []
    
    for item in feed:
        title = item.get("title") or ""
        ts_str = item.get("timestamp")
        
        # 1. Meeting Alert Check (starts within 1 hour)
        if item.get("type") == "meeting" and ts_str:
            try:
                clean_ts = ts_str.replace("Z", "+00:00")
                parsed = datetime.fromisoformat(clean_ts)
                ts = parsed.astimezone(datetime.timezone.utc).replace(tzinfo=None) if parsed.tzinfo else parsed
                    
                time_diff = ts - now
                if timedelta(seconds=0) <= time_diff <= timedelta(hours=1):
                    minutes = int(time_diff.total_seconds() / 60)
                    meeting_alerts.append(f"Meeting in {minutes} minutes: \"{title}\"")
            except Exception as e:
                print("Error parsing timestamp in alert extraction:", e)
                
        # 2. Blocked Task Alert Check
        if item.get("type") == "task" and any(k in title.lower() for k in ("blocked", "stuck")):
            blocked_count += 1
            blocked_titles.append(title.replace("⚠️", "").strip())
            
    # Aggregate blocked task alerts to prevent spam
    if blocked_count > 1:
        alerts.append(f"⚠️ {blocked_count} blocked tasks need attention")
    elif blocked_count == 1:
        alerts.append(f"⚠️ Blocked task needs attention: \"{blocked_titles[0]}\"")
        
    # Append time-bounded meeting alerts
    for m_alert in meeting_alerts[:2]:
        alerts.append(f"📅 {m_alert}")
        
    return {"alerts": alerts[:3]}
