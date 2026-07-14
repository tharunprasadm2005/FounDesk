from flask import Blueprint, request, jsonify
from config.database import db
from models.workspace import Workspace
from models.user_integration import UserIntegration
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from services.briefing import refresh_google_token
import datetime
import requests

calendar_defense_bp = Blueprint('calendar_defense', __name__)

def parse_time_to_minutes(dt_str):
    # Parses ISO string time portion to minutes from midnight
    if not dt_str:
        return None
    try:
        # e.g., "2026-06-10T10:00:00+05:30" or "2026-06-10T10:00:00Z"
        if "T" in dt_str:
            time_part = dt_str.split("T")[1][:5] # "10:00"
            h, m = map(int, time_part.split(":"))
            return h * 60 + m
    except Exception:
        pass
    return None

@calendar_defense_bp.route('/calendar/defense', methods=['GET'])
@token_required
def get_calendar_defense(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    # Load calendar rules
    rules = ws.calendar_rules or {}
    start_hour = int(rules.get("start_hour", 9))
    end_hour = int(rules.get("end_hour", 18))

    # Fetch user integrations
    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    connected_providers = {integration.provider: integration for integration in integrations}

    if 'google' in connected_providers:
        google_integration = connected_providers['google']
        connected_providers['google_calendar'] = google_integration

    events_list = []
    is_mock = True

    if 'google_calendar' in connected_providers:
        integration = connected_providers['google_calendar']
        if not integration.access_token.startswith("mock_"):
            is_mock = False
            try:
                headers = {"Authorization": f"Bearer {integration.access_token}"}
                now = datetime.datetime.utcnow()
                start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
                end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=0).isoformat() + "Z"
                
                cal_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={start_of_day}&timeMax={end_of_day}&orderBy=startTime&singleEvents=true"
                cal_res = requests.get(cal_url, headers=headers, timeout=5)
                
                if cal_res.status_code in (401, 403):
                    if refresh_google_token(integration):
                        headers = {"Authorization": f"Bearer {integration.access_token}"}
                        cal_res = requests.get(cal_url, headers=headers, timeout=5)
                
                if cal_res.status_code == 200:
                    items = cal_res.json().get('items', [])
                    for ev in items:
                        start_dt = ev.get('start', {}).get('dateTime') or ev.get('start', {}).get('date')
                        end_dt = ev.get('end', {}).get('dateTime') or ev.get('end', {}).get('date')
                        is_all_day = ev.get('start', {}).get('date') is not None
                        is_recurring = ev.get('recurringEventId') is not None or ev.get('recurrence') is not None
                        events_list.append({
                            "title": ev.get('summary', 'Untitled Event'),
                            "start": start_dt,
                            "end": end_dt,
                            "is_all_day": is_all_day,
                            "is_recurring": is_recurring,
                            "event_id": ev.get('id', ''),
                        })
            except Exception as e:
                print("Failed to fetch real Google Calendar events, falling back to mock:", e)
                is_mock = True

    if is_mock:
        events_list = []

    # Filter out all-day events (OOO, holidays)
    timed_events = [ev for ev in events_list if not ev.get("is_all_day")]

    # Map events to busy slots, tracking which meeting occupies each slot
    busy_slots = []  # (start_min, end_min, title, is_recurring)
    for ev in timed_events:
        s_min = parse_time_to_minutes(ev.get('start'))
        e_min = parse_time_to_minutes(ev.get('end'))
        if s_min is not None and e_min is not None:
            busy_slots.append((s_min, e_min, ev.get("title", "Untitled"), ev.get("is_recurring", False)))

    # Sort busy slots by start time
    busy_slots.sort(key=lambda x: x[0])

    # Calculate free contiguous slots (minimum 120 minutes)
    suggestions = []
    current_time = start_hour * 60
    end_boundary = end_hour * 60

    # Merge overlapping slots (keeping meeting info)
    merged_busy = []  # (start_min, end_min, [meeting_titles], [is_recurring])
    for slot in busy_slots:
        start, end, title, is_rec = slot
        if not merged_busy:
            merged_busy.append([start, end, [title], [is_rec]])
        else:
            prev_start, prev_end, titles, recs = merged_busy[-1]
            if start <= prev_end:
                merged_busy[-1] = [prev_start, max(prev_end, end), titles + [title], recs + [is_rec]]
            else:
                merged_busy.append([start, end, [title], [is_rec]])

    # Identify meetings that are candidates for decline/reschedule
    decline_candidates = []
    for start, end, titles, recs in merged_busy:
        is_block_recurring = any(recs)
        if not is_block_recurring:
            for t in titles:
                if t.lower() not in ("focus time", "deep work", "blocked", "lunch", "break"):
                    decline_candidates.append({"title": t, "start_mins": start, "end_mins": end})

    # Calculate gaps
    for merged in merged_busy:
        start, end = merged[0], merged[1]
        if start > current_time:
            gap = start - current_time
            if gap >= 120:
                suggestions.append({
                    "start_mins": current_time,
                    "end_mins": start,
                    "duration_hours": round(gap / 60.0, 1)
                })
        current_time = max(current_time, end)

    if end_boundary > current_time:
        gap = end_boundary - current_time
        if gap >= 120:
            suggestions.append({
                "start_mins": current_time,
                "end_mins": end_boundary,
                "duration_hours": round(gap / 60.0, 1)
            })

    # Format suggestions into readable time ranges
    today_str = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    formatted_suggestions = []
    for sug in suggestions:
        sh = sug["start_mins"] // 60
        sm = sug["start_mins"] % 60
        eh = sug["end_mins"] // 60
        em = sug["end_mins"] % 60
        
        start_time_str = f"{sh:02d}:{sm:02d}"
        end_time_str = f"{eh:02d}:{em:02d}"
        
        formatted_suggestions.append({
            "start": f"{today_str}T{start_time_str}:00",
            "end": f"{today_str}T{end_time_str}:00",
            "start_display": f"{sh%12 or 12}:{sm:02d} {'PM' if sh >= 12 else 'AM'}",
            "end_display": f"{eh%12 or 12}:{em:02d} {'PM' if eh >= 12 else 'AM'}",
            "duration_hours": sug["duration_hours"]
        })

    # Format decline candidates
    formatted_decline = []
    for dc in decline_candidates[:5]:
        sh = dc["start_mins"] // 60
        sm = dc["start_mins"] % 60
        eh = dc["end_mins"] // 60
        em = dc["end_mins"] % 60
        formatted_decline.append({
            "title": dc["title"],
            "start_display": f"{sh%12 or 12}:{sm:02d} {'PM' if sh >= 12 else 'AM'}",
            "end_display": f"{eh%12 or 12}:{em:02d} {'PM' if eh >= 12 else 'AM'}",
            "reason": "Overlaps with recommended deep work block",
        })

    is_overloaded = len(formatted_suggestions) == 0
    overload_severity = "high" if is_overloaded else "low"

    return jsonify({
        "calendar_rules": {
            "start_hour": start_hour,
            "end_hour": end_hour
        },
        "suggestions": formatted_suggestions,
        "decline_candidates": formatted_decline,
        "is_overloaded": is_overloaded,
        "overload_severity": overload_severity,
        "total_events_today": len(timed_events),
        "all_day_events": len([ev for ev in events_list if ev.get("is_all_day")]),
        "recurring_events": len([ev for ev in events_list if ev.get("is_recurring")]),
    })

def book_calendar_defense_for_user(current_user_id, start_time, end_time):
    if not start_time or not end_time:
        return jsonify({"error": "Start time and end time are required"}), 400

    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    connected_providers = {integration.provider: integration for integration in integrations}

    if 'google' in connected_providers:
        google_integration = connected_providers['google']
        connected_providers['google_calendar'] = google_integration

    is_mock = True
    if 'google_calendar' in connected_providers:
        integration = connected_providers['google_calendar']
        if not integration.access_token.startswith("mock_"):
            is_mock = False
            try:
                headers = {
                    "Authorization": f"Bearer {integration.access_token}",
                    "Content-Type": "application/json"
                }
                import uuid
                event_payload = {
                    "summary": "🔒 Deep Work: Focus Block",
                    "description": "Auto-booked by FounDesk Calendar Defense to protect deep work block.",
                    "start": {"dateTime": start_time, "timeZone": "UTC"},
                    "end": {"dateTime": end_time, "timeZone": "UTC"},
                    "conferenceData": {
                        "createRequest": {
                            "requestId": str(uuid.uuid4()),
                            "conferenceSolutionKey": {"type": "hangoutsMeet"}
                        }
                    }
                }
                cal_url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
                res = requests.post(cal_url, json=event_payload, headers=headers, timeout=5)
                if res.status_code in (401, 403):
                    if refresh_google_token(integration):
                        headers["Authorization"] = f"Bearer {integration.access_token}"
                        res = requests.post(cal_url, json=event_payload, headers=headers, timeout=5)
                res.raise_for_status()
                return jsonify({"message": "Successfully auto-booked focus block on Google Calendar!", "event": res.json()}), 201
            except Exception as e:
                print("Failed to auto-book Google Calendar event, falling back to mock:", e)
                is_mock = True

    if is_mock:
        return jsonify({
            "message": "Successfully auto-booked focus block (Simulated).",
            "event": {
                "summary": "🔒 Deep Work: Focus Block",
                "start": {"dateTime": start_time},
                "end": {"dateTime": end_time}
            }
        }), 201

@calendar_defense_bp.route('/calendar/book', methods=['POST'])
@token_required
def book_calendar_defense_route(current_user_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    return book_calendar_defense_for_user(current_user_id, data.get('start_time'), data.get('end_time'))

@calendar_defense_bp.route('/calendar/defense/suggestion', methods=['POST'])
@token_required
def handle_defense_suggestion(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data or not data.get('action') or not data.get('start_time') or not data.get('end_time'):
        return jsonify({"error": "action, start_time, and end_time are required"}), 400

    action = data.get('action')
    if action not in ('approved', 'rejected'):
        return jsonify({"error": "action must be 'approved' or 'rejected'"}), 400

    if action == 'approved':
        return book_calendar_defense_for_user(current_user_id, data.get('start_time'), data.get('end_time'))

    return jsonify({"message": "Suggestion dismissed"}), 200


@calendar_defense_bp.route('/calendar/defense/rules', methods=['GET'])
@token_required
def get_calendar_rules(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    ws = Workspace.query.get(workspace_id)
    rules = ws.calendar_rules if ws and ws.calendar_rules else {}
    start_hour = int(rules.get("start_hour", 9))
    end_hour = int(rules.get("end_hour", 18))

    start_meridiem = "am" if start_hour < 12 else "pm"
    start_display = f"{start_hour % 12 or 12}{start_meridiem}"

    total_avail = end_hour - start_hour

    rule_chips = [
        {"icon": "shield", "label": f"No meetings before {start_display}"},
        {"icon": "shield", "label": f"{max(total_avail // 2, 2)}hrs deep work daily"},
    ]

    # Fetch events to detect meetings that overlap with deep work blocks
    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    connected_providers = {integration.provider: integration for integration in integrations}
    if 'google' in connected_providers:
        connected_providers['google_calendar'] = connected_providers['google']

    events_list = []
    has_real_calendar = False
    if 'google_calendar' in connected_providers:
        integration = connected_providers['google_calendar']
        if not integration.access_token.startswith("mock_"):
            has_real_calendar = True
            try:
                headers = {"Authorization": f"Bearer {integration.access_token}"}
                now = datetime.datetime.utcnow()
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
                today_end = now.replace(hour=23, minute=59, second=59, microsecond=0).isoformat() + "Z"
                cal_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={today_start}&timeMax={today_end}&orderBy=startTime&singleEvents=true"
                cal_res = requests.get(cal_url, headers=headers, timeout=5)
                if cal_res.status_code in (401, 403):
                    if refresh_google_token(integration):
                        headers["Authorization"] = f"Bearer {integration.access_token}"
                        cal_res = requests.get(cal_url, headers=headers, timeout=5)
                if cal_res.status_code == 200:
                    events_list = cal_res.json().get('items', [])
            except Exception as e:
                print("Failed to fetch calendar events for rules:", e)

    # Separate recurring and one-off events
    recurring_events = []
    one_off_events = []
    for ev in events_list:
        start_dt = ev.get('start', {}).get('dateTime')
        end_dt = ev.get('end', {}).get('dateTime')
        is_recurring = ev.get('recurringEventId') is not None or ev.get('recurrence') is not None
        is_all_day = ev.get('start', {}).get('date') is not None
        if is_all_day:
            continue  # Skip all-day events
        if not start_dt or not end_dt:
            continue
        event_data = {"title": ev.get('summary', 'Untitled'), "start": start_dt, "end": end_dt, "is_recurring": is_recurring}
        if is_recurring:
            recurring_events.append(event_data)
        else:
            one_off_events.append(event_data)

    # Build meeting move suggestions (prioritize one-off meetings over recurring)
    move_suggestions = []
    # First pass: one-off events
    for ev in one_off_events + recurring_events:
        s_min = parse_time_to_minutes(ev['start'])
        e_min = parse_time_to_minutes(ev['end'])
        if s_min is None or e_min is None:
            continue
        for goal_start in range(start_hour * 60, end_hour * 60, 120):
            goal_end = min(goal_start + 120, end_hour * 60)
            if s_min < goal_end and e_min > goal_start:
                overlap_start = max(s_min, goal_start)
                overlap_end = min(e_min, goal_end)
                overlap_mins = overlap_end - overlap_start
                if overlap_mins >= 30:
                    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                    tomorrow_idx = (datetime.datetime.utcnow().weekday() + 1) % 7
                    tomorrow_name = day_names[tomorrow_idx]
                    move_suggestions.append({
                        "meeting_title": ev["title"],
                        "action": f"Move → {tomorrow_name}, to protect deep work",
                        "start_time": ev["start"],
                        "end_time": ev["end"],
                        "overlap_mins": overlap_mins,
                        "is_recurring": ev.get("is_recurring", False),
                        "decline_reason": "Recurring — consider rescheduling pattern" if ev.get("is_recurring") else "One-off — suggest declining",
                    })
                    break

    return jsonify({
        "rules": rule_chips,
        "suggestions": move_suggestions[:5],
        "summary": {
            "total_events": len(events_list),
            "recurring": len(recurring_events),
            "one_off": len(one_off_events),
            "all_day_skipped": len([ev for ev in events_list if ev.get('start', {}).get('date') is not None]),
        }
    })
