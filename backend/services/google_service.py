import requests

def extract_meet_link(event):
    conference = event.get("conferenceData", {})
    for entry in conference.get("entryPoints", []):
        if entry.get("entryPointType") == "video":
            return entry.get("uri")
    
    if event.get("hangoutLink"):
        return event.get("hangoutLink")
        
    return None

def classify_event(event):
    meet_link = extract_meet_link(event)
    if meet_link:
        return "meeting"
    return "calendar_event"

def detect_priority(event):
    title = event.get("summary", "").lower() if event.get("summary") else ""
    if any(word in title for word in ["urgent", "client", "investor", "demo"]):
        return "high"
    return "normal"

def get_normalized_calendar_events(access_token, time_min=None, time_max=None):
    params = {
        "conferenceDataVersion": 1,
        "singleEvents": "true",
        "orderBy": "startTime"
    }
    if time_min:
        params["timeMin"] = time_min
    if time_max:
        params["timeMax"] = time_max
        
    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    headers = {"Authorization": f"Bearer {access_token}"}
    res = requests.get(url, headers=headers, params=params, timeout=10)
    
    if res.status_code != 200:
        # Fallback or return empty list if request failed (e.g. 401 token expired)
        return []
        
    events_data = res.json()
    events = events_data.get("items", [])
    
    results = []
    for event in events:
        meet_link = extract_meet_link(event)
        event_type = classify_event(event)
        priority = detect_priority(event)
        
        attendees = ", ".join([att.get('email') for att in event.get('attendees', []) if not att.get('self')])
        
        results.append({
            "type": event_type,
            "source": "google_calendar",
            "actor": attendees or "Solo",
            "title": event.get("summary", "No Title"),
            "content": f"📹 Google Meet: {meet_link}\n\n{event.get('description', '')}".strip() if meet_link else (event.get("description", "") or ""),
            "timestamp": event.get("start", {}).get("dateTime") or event.get("start", {}).get("date"),
            "priority": priority,
            "status": event.get("status", "confirmed"),
            "raw_ref": event.get("id"),
            "metadata": {
                "meet_link": meet_link,
                "attendees": event.get("attendees", [])
            }
        })
    return results

def get_gmail_messages(access_token):
    url = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    headers = {"Authorization": f"Bearer {access_token}"}
    res = requests.get(url, headers=headers, timeout=10)
    return res.json()