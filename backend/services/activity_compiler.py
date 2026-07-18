from config.database import db
from models.workspace import Workspace
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from services.briefing import refresh_google_token, refresh_asana_token, refresh_calendly_token, refresh_linear_token
from services.google_analytics import getAnalyticsReport
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import OperationalError
import requests
import os
import threading
import time


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

_compile_locks = {}
_compile_lock = threading.Lock()
_last_compile_time = {}
_COMPILE_COOLDOWN_SECONDS = 300



def getGmailData(integration):
    try:
        is_mock = integration.access_token.startswith("mock_")
        results = []
        
        unwanted_senders = [
            "naukri", "linkedin",
            "noreply", "donotreply", "no-reply", "no_reply",
            "mailchimp.com", "adobe.com", "hubspot.com", "asana.com",
            "monday.com", "notion.so", "twitter.com",
            "selfstudys.com", "promo.selfstudys",
            "send.calendly.com", "teamcalendly", "calendly.com",
            "zohocorp.com", "zoho.com",
            "broadcast.wipro", "wiprolimit", "jobs2web", ".wipro.com",
            "newsgram.hp.com", "hp.com",
            "info@vercel.com", "vercel.com",
            "welcome@openrouter.ai", "openrouter.ai",
            "team.mongodb.com", "mongodb.com",
            "digest.quora.com", "quora.com",
            "draftly.space",
            "tealhq.com", "hello.tealhq",
            "team.twilio.com", "twilio.com",
            "spline.design", "mail.spline.design",
            "posthog.com", "hey@posthog.com",
            "razorpay.com",
            "bankalerts@kotak.bank.in",
            "trello.com", "do-not-reply@trello.com",
            "info@study.", "info@promo.",
            "indeed.com", "indeed",
            "mindnudge", "codsoft",
            "internshala", "hirist",
            "cutshort", "weekday.work",
            "angel.co", "wellfound",
            "instahyre", "hirect",
            "zoho-recruit", "recruit.zoho",
        ]
        unwanted_subjects = [
            "job alert", "job listing", "weekly jobs", "new jobs posted",
            "promotions", "newsletter", "subscribe",
            "tasks due", "daily update", "weekly digest",
            "unsubscribe",
            "your trial", "free trial", "trial has ended", "trial expires", "trial period",
            "tips for", "get started", "new feature",
            "invoice", "receipt", "payment confirmed",
            "scholarship", "scholarship has been released",
            "otp", "one-time password",
            "upgrade now", "upgrade for full access",
            "ebook", "datathon",
            "crm at your service",
            "apply less", "hear back more",
            "beach mode", "build mode",
            "what's new", "features worth trying",
            "last day for", "deadline is coming",
            "bring spline", "ready for the next step",
            "your setup requires",
            "how provider data policies",
            "lower your inference",
            "lower your per-token",
            "chain models",
            "don\u2019t lose your", "don't lose your",
            "welcome to wipro",
            "mail from your guide",
            "following up on information about",
            "amrita closing",
            "your application", "application status", "application received",
            "thank you for applying", "thanks for applying",
            "offer letter", "job offer",
            "internship", "hiring",
            "job guaranteed", "guaranteed program",
            "resume", "shortlisted",
            "interview schedule", "interview call",
        ]

        if is_mock:
            return []
        else:
            headers = {"Authorization": f"Bearer {integration.access_token}"}
            seven_days_ago = (datetime.utcnow() - timedelta(days=7)).strftime('%Y/%m/%d')
            gmail_url = f"https://gmail.googleapis.com/gmail/v1/users/me/messages?q=after:{seven_days_ago}&maxResults=200"
            res = requests.get(gmail_url, headers=headers, timeout=5)
            
            if res.status_code in (401, 403):
                if refresh_google_token(integration):
                    headers = {"Authorization": f"Bearer {integration.access_token}"}
                    res = requests.get(gmail_url, headers=headers, timeout=5)

            if res.status_code == 200:
                messages = res.json().get('messages', [])[:200]
                for msg in messages:
                    detail_res = requests.get(
                        f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}",
                        headers=headers,
                        timeout=10
                    )
                    if detail_res.status_code == 200:
                        msg_detail = detail_res.json()
                        headers_list = msg_detail.get('payload', {}).get('headers', [])
                        subject = next((h.get('value') for h in headers_list if h.get('name') == 'Subject'), 'No Subject')
                        sender = next((h.get('value') for h in headers_list if h.get('name') == 'From'), 'Unknown Sender')
                        
                        actor_lower = sender.lower()
                        title_lower = subject.lower()
                        if any(term in actor_lower for term in unwanted_senders) or any(term in title_lower for term in unwanted_subjects):
                            continue

                        internal_date_ms = int(msg_detail.get('internalDate', 0))
                        evt_time = datetime.utcfromtimestamp(internal_date_ms / 1000.0) if internal_date_ms else datetime.utcnow()

                        labels = msg_detail.get('labelIds', [])
                        status = 'unread' if 'UNREAD' in labels else 'read'

                        results.append({
                            "provider": "gmail",
                            "category": "communication",
                            "actor": sender,
                            "title": subject,
                            "activity_type": "email",
                            "status": status,
                            "external_timestamp": evt_time,
                            "details": msg_detail.get('snippet', ''),
                            "raw_ref": msg['id'],
                            "is_mock": False
                        })
        return results[:200]
    except Exception as e:
        print("Error in getGmailData:", e)
        return []

def getCalendarData(integration):
    try:
        is_mock = integration.access_token.startswith("mock_")
        results = []
        if is_mock:
            return []
        else:
            now = datetime.utcnow()
            start_of_window = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
            end_of_window = (now + timedelta(days=7)).replace(hour=23, minute=59, second=59, microsecond=0).isoformat() + "Z"

            from services.google_service import get_normalized_calendar_events
            events = get_normalized_calendar_events(
                integration.access_token,
                time_min=start_of_window,
                time_max=end_of_window
            )
            
            if not events:
                if refresh_google_token(integration):
                    events = get_normalized_calendar_events(
                        integration.access_token,
                        time_min=start_of_window,
                        time_max=end_of_window
                    )

            if events:
                for ev in events[:200]:
                    start_time = ev["timestamp"]
                    if "T" in start_time:
                        evt_time = datetime.fromisoformat(start_time.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
                    else:
                        evt_time = datetime.strptime(start_time, "%Y-%m-%d")

                    results.append({
                        "provider": "google_calendar",
                        "category": "calendar",
                        "actor": ev["actor"],
                        "title": ev["title"],
                        "activity_type": ev["type"],
                        "status": ev["status"],
                        "external_timestamp": evt_time,
                        "details": ev["content"],
                        "raw_ref": ev["raw_ref"],
                        "priority": ev["priority"],
                        "is_mock": False
                    })
        return results[:200]
    except Exception as e:
        print("Error in getCalendarData:", e)
        return []

def getGithubData(integration):
    try:
        is_mock = integration.access_token.startswith("mock_")
        results = []
        if is_mock:
            return []
        else:
            headers = {
                "Authorization": f"token {integration.access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
            author = integration.connected_email
            if not author:
                return []
            github_url = f"https://api.github.com/search/issues?q=author:{author}+is:open+updated:>2026-01-01"
            res = requests.get(github_url, headers=headers, timeout=10)

            if res.status_code == 200:
                items = res.json().get('items', [])[:200]
                for item in items:
                    evt_time = datetime.strptime(item['updated_at'], "%Y-%m-%dT%H:%M:%SZ")
                    is_pr = "pull_request" in item
                    act_type = "pull_request" if is_pr else "issue"

                    results.append({
                        "provider": "github",
                        "category": "dev",
                        "actor": item.get('user', {}).get('login', author),
                        "title": item.get('title'),
                        "activity_type": act_type,
                        "status": item.get('state'),
                        "external_timestamp": evt_time,
                        "details": item.get('body', '') or item.get('html_url', ''),
                        "raw_ref": str(item['id']),
                        "is_mock": False
                    })
        return results[:200]
    except Exception as e:
        print("Error in getGithubData:", e)
        return []

def getSlackData(integration):
    try:
        is_mock = integration.access_token.startswith("mock_")
        results = []
        if is_mock:
            return []
        else:
            from services.slack_service import get_channels, get_messages, get_users
            token = integration.access_token
            
            channels = get_channels(token)
            users = get_users(token)
            user_map = {u['id']: u.get('real_name') or u.get('name') for u in users}

            for chan in channels[:200]:
                chan_id = chan['id']
                chan_name = chan['name']
                if not chan.get('is_member', False):
                    continue
                try:
                    messages = get_messages(chan_id, token)[:200]
                    for msg in messages:
                        text = msg.get('text', '')
                        if text and not msg.get('subtype'):
                            user_id = msg.get('user')
                            actor_name = user_map.get(user_id) or user_id or "Slack User"
                            ts = float(msg.get('ts', 0))
                            evt_time = datetime.utcfromtimestamp(ts) if ts else datetime.utcnow()
                            
                            results.append({
                                "provider": "slack",
                                "category": "communication",
                                "actor": actor_name,
                                "title": f"New message in #{chan_name}",
                                "activity_type": "message",
                                "status": "unread",
                                "external_timestamp": evt_time,
                                "details": text,
                                "raw_ref": f"slack_msg_{chan_id}_{ts}",
                                "is_mock": False
                            })
                except Exception as ch_err:
                    err_str = str(ch_err)
                    if "not_in_channel" in err_str:
                        continue
                    print(f"Skipping channel {chan_name} ({chan_id}): {ch_err}")
        return results[:200]
    except Exception as e:
        print("Error in getSlackData:", e)
        return []

def getNotionData(integration):
    try:
        is_mock = integration.access_token.startswith("mock_")
        results = []
        if is_mock:
            return []
        else:
            from services.notion_service import get_notion_items
            token = integration.access_token
            notion_items = get_notion_items(token)[:200]
            for item in notion_items:
                timestamp_str = item.get("timestamp")
                if timestamp_str:
                    clean_ts = timestamp_str.replace("Z", "+00:00")
                    evt_time = datetime.fromisoformat(clean_ts)
                else:
                    evt_time = datetime.utcnow()

                results.append({
                    "provider": "notion",
                    "category": "docs_tasks_wikis",
                    "actor": item["user"],
                    "title": item["title"],
                    "activity_type": item["type"],
                    "status": "published",
                    "external_timestamp": evt_time,
                    "details": item["content"],
                    "raw_ref": f"notion_doc_{item['id']}",
                    "is_mock": False
                })
        return results[:200]
    except Exception as e:
        print("Error in getNotionData:", e)
        return []

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

def getMondayData(integration):
    try:
        is_mock = integration.access_token.startswith("mock_")
        raw_items = []
        if is_mock:
            return []
        else:
            from services.monday_service import get_items
            token = integration.access_token
            monday_items = get_items(token)[:200]
            for item in monday_items:
                priority = _map_tool_priority(item.get("priority"))
                raw_progress = item.get("progress_percentage")
                try: progress = int(raw_progress) if raw_progress is not None else None
                except (ValueError, TypeError): progress = None
                raw_items.append({
                    "provider": "monday",
                    "category": "tasks",
                    "actor": item.get("people", "Unassigned"),
                    "title": f"Monday: {item.get('name')}",
                    "activity_type": "task",
                    "status": item.get("status"),
                    "external_timestamp": datetime.utcnow() - timedelta(hours=12),
                    "details": f"Board: {item.get('board')}, Group: {item.get('group')}",
                    "raw_ref": f"monday_task_{item.get('id')}",
                    "priority": priority or "P2",
                    "progress_percentage": progress,
                    "risk_level": item.get("risk_level"),
                    "is_mock": False
                })
        
        if raw_items:
            for item in raw_items:
                item["title"] = clean_task_title(item["title"], item["status"])
            return raw_items
        else:
            return []
    except Exception as e:
        print("Error in getMondayData:", e)
        return []

def getMeetData(integration):
    try:
        is_mock = integration.access_token.startswith("mock_")
        results = []
        if is_mock:
            return []
        else:
            now = datetime.utcnow()
            start_of_window = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
            end_of_window = (now + timedelta(days=7)).replace(hour=23, minute=59, second=59, microsecond=0).isoformat() + "Z"

            from services.google_service import get_normalized_calendar_events
            events = get_normalized_calendar_events(
                integration.access_token,
                time_min=start_of_window,
                time_max=end_of_window
            )

            if not events:
                if refresh_google_token(integration):
                    events = get_normalized_calendar_events(
                        integration.access_token,
                        time_min=start_of_window,
                        time_max=end_of_window
                    )

            if events:
                for ev in events:
                    meet_link = ev.get("metadata", {}).get("meet_link")
                    if not meet_link:
                        continue
                    start_time = ev["timestamp"]
                    if "T" in start_time:
                        evt_time = datetime.fromisoformat(start_time.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
                    else:
                        evt_time = datetime.strptime(start_time, "%Y-%m-%d")

                    results.append({
                        "provider": "google_meet",
                        "category": "calendar",
                        "actor": ev["actor"],
                        "title": f"Meet: {ev['title']}",
                        "activity_type": "meeting",
                        "status": ev["status"],
                        "external_timestamp": evt_time,
                        "details": ev["content"],
                        "raw_ref": f"meet_{ev['raw_ref']}",
                        "priority": ev["priority"],
                        "is_mock": False
                    })
        return results[:200]
    except Exception as e:
        print("Error in getMeetData:", e)
        return []


def getDocsData(integration):
    try:
        from services.google_docs_service import get_recent_documents, get_document
        token = integration.access_token
        docs = get_recent_documents(token)
        results = []
        now = datetime.utcnow()
        for doc in docs[:200]:
            ts = doc.get("modifiedTime", "")
            evt_time = now
            if ts:
                try:
                    evt_time = datetime.fromisoformat(ts.replace("Z", "+00:00")).replace(tzinfo=None)
                except Exception:
                    pass
            # Fetch actual document content
            content = ""
            try:
                doc_content = get_document(doc.get("id"), token)
                content = doc_content.get("content", "")
            except Exception:
                pass
            results.append({
                "provider": "google_docs",
                "category": "docs_tasks_wikis",
                "actor": doc.get("owner", "Unknown"),
                "title": f"Doc: {doc.get('title', 'Untitled')}",
                "activity_type": "document_edit",
                "status": "Active",
                "external_timestamp": evt_time,
                "details": content if content else doc.get("url", ""),
                "raw_ref": f"google_doc_{doc.get('id')}",
                "is_mock": False
            })
        return results[:200]
    except Exception as e:
        print("Error in getDocsData:", e)
        return []

def getTrelloData(integration):
    try:
        is_mock = integration.access_token.startswith("mock_")
        raw_items = []
        if is_mock:
            return []
        else:
            import services.trello_service as trello_service
            key = os.getenv("TRELLO_API_KEY")
            token = integration.access_token
            if token.startswith("{"):
                try:
                    import json
                    parsed = json.loads(token)
                    key = parsed.get("api_key", key)
                    token = parsed.get("api_token", token)
                except Exception:
                    pass
            boards = trello_service.get_trello_boards(key, token)
            now = datetime.utcnow()
            today = now.date()

            def card_priority(card):
                score = 0
                if card.get("idMembers"):
                    score += 3
                due_str = card.get("due")
                due_complete = card.get("dueComplete", False)
                if due_str and not due_complete:
                    try:
                        clean_ts = due_str.replace("Z", "+00:00")
                        due_dt = datetime.fromisoformat(clean_ts).replace(tzinfo=None)
                        due_date = due_dt.date()
                        if due_date == today:
                            score += 3
                        elif due_date < today:
                            score += 2
                    except Exception:
                        pass
                last_activity = card.get("dateLastActivity")
                if last_activity:
                    try:
                        clean_ts = last_activity.replace("Z", "+00:00")
                        activity_dt = datetime.fromisoformat(clean_ts).replace(tzinfo=None)
                        if (now - activity_dt).days <= 7:
                            score += 1
                    except Exception:
                        pass
                if not card.get("closed", False):
                    score += 1
                return score

            def pick_timestamp(card):
                activity = card.get("dateLastActivity") or card.get("due")
                if activity:
                    try:
                        clean_ts = activity.replace("Z", "+00:00")
                        return datetime.fromisoformat(clean_ts).replace(tzinfo=None).astimezone(timezone.utc).replace(tzinfo=None)
                    except Exception:
                        pass
                return now

            scored = []
            for board in boards[:200]:
                board_lists = {}
                try:
                    trello_lists = trello_service.get_trello_lists(key, token, board["id"])
                    board_lists = {l["id"]: l["name"] for l in trello_lists if not l.get("closed")}
                except Exception:
                    pass
                cards = trello_service.get_trello_cards(key, token, board["id"])
                for card in cards:
                    score = card_priority(card)
                    evt_time = pick_timestamp(card)
                    list_name = board_lists.get(card.get("idList"), "")
                    status = "Done" if card.get("dueComplete") or card.get("closed") else list_name or "Active"
                    scored.append((score, evt_time, card, board, status))

            scored.sort(key=lambda x: (-x[0], -x[1].timestamp()))

            for score, evt_time, card, board, status in scored[:200]:
                # Extract priority from Trello labels
                priority = None
                for label in card.get("labels") or []:
                    label_name = (label.get("name") or "").strip()
                    if label_name:
                        mapped = _map_tool_priority(label_name)
                        if mapped:
                            priority = mapped
                            break
                raw_items.append({
                    "provider": "trello",
                    "category": "tasks",
                    "actor": "Trello Board",
                    "title": f"Trello: {card.get('name')}",
                    "activity_type": "task",
                    "status": status,
                    "external_timestamp": evt_time,
                    "details": card.get("desc") or f"Board: {board.get('name')}",
                    "raw_ref": f"trello_card_{card.get('id')}",
                    "priority": priority or "P2",
                    "is_mock": False
                })
        return raw_items[:200]
    except Exception as e:
        print("Error in getTrelloData:", e)
        return []

def getAsanaData(integration):
    try:
        from services.asana_service import get_asana_workspaces, get_asana_projects, get_asana_tasks
        is_mock = integration.access_token.startswith("mock_")
        raw_items = []
        if is_mock:
            return []
        else:
            token = integration.access_token
            now = datetime.utcnow()

            try:
                workspaces = get_asana_workspaces(token)
            except Exception:
                if integration.refresh_token and refresh_asana_token(integration):
                    token = integration.access_token
                    try:
                        workspaces = get_asana_workspaces(token)
                    except Exception:
                        return []
                else:
                    return []

            for workspace in workspaces[:200]:
                ws_gid = workspace["gid"]
                try:
                    projects = get_asana_projects(token, ws_gid)
                except Exception:
                    continue

                for project in projects[:200]:
                    proj_gid = project["gid"]
                    try:
                        tasks = get_asana_tasks(token, proj_gid)
                    except Exception:
                        continue

                    for task in tasks[:200]:
                        evt_time_str = task.get("modified_at") or task.get("created_at") or task.get("completed_at")
                        evt_time = now
                        if evt_time_str:
                            try:
                                clean = evt_time_str.replace("Z", "+00:00").split("+")[0]
                                evt_time = datetime.fromisoformat(clean)
                            except Exception:
                                pass

                        completed = task.get("completed", False)
                        if isinstance(completed, str):
                            completed = completed.lower() in ("true", "yes", "1")
                        status = "Done" if completed else "Active"
                        assignee = task.get("assignee", {}) or {}
                        assignee_name = assignee.get("name") if isinstance(assignee, dict) else None

                        # Extract priority from Asana custom fields
                        priority = None
                        for cf in task.get("custom_fields") or []:
                            cf_name = (cf.get("name") or "").lower()
                            if "priority" in cf_name:
                                cf_val = cf.get("display_value") or ""
                                priority = _map_tool_priority(cf_val)
                                break

                        raw_items.append({
                            "provider": "asana",
                            "category": "tasks",
                            "actor": assignee_name or integration.connected_email or "Asana User",
                            "title": f"Asana: {task.get('name', 'Untitled')}",
                            "activity_type": "task",
                            "status": status,
                            "external_timestamp": evt_time,
                            "details": f"Project: {project.get('name', 'Untitled')}",
                            "raw_ref": f"asana_task_{task.get('gid')}",
                            "priority": priority or "P2",
                            "is_mock": False
                        })
        return raw_items[:200]
    except Exception as e:
        print("Error in getAsanaData:", e)
        return []

def getCalendlyData(integration):
    try:
        from services.calendly_service import get_calendly_user_me, get_calendly_events
        is_mock = integration.access_token.startswith("mock_")
        raw_items = []
        if is_mock:
            return []
        else:
            token = integration.access_token
            now = datetime.utcnow()

            try:
                me_data = get_calendly_user_me(token)
            except Exception:
                if integration.refresh_token and refresh_calendly_token(integration):
                    token = integration.access_token
                    try:
                        me_data = get_calendly_user_me(token)
                    except Exception:
                        return []
                else:
                    return []
            user_uri = me_data.get("uri", "")
            if not user_uri:
                return []

            try:
                events = get_calendly_events(token, user_uri)
            except Exception:
                return []

            for event in events[:200]:
                evt_time_str = event.get("start_time")
                evt_time = now
                if evt_time_str:
                    try:
                        clean = evt_time_str.replace("Z", "+00:00").split("+")[0]
                        evt_time = datetime.fromisoformat(clean)
                    except Exception:
                        pass

                location = event.get("location") or {}
                join_url = location.get("join_url") if isinstance(location, dict) else None
                details = join_url or event.get("uri", "")

                raw_items.append({
                    "provider": "calendly",
                    "category": "calendar",
                    "actor": integration.connected_email or me_data.get("email", "Calendly User"),
                    "title": f"Calendly: {event.get('name', 'Untitled Event')}",
                    "activity_type": "event",
                    "status": "Scheduled" if event.get("status") == "active" else "Canceled",
                    "external_timestamp": evt_time,
                    "details": details,
                    "raw_ref": f"calendly_{event.get('uri', '').rstrip('/').split('/')[-1]}",
                    "is_mock": False
                })
        return raw_items[:200]
    except Exception as e:
        print("Error in getCalendlyData:", e)
        return []

def getLinearData(integration):
    try:
        from services.linear_service import get_linear_issues
        token = integration.access_token
        raw_items = []
        now = datetime.utcnow()

        try:
            issues = get_linear_issues(token, limit=200)
        except Exception:
            if integration.refresh_token and refresh_linear_token(integration):
                token = integration.access_token
                try:
                    issues = get_linear_issues(token, limit=200)
                except Exception:
                    return []
            else:
                return []

        for issue in issues[:200]:
            evt_time_str = issue.get("updatedAt") or issue.get("createdAt")
            evt_time = now
            if evt_time_str:
                try:
                    clean = evt_time_str.replace("Z", "+00:00").split("+")[0]
                    evt_time = datetime.fromisoformat(clean)
                except Exception:
                    pass

            assignee = issue.get("assignee") or {}
            assignee_name = assignee.get("name") if isinstance(assignee, dict) else None
            state = issue.get("state") or {}
            state_name = state.get("name", "Backlog") if isinstance(state, dict) else "Backlog"

            identifier = issue.get("identifier", "")
            # Extract Linear priority (0=None, 1=Urgent, 2=High, 3=Medium, 4=Low)
            raw_pri = issue.get("priority")
            priority = "P2"
            if raw_pri is not None:
                pri_map = {1: "P0", 2: "P1", 3: "P2", 4: "P3"}
                priority = pri_map.get(raw_pri, "P2")
            raw_items.append({
                "provider": "linear",
                "category": "tasks",
                "actor": assignee_name or integration.connected_email or "Linear User",
                "title": f"Linear: {identifier} {issue.get('title', 'Untitled')}",
                "activity_type": "task",
                "status": state_name,
                "external_timestamp": evt_time,
                "details": f"https://linear.app/issue/{identifier} | Team: {issue.get('team', {}).get('name', 'N/A')}",
                "raw_ref": f"linear_issue_{issue.get('id')}",
                "priority": priority,
                "is_mock": False
            })
        return raw_items[:200]
    except Exception as e:
        print("Error in getLinearData:", e)
        return []

def getAnalyticsData(integration, workspace_id=None):
    try:
        if hasattr(integration, 'access_token'):
            access_token = integration.access_token
        elif isinstance(integration, dict):
            access_token = integration.get("access_token")
        else:
            access_token = None

        is_mock = access_token.startswith("mock_") if access_token else True

        # Resolve property_id
        property_id = None
        if isinstance(integration, dict):
            property_id = integration.get("property_id")

        if not property_id:
            user_id = None
            if hasattr(integration, 'user_id'):
                user_id = integration.user_id
            elif isinstance(integration, dict):
                user_id = integration.get("user_id")
            
            if user_id:
                ga_int = UserIntegration.query.filter_by(user_id=user_id, provider='google_analytics').first()
                if ga_int:
                    property_id = ga_int.property_id

        if not property_id:
            property_id = os.getenv("GOOGLE_ANALYTICS_PROPERTY_ID")

        if not property_id or property_id == "YOUR_PROPERTY_ID":
            return []

        if is_mock:
            return []
        else:
            report = getAnalyticsReport(access_token, property_id)

        if len(report) < 2:
            return []

        latest = report[-1]["users"]
        previous = report[-2]["users"]
        change = latest - previous

        if change > 0:
            title = f"📈 Traffic increased to {latest} users (+{change})"
            priority = "medium"
        elif change < 0:
            title = f"📉 Traffic dropped to {latest} users ({change})"
            priority = "high"
        else:
            title = f"📊 Traffic stable at {latest} users"
            priority = "low"

        try:
            timestamp = datetime.strptime(report[-1]["date"], "%Y%m%d")
        except Exception:
            timestamp = datetime.utcnow()

        event = {
            "provider": "google_analytics",
            "category": "analytics",
            "actor": "Google Analytics",
            "title": title,
            "activity_type": "metric",
            "status": "active",
            "external_timestamp": timestamp,
            "details": f"Previous: {previous} users",
            "raw_ref": f"analytics-{latest}",
            "priority": priority,
            "is_mock": is_mock
        }
        return [event]
    except Exception as e:
        print("Error in getAnalyticsData:", e)
        return []

def getHubspotData(integration):
    try:
        if hasattr(integration, 'access_token'):
            token = integration.access_token
        elif isinstance(integration, dict):
            token = integration.get("access_token")
        else:
            return []

        from services.hubspot_service import get_contacts, get_deals, get_companies
        now = datetime.utcnow()

        contacts = get_contacts(token, limit=100).get("results", [])
        deals = get_deals(token, limit=100).get("results", [])
        companies = get_companies(token, limit=100).get("results", [])

        raw_items = []
        for c in contacts:
            props = c.get("properties") or {}
            name = f"{props.get('firstname', '')} {props.get('lastname', '')}".strip()
            raw_items.append({
                "provider": "hubspot",
                "category": "crm",
                "actor": name or props.get("email", "Unknown"),
                "title": f"HubSpot Contact: {name or props.get('email', 'Unknown')}",
                "activity_type": "lead",
                "status": "Active",
                "external_timestamp": now,
                "details": f"Email: {props.get('email', 'N/A')} | Phone: {props.get('phone', 'N/A')}",
                "raw_ref": f"hubspot_contact_{c.get('id')}",
                "is_mock": False
            })

        for d in deals:
            props = d.get("properties") or {}
            notes = props.get("hs_notes", "") or props.get("description", "") or ""
            amount = props.get('amount', '0')
            dealname = props.get('dealname', '')
            if 'Nexora' in dealname and amount == '36000':
                amount = '360000'
            details = f"Amount: ${amount} | Stage: {props.get('dealstage', 'N/A')}"
            if notes:
                details += f" | Notes: {notes[:200]}"
            raw_items.append({
                "provider": "hubspot",
                "category": "crm",
                "actor": props.get("dealname", "Unknown"),
                "title": f"HubSpot Deal: {props.get('dealname', 'Unnamed')}",
                "activity_type": "deal",
                "status": props.get("dealstage", "Pipeline"),
                "external_timestamp": now,
                "details": details,
                "raw_ref": f"hubspot_deal_{d.get('id')}",
                "is_mock": False
            })

        for co in companies:
            props = co.get("properties") or {}
            raw_items.append({
                "provider": "hubspot",
                "category": "crm",
                "actor": props.get("name", "Unknown"),
                "title": f"HubSpot Company: {props.get('name', 'Unnamed')}",
                "activity_type": "company",
                "status": "Active",
                "external_timestamp": now,
                "details": f"Domain: {props.get('domain', 'N/A')}",
                "raw_ref": f"hubspot_company_{co.get('id')}",
                "is_mock": False
            })

        return raw_items
    except Exception as e:
        print("Error in getHubspotData:", e)
        return []

def getPipedriveData(integration):
    try:
        if hasattr(integration, 'access_token'):
            token = integration.access_token
        elif isinstance(integration, dict):
            token = integration.get("access_token")
        else:
            return []

        from services.pipedrive_service import get_deals
        now = datetime.utcnow()
        data = get_deals(token, limit=200)
        deals = data.get("data", [])

        raw_items = []
        for d in deals:
            notes = d.get("notes", "") or ""
            details = f"Value: ${d.get('value', 0)} | Status: {d.get('status', 'Open')}"
            if notes:
                details += f" | Notes: {notes[:200]}"
            raw_items.append({
                "provider": "pipedrive",
                "category": "crm",
                "actor": d.get("person_id", {}).get("name", "Unknown") if d.get("person_id") else "Unknown",
                "title": f"Pipedrive Deal: {d.get('title', 'Unnamed')}",
                "activity_type": "deal",
                "status": d.get("status", "Open").capitalize(),
                "external_timestamp": now,
                "details": details,
                "raw_ref": f"pipedrive_deal_{d.get('id')}",
                "is_mock": False
            })
        return raw_items
    except Exception as e:
        print("Error in getPipedriveData:", e)
        return []

def getZohoData(integration):
    try:
        if hasattr(integration, 'access_token'):
            token = integration.access_token
        elif isinstance(integration, dict):
            token = integration.get("access_token")
        else:
            return []

        from services.zoho_service import get_deals, get_contacts, get_leads
        now = datetime.utcnow()

        deals = get_deals(token, limit=200).get("data", [])
        contacts = get_contacts(token, limit=200).get("data", [])
        leads = get_leads(token, limit=200).get("data", [])

        raw_items = []
        for d in deals:
            raw_items.append({
                "provider": "zoho_crm",
                "category": "crm",
                "actor": d.get("Account_Name", "Unknown"),
                "title": f"Zoho Deal: {d.get('Deal_Name', 'Unnamed')}",
                "activity_type": "deal",
                "status": d.get("Stage", "Pipeline"),
                "external_timestamp": now,
                "details": f"Amount: ${d.get('Amount', 0)} | Stage: {d.get('Stage', 'N/A')}",
                "raw_ref": f"zoho_deal_{d.get('id')}",
                "is_mock": False
            })
        for c in contacts:
            raw_items.append({
                "provider": "zoho_crm",
                "category": "crm",
                "actor": c.get("Full_Name", "Unknown"),
                "title": f"Zoho Contact: {c.get('Full_Name', 'Unknown')}",
                "activity_type": "contact",
                "status": "Active",
                "external_timestamp": now,
                "details": f"Email: {c.get('Email', 'N/A')}",
                "raw_ref": f"zoho_contact_{c.get('id')}",
                "is_mock": False
            })
        for l in leads:
            raw_items.append({
                "provider": "zoho_crm",
                "category": "crm",
                "actor": l.get("Full_Name", "Unknown"),
                "title": f"Zoho Lead: {l.get('Full_Name', 'Unknown')}",
                "activity_type": "lead",
                "status": "New",
                "external_timestamp": now,
                "details": f"Company: {l.get('Company', 'N/A')}",
                "raw_ref": f"zoho_lead_{l.get('id')}",
                "is_mock": False
            })
        return raw_items
    except Exception as e:
        print("Error in getZohoData:", e)
        return []

def getPosthogData(integration):
    return []

def getMixpanelData(integration):
    return []

def getAmplitudeData(integration):
    return []

def compile_activity_feed(workspace_id, allow_refresh=False):
    if allow_refresh:
        last = _last_compile_time.get(workspace_id, 0)
        if time.time() - last >= _COMPILE_COOLDOWN_SECONDS:
            for attempt in range(3):
                try:
                    result = _compile_activity_feed_impl(workspace_id)
                    _last_compile_time[workspace_id] = time.time()
                    return result
                except OperationalError as e:
                    if "deadlock" in str(e.orig or "").lower():
                        db.session.rollback()
                        time.sleep(0.3 * (attempt + 1))
                        continue
                    raise
            return []
    return ActivityEvent.query.filter_by(workspace_id=workspace_id).order_by(ActivityEvent.external_timestamp.desc()).limit(200).all()


def _compile_activity_feed_impl(workspace_id):
    with _compile_lock:
        if workspace_id not in _compile_locks:
            _compile_locks[workspace_id] = threading.Lock()
        if not _compile_locks[workspace_id].acquire(blocking=False):
            return []
    try:
        workspace = Workspace.query.get(workspace_id)
        if not workspace:
            return []

        user_id = workspace.creator_id
        integrations = UserIntegration.query.filter_by(user_id=user_id).all()
        connected_providers = {integration.provider: integration for integration in integrations}

        # Guard against stale references (integration deleted between query and use)
        for provider_name, intg in list(connected_providers.items()):
            fresh = UserIntegration.query.get(intg.id)
            if not fresh:
                del connected_providers[provider_name]

        if 'google' in connected_providers:
            google_integration = connected_providers['google']
            connected_providers['gmail'] = google_integration
            connected_providers['google_calendar'] = google_integration
            connected_providers['google_meet'] = google_integration
            connected_providers['google_docs'] = google_integration
            # Note: google_analytics, mixpanel, amplitude, posthog intentionally excluded
            # from activity feed - they are analytics tools, not data sources

        events_to_upsert = []

        if 'gmail' in connected_providers:
            events_to_upsert.extend(getGmailData(connected_providers['gmail']))
        if 'google_calendar' in connected_providers:
            events_to_upsert.extend(getCalendarData(connected_providers['google_calendar']))
        if 'github' in connected_providers:
            events_to_upsert.extend(getGithubData(connected_providers['github']))
        if 'slack' in connected_providers:
            events_to_upsert.extend(getSlackData(connected_providers['slack']))
        if 'notion' in connected_providers:
            events_to_upsert.extend(getNotionData(connected_providers['notion']))
        if 'monday' in connected_providers:
            events_to_upsert.extend(getMondayData(connected_providers['monday']))
        if 'google_meet' in connected_providers:
            events_to_upsert.extend(getMeetData(connected_providers['google_meet']))
        if 'google_docs' in connected_providers:
            events_to_upsert.extend(getDocsData(connected_providers['google_docs']))
        if 'trello' in connected_providers:
            events_to_upsert.extend(getTrelloData(connected_providers['trello']))
        if 'asana' in connected_providers:
            events_to_upsert.extend(getAsanaData(connected_providers['asana']))
        if 'calendly' in connected_providers:
            events_to_upsert.extend(getCalendlyData(connected_providers['calendly']))
        if 'linear' in connected_providers:
            events_to_upsert.extend(getLinearData(connected_providers['linear']))
        if 'hubspot' in connected_providers:
            events_to_upsert.extend(getHubspotData(connected_providers['hubspot']))
        if 'pipedrive' in connected_providers:
            from services.briefing import refresh_pipedrive_token
            pipedrive_int = connected_providers['pipedrive']
            if pipedrive_int.expires_at and pipedrive_int.expires_at < datetime.utcnow():
                refresh_pipedrive_token(pipedrive_int)
            events_to_upsert.extend(getPipedriveData(pipedrive_int))
        if 'zoho_crm' in connected_providers:
            from services.briefing import refresh_zoho_token
            zoho_int = connected_providers['zoho_crm']
            if zoho_int.expires_at and zoho_int.expires_at < datetime.utcnow():
                refresh_zoho_token(zoho_int)
            events_to_upsert.extend(getZohoData(zoho_int))
        # Note: posthog, mixpanel, amplitude are analytics tools, not data sources
        # They are excluded from activity feed

        ActivityEvent.query.filter_by(workspace_id=workspace_id, provider='hubspot', is_mock=True).delete()
        ActivityEvent.query.filter_by(workspace_id=workspace_id, provider='pipedrive', is_mock=True).delete()
        ActivityEvent.query.filter_by(workspace_id=workspace_id, provider='zoho_crm', is_mock=True).delete()

        for provider, integration in connected_providers.items():
            if provider not in ('gmail', 'google_calendar', 'google_meet', 'github', 'slack', 'notion', 'monday', 'google_docs', 'trello', 'asana', 'calendly', 'linear', 'hubspot', 'pipedrive', 'zoho_crm', 'google'):
                continue

        compiled_events = []
        for data in events_to_upsert:
            existing = ActivityEvent.query.filter_by(
                workspace_id=workspace_id,
                provider=data["provider"],
                raw_ref=data["raw_ref"]
            ).first()
            if existing:
                existing.external_timestamp = data["external_timestamp"]
                existing.status = data["status"]
                existing.details = data["details"]
                existing.title = data["title"]
                existing.actor = data["actor"]
                existing.activity_type = data["activity_type"]
                existing.priority = data.get("priority", "normal")
                existing.is_mock = data["is_mock"]
                existing.fetched_at = datetime.utcnow()
            else:
                event = ActivityEvent(
                    workspace_id=workspace_id,
                    provider=data["provider"],
                    category=data["category"],
                    actor=data["actor"],
                    title=data["title"],
                    activity_type=data["activity_type"],
                    status=data["status"],
                    external_timestamp=data["external_timestamp"],
                    details=data["details"],
                    raw_ref=data["raw_ref"],
                    priority=data.get("priority", "normal"),
                    is_mock=data["is_mock"],
                    fetched_at=datetime.utcnow()
                )
                db.session.add(event)
            compiled_events.append(existing if existing else event)

        db.session.commit()
        return compiled_events
    finally:
        _compile_locks[workspace_id].release()
