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
from models.activity_event import ActivityEvent
from utils.workspace_auth import get_current_workspace_id
from utils.mock_mode import mock_visibility_clause

def _llm_morning_brief(signals, connected_count):
    """Best-effort LLM-authored founder briefing. Returns (summary, focus) or (None, None)
    if no API key is configured or the single-shot call fails — callers fall back to rules."""
    if not (os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENROUTER_API_KEY")):
        print(f"[BRIEFING] no LLM key in env: OPENAI={bool(os.environ.get('OPENAI_API_KEY'))} OPENROUTER={bool(os.environ.get('OPENROUTER_API_KEY'))} DATABASE_URL={bool(os.environ.get('DATABASE_URL'))} SMTP={bool(os.environ.get('SMTP_HOST'))}")
        return None, None
    try:
        from pattern_engine.llm_client import call_llm_quick
        schema = {
            "title": "morning_briefing",
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "2-4 sharp sentences in the founder's first-person voice. Direct, concrete, names the top opportunity and top risk. No markdown, no bullets.",
                },
                "focus": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Exactly 3 short today-priorities, one phrase each.",
                },
            },
            "required": ["summary", "focus"],
        }
        system = (
            "You are the AI chief of staff for a solo startup founder. Today's compiled signals "
            "(meetings, messages, tasks, blockers, follow-ups, decisions, risks) are below as JSON. "
            "Write a concise morning briefing from the founder's own voice. Never invent facts not in "
            "the input. Keep the summary under 90 words. "
            "Respond with a SINGLE JSON object matching the requested schema: no markdown, no code "
            "fences, no commentary before or after."
        )
        payload = dict(signals)
        payload["connected_integrations"] = connected_count
        result = call_llm_quick(
            [{"role": "system", "content": system}, {"role": "user", "content": json.dumps(payload, default=str)[:6000]}],
            schema,
            temperature=0.4,
        )
        summary = ((result or {}).get("summary") or "").strip()
        focus = [(f or "").strip() for f in (result or {}).get("focus") or [] if (f or "").strip()][:3]
        if not summary:
            return None, None
        print(f"[BRIEFING] LLM summary generated ({len(summary)} chars, {len(focus)} focus items)")
        return summary, focus
    except Exception as e:
        print(f"[BRIEFING] LLM summary unavailable ({type(e).__name__}), using rule-based brief")
        return None, None


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
    # Mock events are only visible in sandbox workspaces (mock_ tokens)
    _visible = mock_visibility_clause(workspace_id)
    
    # Track daily counts and ephemeral focus lists
    today_focus = []

    if workspace_id:
        try:
            from services.activity_compiler import compile_activity_feed
            compile_activity_feed(workspace_id, allow_refresh=True)
        except Exception as ex:
            print("Activity feed compile failed in briefing:", ex)

    # 1. Fetch user's active integrations
    integrations = UserIntegration.query.filter_by(user_id=user_id).all()
    connected_providers = {integration.provider: integration for integration in integrations}

    # Map unified 'google' provider integration to all sub-providers
    if 'google' in connected_providers:
        google_integration = connected_providers['google']
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

    # All sections use ActivityEvent as single source of truth
    now_utc = datetime.datetime.utcnow()
    today_start = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + datetime.timedelta(days=1)

    # ==========================================
    # 1. CALENDAR & MEETINGS (from ActivityEvent)
    # ==========================================
    if workspace_id:
        calendar_events = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider.in_(["google_calendar", "calendly"]),
            _visible,
            ActivityEvent.external_timestamp >= today_start,
            ActivityEvent.external_timestamp < today_end
        ).order_by(ActivityEvent.external_timestamp.asc()).limit(20).all()
        for ev in calendar_events:
            ts = ev.external_timestamp
            time_str = "All Day"
            if ts:
                time_str = ts.strftime("%H:%M")
            schedule.append({
                "title": ev.title,
                "time": time_str,
                "type": "Google Calendar" if ev.provider == "google_calendar" else "Calendly",
                "attendees": ev.actor or "",
                "meet_link": ev.meet_link,
                "priority": ev.priority or "normal"
            })
    schedule.sort(key=lambda x: x["time"])

    # ==========================================
    # 2. COMMUNICATION & CHATS (from ActivityEvent)
    # ==========================================
    if workspace_id:
        # Gmail
        gmail_events = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider == "gmail",
            _visible,
            ActivityEvent.external_timestamp >= today_start
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()
        for ev in gmail_events:
            communications.append({
                "sender": ev.actor or "Unknown",
                "source": "Gmail",
                "subject": ev.title,
                "snippet": (ev.details or "")[:200]
            })

        # Slack
        slack_events = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider == "slack",
            _visible
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()
        for evt in slack_events:
            channel_str = "Slack"
            if "New message in " in evt.title:
                channel_str = f"Slack ({evt.title.replace('New message in ', '')})"
            communications.append({
                "sender": evt.actor or "Slack User",
                "source": channel_str,
                "subject": evt.title,
                "snippet": (evt.details or "")[:200]
            })

    # ==========================================
    # 3. TASK & PROJECT MANAGEMENT (from ActivityEvent)
    # ==========================================
    if workspace_id:
        task_events = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider.in_(["trello", "asana", "linear", "monday"]),
            _visible
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(10).all()
        for ev in task_events:
            tasks_feed.append({
                "title": ev.title,
                "source": ev.provider,
                "status": ev.status or "Active",
                "priority": ev.priority or "P2",
                "timestamp": ev.external_timestamp.isoformat() if ev.external_timestamp else None
            })

    # ==========================================
    # 4. DEVELOPMENT TOOLS (from ActivityEvent)
    # ==========================================
    if workspace_id:
        github_events = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider == "github",
            _visible
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()
        for ev in github_events:
            repo = ""
            if ev.url:
                parts = ev.url.split("/")
                if len(parts) >= 5:
                    repo = f"{parts[3]}/{parts[4]}"
            number = ""
            if ev.url:
                parts = ev.url.split("/")
                if len(parts) >= 7:
                    number = parts[-1]
            dev_activity.append({
                "title": ev.title,
                "repo": repo,
                "number": number,
                "source": "GitHub",
                "url": ev.url or ""
            })

    # ==========================================
    # 5. DOCUMENTATION & KNOWLEDGE (from ActivityEvent)
    # ==========================================
    if workspace_id:
        doc_events = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider.in_(["notion", "google_docs"]),
            _visible
        ).order_by(ActivityEvent.external_timestamp.desc()).limit(6).all()
        for ev in doc_events:
            ts_str = ev.external_timestamp.strftime("%Y-%m-%d") if ev.external_timestamp else "Recently"
            provider_label = "Notion" if ev.provider == "notion" else "Google Doc"
            docs_knowledge.append({
                "title": f"{provider_label}: {ev.title}",
                "updated_by": ev.actor or "Unknown",
                "time": ts_str
            })

    # ==========================================
    # 6. SALES & CRM (from ActivityEvent)
    # ==========================================
    for provider_name in ["hubspot", "zoho_crm", "pipedrive"]:
        if provider_name in connected_providers:
            crm_events = ActivityEvent.query.filter(
                ActivityEvent.workspace_id == workspace_id,
                ActivityEvent.provider == provider_name,
                _visible
            ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()
            source_label = {"hubspot": "HubSpot", "zoho_crm": "Zoho CRM", "pipedrive": "Pipedrive"}[provider_name]
            for ev in crm_events:
                sales_pipeline.append({
                    "event": ev.title,
                    "source": source_label,
                    "stage": ev.status or "Active"
                })

    # ==========================================
    # 7. ANALYTICS (from ActivityEvent)
    # ==========================================
    for provider_name in ["google_analytics"]:
        if provider_name in connected_providers:
            analytics_events = ActivityEvent.query.filter(
                ActivityEvent.workspace_id == workspace_id,
                ActivityEvent.provider == provider_name,
                _visible
            ).order_by(ActivityEvent.external_timestamp.desc()).limit(3).all()
            for ev in analytics_events:
                analytics.append({
                    "metric": ev.title,
                    "source": "Google Analytics"
                })

    # ==========================================
    # SUMMARY SYNTHESIS & AI GREETER
    # ==========================================
    # SUMMARY SYNTHESIS & AI GREETER
    # ==========================================
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

    # Determine weekly focus (real goals only; no fabricated default)
    weekly_goal_text = ""
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
        
        prefix = "[URGENT] Blocked >24h: " if is_urgent else ""
        blocked_items_list.append(f"{prefix}{t.title} (Blocked: {t.blocker_description or 'unspecified'})")
    
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
        
        if has_keyword and not is_blocklisted:
            investor_leads.append(e)

    for il in investor_leads:
        follow_ups_list.append(f"Send investor follow-up to {il['sender']}")
        


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
        today_recs.append(f"Send investor follow-up to {investor_leads[0]['sender']}")
        
    # 3. Handle decision review
    if recent_decisions:
        today_recs.append(f"Review '{recent_decisions[0].decision}' context before tomorrow's meetings")

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

    # AI-authored briefing (best-effort, rule-based fallback)
    llm_summary, llm_focus = _llm_morning_brief(
        {
            "meetings_today": schedule[:8],
            "inbox": [{"sender": c.get("sender"), "subject": c.get("subject")} for c in communications[:8]],
            "tasks": [{"title": t["title"], "status": t.get("status")} for t in tasks_feed[:10]],
            "dev_activity": [{"title": d.get("title") or d} for d in dev_activity[:6]],
            "docs_knowledge": [{"title": d.get("title") or d} for d in docs_knowledge[:6]],
            "sales_pipeline": [{"title": s.get("event") or s.get("title") or str(s)[:80]} for s in sales_pipeline[:6]],
            "analytics": [{"title": a.get("metric") or str(a)[:60]} for a in analytics[:4]],
            "blocked_items": blocked_items_list,
            "follow_ups": follow_ups_list,
            "recent_decisions": decisions_list,
            "upcoming_risks": risks_list,
            "weekly_goal": weekly_goal_text,
            "recommendations": today_recs,
        },
        len(connected_providers),
    )
    ai_wrote_brief = llm_summary is not None

    # General greeting compilation
    summary = "Welcome to FounDesk! "
    if len(connected_providers) == 0:
        summary += "You haven't connected any external integrations yet. Visit the Settings tab to connect Gmail, Calendar, Slack, or Jira and build a unified Morning Briefing."
    else:
        summary += f"Signals are flowing from {len(connected_providers)} connected integrations. "
        
        insights = []
        if len(schedule) > 0:
            insights.append(f"You have {len(schedule)} meetings scheduled today, starting with '{schedule[0]['title']}' at {schedule[0]['time']}.")
        
        if len(communications) > 0:
            insights.append(f"You have {len(communications)} unread messages in your inbox, starting with a message from '{communications[0]['sender']}'.")
        
        if len(investor_leads) > 0:
            insights.append(f"You have {len(investor_leads)} investor-related email(s) matching your focus keywords (e.g. from {investor_leads[0]['sender']}).")
            
        if len(slack_blockers) > 0:
            insights.append("SLACK ALERTS: The engineering team has reported blocker items in Slack channels.")
            
        if len(sales_pipeline) > 0:
            insights.append(f"CRM updates indicate {len(sales_pipeline)} active pipeline alerts.")
            
        summary += " ".join(insights)
        
        strategy = "\n\nFocus Strategy: "
        if len(slack_blockers) > 0 or len(blocked_tasks) > 0:
            strategy += "Review engineering blockers and PRs first thing to unblock the team, then prepare for your investor meetings."
        elif len(sales_pipeline) > 0:
            strategy += "Focus on following up on new CRM leads before jumping into standups to maximize conversion."
        else:
            strategy += "Keep driving progress on your cascaded goals. Make sure to log critical decisions to build your founder workspace memory."
        summary += strategy

    # Prefer the AI-authored brief when available
    if llm_summary:
        summary = llm_summary
    if llm_focus:
        today_focus = llm_focus

    sync_errors = []

    # Real counts of goals/tasks created today (from DB, not fabrications)
    goals_created_today = 0
    tasks_created_today = 0
    if workspace_id:
        try:
            goals_created_today = Goal.query.filter(
                Goal.workspace_id == workspace_id,
                Goal.created_at >= today_start
            ).count()
        except Exception:
            goals_created_today = 0
        try:
            tasks_created_today = Task.query.filter(
                Task.workspace_id == workspace_id,
                Task.created_at >= today_start
            ).count()
        except Exception:
            tasks_created_today = 0

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
        "ai_wrote_brief": ai_wrote_brief,
        "focus_priorities": llm_focus,
        "ai_chief_of_staff_summary": f"AI Chief of Staff: {goals_created_today + tasks_created_today} new items ({goals_created_today} goals, {tasks_created_today} tasks) generated from recent feeds." if (goals_created_today + tasks_created_today > 0) else None
    }
