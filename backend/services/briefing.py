import datetime
import requests
import os
import json
import base64
from sqlalchemy import case
from models.user_integration import UserIntegration
from models.goal import Goal
from models.task import Task
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from models.follow_up import FollowUp
from utils.workspace_auth import get_current_workspace_id

def refresh_google_token(integration):
    client_id = os.getenv("GOOGLE_INTEGRATION_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_INTEGRATION_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not integration.refresh_token or not client_id or not client_secret:
        return False
        
    try:
        from config.database import db
        res = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": integration.refresh_token,
            "grant_type": "refresh_token"
        }, timeout=5)
        
        token_data = res.json()
        if "access_token" in token_data:
            integration.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                integration.refresh_token = token_data["refresh_token"]
            
            if "expires_in" in token_data:
                expires_in = token_data["expires_in"]
                integration.expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=expires_in)
                
            db.session.commit()
            return True
    except Exception as e:
        print("Error refreshing Google token:", e)
    return False


def refresh_zoho_token(integration):
    client_id = os.getenv("ZOHO_CLIENT_ID")
    client_secret = os.getenv("ZOHO_CLIENT_SECRET")
    accounts_url = os.getenv("ZOHO_ACCOUNTS_URL", "https://accounts.zoho.in")

    if not integration.refresh_token or not client_id or not client_secret:
        return False

    try:
        from config.database import db
        res = requests.post(
            f"{accounts_url}/oauth/v2/token",
            data={
                "grant_type": "refresh_token",
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": integration.refresh_token
            },
            timeout=10
        )
        token_data = res.json()
        if "access_token" in token_data:
            integration.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                integration.refresh_token = token_data["refresh_token"]
            if "expires_in" in token_data:
                integration.expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=token_data["expires_in"])
            db.session.commit()
            return True
    except Exception as e:
        print("Error refreshing Zoho token:", e)
    return False


def refresh_pipedrive_token(integration):
    client_id = os.getenv("PIPEDRIVE_CLIENT_ID")
    client_secret = os.getenv("PIPEDRIVE_CLIENT_SECRET")

    if not integration.refresh_token or not client_id or not client_secret:
        return False

    try:
        from config.database import db
        auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        res = requests.post(
            "https://oauth.pipedrive.com/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": integration.refresh_token
            },
            headers={"Authorization": f"Basic {auth_str}"},
            timeout=10
        )
        token_data = res.json()
        if "access_token" in token_data:
            integration.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                integration.refresh_token = token_data["refresh_token"]
            if "expires_in" in token_data:
                integration.expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=token_data["expires_in"])
            db.session.commit()
            return True
    except Exception as e:
        print("Error refreshing Pipedrive token:", e)
    return False


def refresh_asana_token(integration):
    client_id = os.getenv("ASANA_CLIENT_ID")
    client_secret = os.getenv("ASANA_CLIENT_SECRET")

    if not integration.refresh_token or not client_id or not client_secret:
        return False

    try:
        from config.database import db
        res = requests.post(
            "https://app.asana.com/-/oauth_token",
            data={
                "grant_type": "refresh_token",
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": integration.refresh_token
            },
            timeout=10
        )
        token_data = res.json()
        if "access_token" in token_data:
            integration.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                integration.refresh_token = token_data["refresh_token"]
            if "expires_in" in token_data:
                integration.expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=token_data["expires_in"])
            db.session.commit()
            return True
    except Exception as e:
        print("Error refreshing Asana token:", e)
    return False


def refresh_calendly_token(integration):
    client_id = os.getenv("CALENDLY_CLIENT_ID")
    client_secret = os.getenv("CALENDLY_CLIENT_SECRET")

    if not integration.refresh_token or not client_id or not client_secret:
        return False

    try:
        from config.database import db
        res = requests.post(
            "https://auth.calendly.com/oauth/token",
            data={
                "grant_type": "refresh_token",
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": integration.refresh_token
            },
            timeout=10
        )
        token_data = res.json()
        if "access_token" in token_data:
            integration.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                integration.refresh_token = token_data["refresh_token"]
            if "expires_in" in token_data:
                integration.expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=token_data["expires_in"])
            db.session.commit()
            return True
    except Exception as e:
        print("Error refreshing Calendly token:", e)
    return False


def refresh_linear_token(integration):
    client_id = os.getenv("LINEAR_CLIENT_ID")
    client_secret = os.getenv("LINEAR_CLIENT_SECRET")

    if not integration.refresh_token or not client_id or not client_secret:
        return False

    try:
        from config.database import db
        auth_str = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        res = requests.post(
            "https://api.linear.app/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": integration.refresh_token
            },
            headers={"Authorization": f"Basic {auth_str}"},
            timeout=10
        )
        token_data = res.json()
        if "access_token" in token_data:
            integration.access_token = token_data["access_token"]
            if "refresh_token" in token_data:
                integration.refresh_token = token_data["refresh_token"]
            if "expires_in" in token_data:
                integration.expires_at = datetime.datetime.utcnow() + datetime.timedelta(seconds=token_data["expires_in"])
            db.session.commit()
            return True
    except Exception as e:
        print("Error refreshing Linear token:", e)
    return False


def compile_morning_briefing(user_id):
    # Auto-trigger recurring task generation on autopilot
    workspace_id = get_current_workspace_id(user_id)
    
    # Track daily counts and ephemeral focus lists
    goals_created_today = 0
    tasks_created_today = 0
    today_focus = []

    if workspace_id:
        try:
            from services.activity_compiler import compile_activity_feed
            compile_activity_feed(workspace_id, allow_refresh=False)
        except Exception as ex:
            print("Activity feed compile failed in briefing:", ex)

    # 1. Fetch user's active integrations
    integrations = UserIntegration.query.filter_by(user_id=user_id).all()
    connected_providers = {integration.provider: integration for integration in integrations}

    # Map unified 'google' provider integration to 'gmail' and 'google_calendar'
    if 'google' in connected_providers:
        google_integration = connected_providers['google']
        # Real google integration always overrides separate gmail or google_calendar entries (e.g. from sandbox/demo)
        connected_providers['gmail'] = google_integration
        connected_providers['google_calendar'] = google_integration
        connected_providers['google_docs'] = google_integration

    schedule = []
    communications = []
    tasks_feed = []
    dev_activity = []
    docs_knowledge = []
    sales_pipeline = []
    social_mentions = []
    analytics = []
    finance = []

    # Helper to check if provider is mock
    def is_mock_provider(provider_id):
        if provider_id not in connected_providers:
            return False
        return connected_providers[provider_id].access_token.startswith("mock_")

    # ==========================================
    # 1. CALENDAR & MEETINGS
    # ==========================================
    # Google Calendar (Real + Mock)
    is_calendar_mock = False
    if 'google_calendar' in connected_providers:
        integration = connected_providers['google_calendar']
        is_mock = is_mock_provider('google_calendar')
        
        if not is_mock:
            try:
                headers = {"Authorization": f"Bearer {integration.access_token}"}
                now = datetime.datetime.utcnow()
                start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + "Z"
                end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=0).isoformat() + "Z"
                
                cal_url = f"https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin={start_of_day}&timeMax={end_of_day}&orderBy=startTime&singleEvents=true"
                cal_res = requests.get(cal_url, headers=headers, timeout=5)
                
                if cal_res.status_code in (401, 403):
                    # Try refreshing token
                    if refresh_google_token(integration):
                        headers = {"Authorization": f"Bearer {integration.access_token}"}
                        cal_res = requests.get(cal_url, headers=headers, timeout=5)
                
                cal_res.raise_for_status()
                
                if cal_res.status_code == 200:
                    events = cal_res.json().get('items', [])
                    from services.google_service import extract_meet_link, classify_event, detect_priority
                    for ev in events:
                        start_time = ev.get('start', {}).get('dateTime') or ev.get('start', {}).get('date')
                        time_str = "All Day"
                        if "T" in start_time:
                            time_str = start_time.split("T")[1][:5]
                        
                        meet_link = extract_meet_link(ev)
                        event_type = classify_event(ev)
                        priority = detect_priority(ev)
                        
                        title = ev.get('summary', 'Untitled Meeting')
                        if event_type == "meeting" and meet_link:
                            title = f"📹 Google Meet: {title}"
                            
                        schedule.append({
                            "title": title,
                            "time": time_str,
                            "type": "Google Calendar",
                            "attendees": ", ".join([att.get('email') for att in ev.get('attendees', []) if not att.get('self')]),
                            "meet_link": meet_link,
                            "priority": priority
                        })
            except Exception as e:
                print("Error calling Google Calendar API, falling back to mock:", e)
                is_calendar_mock = True
        
        if is_mock or is_calendar_mock:
            pass

    # Sort schedule by time
    schedule.sort(key=lambda x: x["time"])

    # ==========================================
    # 2. COMMUNICATION & CHATS
    # ==========================================
    # Gmail (Real + Mock)
    is_gmail_mock = False
    if 'gmail' in connected_providers:
        integration = connected_providers['gmail']
        is_mock = is_mock_provider('gmail')
        
        if not is_mock:
            try:
                headers = {"Authorization": f"Bearer {integration.access_token}"}
                gmail_url = "https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=3"
                gmail_res = requests.get(gmail_url, headers=headers, timeout=5)
                
                if gmail_res.status_code in (401, 403):
                    # Try refreshing token
                    if refresh_google_token(integration):
                        headers = {"Authorization": f"Bearer {integration.access_token}"}
                        gmail_res = requests.get(gmail_url, headers=headers, timeout=5)
                
                gmail_res.raise_for_status()
                
                if gmail_res.status_code == 200:
                    messages = gmail_res.json().get('messages', [])
                    for msg in messages:
                        detail_res = requests.get(f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg['id']}", headers=headers, timeout=3)
                        detail_res.raise_for_status()
                        msg_detail = detail_res.json()
                        headers_list = msg_detail.get('payload', {}).get('headers', [])
                        subject = next((h.get('value') for h in headers_list if h.get('name') == 'Subject'), 'No Subject')
                        sender = next((h.get('value') for h in headers_list if h.get('name') == 'From'), 'Unknown Sender')
                        snippet = msg_detail.get('snippet', '')
                        communications.append({
                            "sender": sender.split("<")[0].strip(),
                            "source": "Gmail",
                            "subject": subject,
                            "snippet": snippet
                        })
            except Exception as e:
                print("Error calling Gmail API, falling back to mock:", e)
                is_gmail_mock = True
                
        if is_mock or is_gmail_mock:
            pass



    # Slack (Real + Mock)
    if 'slack' in connected_providers:
        is_slack_mock = is_mock_provider('slack')
        if not is_slack_mock:
            try:
                from models.activity_event import ActivityEvent
                if workspace_id:
                    slack_evts = ActivityEvent.query.filter_by(
                        workspace_id=workspace_id,
                        provider="slack",
                        is_mock=False
                    ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()
                    for evt in slack_evts:
                        channel_str = "Slack"
                        if "New message in " in evt.title:
                            channel_str = f"Slack ({evt.title.replace('New message in ', '')})"
                        communications.append({
                            "sender": evt.actor or "Slack User",
                            "source": channel_str,
                            "subject": evt.title,
                            "snippet": evt.details or ""
                        })
            except Exception as e:
                print("Error reading real Slack events for briefing:", e)

    # Discord check removed



    # ==========================================
    # 3. TASK & PROJECT MANAGEMENT
    # ==========================================


    # ==========================================
    # 4. DEVELOPMENT TOOLS
    # ==========================================
    # GitHub (Real + Mock)
    if 'github' in connected_providers:
        integration = connected_providers['github']
        is_mock = is_mock_provider('github')
        
        if not is_mock:
            try:
                headers = {
                    "Authorization": f"token {integration.access_token}",
                    "Accept": "application/vnd.github.v3+json"
                }
                github_login = integration.connected_email or ""
                pr_res = requests.get(f"https://api.github.com/search/issues?q=is:pr+is:open+author:{github_login}", headers=headers, timeout=5)
                if pr_res.status_code == 200:
                    items = pr_res.json().get('items', [])
                    for item in items:
                        dev_activity.append({
                            "title": item.get('title'),
                            "repo": item.get('repository_url', '').split('/')[-1],
                            "number": item.get('number'),
                            "source": "GitHub",
                            "url": item.get('html_url')
                        })
            except Exception as e:
                print("Error calling GitHub API, falling back to mock:", e)
                is_mock = True
                
        if is_mock:
            pass



    # ==========================================
    # 5. DOCUMENTATION & KNOWLEDGE
    # ==========================================
    if 'notion' in connected_providers:
        is_notion_mock = is_mock_provider('notion')
        if not is_notion_mock:
            try:
                from services.notion_service import get_notion_items
                integration = connected_providers['notion']
                items = get_notion_items(integration.access_token)
                for item in items[:3]:
                    time_str = item["timestamp"][:10] if item.get("timestamp") else "Recently"
                    docs_knowledge.append({
                        "title": f"Notion: {item['title']}",
                        "updated_by": item["user"],
                        "time": time_str
                    })
            except Exception as e:
                print("Error reading Notion docs for briefing:", e)
    if 'google_docs' in connected_providers:
        is_docs_mock = is_mock_provider('google_docs')
        if not is_docs_mock:
            try:
                from services import google_docs_service
                integration = connected_providers['google_docs']
                docs = google_docs_service.get_recent_documents(integration.access_token)
                for d in docs[:3]:
                    docs_knowledge.append({
                        "title": f"Google Doc: {d['title']}",
                        "updated_by": d['owner'],
                        "time": d['modifiedTime'][:10] if d.get('modifiedTime') else 'Recently'
                    })
            except Exception as e:
                print("Error fetching real Google Docs for briefing:", e)

    # ==========================================
    # 6. SALES & CRM
    # ==========================================
    if 'hubspot' in connected_providers:
        from models.activity_event import ActivityEvent
        real_events = ActivityEvent.query.filter_by(
            provider="hubspot", is_mock=False
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()
        for ev in real_events:
            sales_pipeline.append({
                "event": ev.title,
                "source": "HubSpot",
                "stage": ev.status or "Active"
            })

    if 'zoho_crm' in connected_providers:
        from models.activity_event import ActivityEvent
        real_events = ActivityEvent.query.filter_by(
            provider="zoho_crm", is_mock=False
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()
        for ev in real_events:
            sales_pipeline.append({
                "event": ev.title,
                "source": "Zoho CRM",
                "stage": ev.status or "Active"
            })
    if 'pipedrive' in connected_providers:
        from models.activity_event import ActivityEvent
        real_events = ActivityEvent.query.filter_by(
            provider="pipedrive", is_mock=False
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()
        for ev in real_events:
            sales_pipeline.append({
                "event": ev.title,
                "source": "Pipedrive",
                "stage": ev.status or "Active"
            })

    # ==========================================
    # 7. SOCIAL MEDIA PLATFORMS (Removed)
    # ==========================================

    # ==========================================
    # 8. ANALYTICS & PRODUCT TRACKING
    # ==========================================

    if 'mixpanel' in connected_providers:
        from models.activity_event import ActivityEvent
        real_events = ActivityEvent.query.filter_by(
            provider="mixpanel", is_mock=False
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(3).all()
        for ev in real_events:
            analytics.append({
                "metric": ev.title,
                "source": "Mixpanel"
            })
    if 'amplitude' in connected_providers:
        from models.activity_event import ActivityEvent
        real_events = ActivityEvent.query.filter_by(
            provider="amplitude", is_mock=False
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(3).all()
        for ev in real_events:
            analytics.append({
                "metric": ev.title,
                "source": "Amplitude"
            })

    # ==========================================
    # 9. FINANCE
    # ==========================================

    if 'posthog' in connected_providers:
        from models.activity_event import ActivityEvent
        real_events = ActivityEvent.query.filter_by(
            provider="posthog", is_mock=False
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(3).all()
        for ev in real_events:
            analytics.append({
                "metric": ev.title,
                "source": "PostHog"
            })

    # ==========================================
    # SUMMARY SYNTHESIS & AI GREETER
    # ==========================================
    # SUMMARY SYNTHESIS & AI GREETER
    # ==========================================
    workspace_id = get_current_workspace_id(user_id)
    active_goals = Goal.query.filter_by(workspace_id=workspace_id).filter(Goal.status != 'completed').all()
    active_tasks = Task.query.filter_by(workspace_id=workspace_id).filter(Task.status != 'completed').all()
    blocked_tasks = Task.query.filter(Task.workspace_id == workspace_id, Task.blocked_at.isnot(None)).all()
    priority_order = case(
        (DecisionLog.ai_status == 'pending_confirmation', 0),
        (DecisionLog.ai_status == 'confirmed', 1),
        (DecisionLog.ai_status == 'dismissed', 2),
        else_=3
    )
    recent_decisions = DecisionLog.query.filter_by(workspace_id=workspace_id).order_by(
        priority_order,
        DecisionLog.confidence_score.desc().nullslast(),
        DecisionLog.created_at.desc()
    ).limit(3).all()
    active_follow_ups = FollowUp.query.filter_by(workspace_id=workspace_id, status='pending').all()
    
    # Query meeting stubs for follow-ups
    meeting_follow_ups = MeetingNotes.query.filter_by(workspace_id=workspace_id).filter(MeetingNotes.follow_up_at.isnot(None)).all()

    # Determine weekly focus
    weekly_goal_text = "Milestone: Launch v2 Beta and validate cohort conversion."
    weekly_goal_items = [g.title for g in active_goals if g.goal_type == 'weekly']
    monthly_goal_items = [g.title for g in active_goals if g.goal_type == 'monthly']
    if weekly_goal_items:
        weekly_goal_text = f"Weekly Action: {weekly_goal_items[0]}"
    elif monthly_goal_items:
        weekly_goal_text = f"Monthly Goal: {monthly_goal_items[0]}"

    # Determine helpful tasks (that are linked to goals)
    helpful_tasks_list = [t.title for t in active_tasks if t.goal_id is not None]


    # Determine distractions (tasks not linked to goals, or calendar sync standups without client involvement)
    distractions_list = [t.title for t in active_tasks if t.goal_id is None][:2]


    # Blocked members/tasks - Auto-surface blocked > 24h
    blocked_items_list = []
    for t in blocked_tasks:
        is_urgent = False
        if t.blocked_at:
            hours_blocked = (datetime.utcnow() - t.blocked_at).total_seconds() / 3600.0
            if hours_blocked >= 24:
                is_urgent = True
        
        prefix = "🔥 URGENT [Blocked >24h]: " if is_urgent else ""
        blocked_items_list.append(f"{prefix}{t.title} (Blocked: {t.blocker_description or 'Waiting on review'})")
    
    # Slack alerts if Slack connected
    slack_blockers = [s for s in communications if 'blocker' in s['snippet'].lower() or 'cors' in s['snippet'].lower()]
    for sb in slack_blockers:
        blocked_items_list.append(f"Slack blocker by {sb['sender']}: {sb['subject']}")
        


    # Follow-ups (Sequoia email or DB follow-ups or meeting follow-ups)
    follow_ups_list = []
    for fu in active_follow_ups:
        follow_ups_list.append(f"Follow up with {fu.person_name}")
        
    for m in meeting_follow_ups:
        follow_ups_list.append(f"Follow up on meeting '{m.title}' by {m.follow_up_at.strftime('%Y-%m-%d')}")
    
    # Scoped Gmail keyword scanner to subject lines + non-blocklisted domains (Rework v2)
    investor_leads = []
    for e in communications:
        subject = e.get('subject', '').lower()
        sender = e.get('sender', '').lower()
        
        is_blocklisted = any(domain in sender for domain in ['substack.com', 'medium.com', 'newsletters', 'promo', 'no-reply', 'noreply'])
        has_keyword = any(kw in subject for kw in ['seed', 'pitch', 'capital', 'deck'])
        is_sequoia = 'sequoia' in sender or 'partner' in sender
        
        if (has_keyword and not is_blocklisted) or is_sequoia:
            investor_leads.append(e)

    for il in investor_leads:
        follow_ups_list.append(f"Send investor follow-up to Sequoia Capital ({il['sender']})")
        


    # Recent decisions
    decisions_list = []
    for rd in recent_decisions:
        decisions_list.append(rd.decision)


    # Upcoming risks
    risks_list = []
    if blocked_tasks:
        risks_list.append(f"Milestone delayed due to {len(blocked_tasks)} blocked task(s)")
    if len(schedule) > 3:
        risks_list.append("Meeting heavy schedule today — protect deep work block")
        
    # Unlinked task warning flag (Rework v2)
    active_weekly_goals = Goal.query.filter_by(workspace_id=workspace_id, goal_type='weekly').filter(Goal.status != 'completed').count() > 0
    if active_weekly_goals:
        unlinked_tasks = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.goal_id.is_(None),
            Task.status.notin_(['Done', 'Cancelled'])
        ).all()
        for t in unlinked_tasks:
            risks_list.append(f"This task ('{t.title}') isn't linked to your weekly goal. Intentional?")


    # Today's Action Recommendations (Action Layer)
    today_recs = []
    
    # 1. Handle blocked task
    if blocked_tasks:
        today_recs.append(f"Resolve blocker on '{blocked_tasks[0].title}': {blocked_tasks[0].blocker_description or 'unspecified'}")
    # 2. Handle follow-up
    if active_follow_ups:
        today_recs.append(f"Send follow-up to {active_follow_ups[0].person_name}")
    elif investor_leads:
        today_recs.append(f"Send investor follow-up to Sequoia Capital ({investor_leads[0]['sender']})")
        
    # 3. Handle decision review
    if recent_decisions:
        today_recs.append(f"Review '{recent_decisions[0].decision}' context before tomorrow's meetings")
        
    # 4. Deep work time block
    today_recs.append("Protect 2 PM–4 PM for deep work")

    ai_synthesis = {
        "weekly_goal": weekly_goal_text,
        "helpful_tasks": helpful_tasks_list,
        "distractions": distractions_list,
        "blocked_items": blocked_items_list,
        "follow_ups": follow_ups_list,
        "recent_decisions": decisions_list,
        "upcoming_risks": risks_list,
        "today_recommendations": today_recs
    }

    # General greeting compilation
    summary = "Welcome to FounDesk! "
    if len(connected_providers) == 0:
        summary += "You haven't connected any external integrations yet. Visit the Settings tab to connect Gmail, Calendar, Slack, or Jira and build a unified Morning Briefing."
    else:
        display_names = []
        for key in connected_providers.keys():
            if key == 'google':
                continue
            name = key.replace("_", " ").title()
            if name == "Gmail":
                display_names.append("Gmail")
            elif name == "Google Calendar":
                display_names.append("Google Calendar")
            else:
                display_names.append(name)
        if not display_names and 'google' in connected_providers:
            display_names.append("Google Workspace")
        display_names = list(sorted(set(display_names)))
        summary += f"Connected integrations: {', '.join(display_names)}. "
        
        insights = []
        if len(schedule) > 0:
            insights.append(f"You have {len(schedule)} meetings scheduled today, starting with '{schedule[0]['title']}' at {schedule[0]['time']}.")
        
        if len(communications) > 0:
            insights.append(f"You have {len(communications)} unread messages in your inbox, starting with a message from '{communications[0]['sender']}'.")
        
        if len(investor_leads) > 0:
            insights.append("CRITICAL: You received an email from an investor regarding your Pitch Deck follow-up.")
            
        if len(slack_blockers) > 0:
            insights.append("SLACK ALERTS: The engineering team has reported blocker items in Slack channels.")
            
        if len(sales_pipeline) > 0:
            insights.append(f"CRM updates indicate {len(sales_pipeline)} active pipeline alerts.")
            
        summary += " ".join(insights)
        
        strategy = "\n\n💡 Focus Strategy: "
        if len(slack_blockers) > 0 or len(blocked_tasks) > 0:
            strategy += "Review engineering blockers and PRs first thing to unblock the team, then prepare for your investor meetings."
        elif len(sales_pipeline) > 0:
            strategy += "Focus on following up on new CRM leads before jumping into standups to maximize conversion."
        else:
            strategy += "Keep driving progress on your cascaded goals. Make sure to log critical decisions to build your founder workspace memory."
        summary += strategy

    sync_errors = []
    if 'google_calendar' in connected_providers and is_calendar_mock:
        sync_errors.append('google_calendar')
    if 'gmail' in connected_providers and is_gmail_mock:
        sync_errors.append('gmail')

    return {
        "summary": summary,
        "schedule": schedule,
        "communications": communications,
        "tasks_feed": tasks_feed,
        "dev_activity": dev_activity,
        "docs_knowledge": docs_knowledge,
        "sales_pipeline": sales_pipeline,
        "social_mentions": social_mentions,
        "analytics": analytics,
        "finance": finance,
        "active_goals_count": len(active_goals),
        "active_tasks_count": len(active_tasks),
        "ai_synthesis": ai_synthesis,
        "connected_providers": list(connected_providers.keys()),
        "sync_errors": sync_errors,
        "goals_created_today": goals_created_today,
        "tasks_created_today": tasks_created_today,
        "today_focus": today_focus,
        "ai_chief_of_staff_summary": f"🤖 AI Chief of Staff: {goals_created_today + tasks_created_today} new items ({goals_created_today} goals, {tasks_created_today} tasks) generated from recent feeds." if (goals_created_today + tasks_created_today > 0) else None
    }
