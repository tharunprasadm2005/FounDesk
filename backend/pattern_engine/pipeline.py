import os
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
from datetime import datetime, timedelta
import json
from config.database import db
from models.task import Task
from models.goal import Goal, goal_decisions
from models.decision_log import DecisionLog
from models.blocker import Blocker
from models.meeting_notes import MeetingNotes
from models.follow_up import FollowUp
from models.standup import Standup
from models.knowledge_item import KnowledgeItem
from models.workspace import Workspace
from models.chronicle_event import ChronicleEvent
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from pattern_engine.models import RawEvent, PatternCorrection
from pattern_engine.dedup import is_duplicate_exact, is_duplicate_similar, is_previously_dismissed
from pattern_engine.extraction import extract_batch
from pattern_engine.tagging import apply_tags

from sqlalchemy.exc import OperationalError

MAX_DEADLOCK_RETRIES = 3

def retry_on_deadlock(func):
    def wrapper(*args, **kwargs):
        for attempt in range(MAX_DEADLOCK_RETRIES):
            try:
                return func(*args, **kwargs)
            except OperationalError as e:
                if "deadlock detected" in str(e.orig or ""):
                    db.session.rollback()
                    import time
                    time.sleep(0.2 * (attempt + 1))
                    continue
                raise
        return func(*args, **kwargs)
    return wrapper

AI_SOURCES = {"gmail", "slack", "notion", "google_docs"}
DETERMINISTIC_SOURCES = {
    "trello", "asana", "monday", "linear", "github",
    "calendly", "google_calendar", "google_meet",
    "stripe", "razorpay", "payu",
    "posthog", "mixpanel", "amplitude",
}

PROVIDER_MAP = {
    "google": ["gmail", "google_calendar", "google_meet", "google_docs"],
    "gmail": ["gmail"],
    "slack": ["slack"],
    "notion": ["notion"],
    "google_docs": ["google_docs"],
    "trello": ["trello"],
    "asana": ["asana"],
    "monday": ["monday"],
    "linear": ["linear"],
    "github": ["github"],
    "calendly": ["calendly"],
    "google_calendar": ["google_calendar"],
    "google_meet": ["google_meet"],
    "posthog": ["posthog"],
    "mixpanel": ["mixpanel"],
    "amplitude": ["amplitude"],
    "hubspot": ["hubspot"],
    "pipedrive": ["pipedrive"],
    "zoho_crm": ["zoho"],
}

RECORD_MODELS = {
    "task": Task,
    "decision": DecisionLog,
    "goal": Goal,
    "blocker": Blocker,
    "meeting_note": MeetingNotes,
    "follow_up": FollowUp,
    "knowledge_item": KnowledgeItem,
}


@retry_on_deadlock
def run_for_integration(integration_id):
    integration = UserIntegration.query.get(integration_id)
    if not integration:
        return {"error": "Integration not found"}

    provider = integration.provider
    event_providers = PROVIDER_MAP.get(provider, [provider])
    workspace_id = _resolve_workspace(integration)
    if not workspace_id:
        return {"error": "No workspace context"}

    try:
        raw_events = _fetch_raw_events(event_providers, workspace_id)
    except Exception as e:
        print(f"Fetch raw events error for {provider}: {e}")
        db.session.rollback()
        return {"processed": 0, "created": 0, "updated": 0, "skipped": 0, "errors": 0}

    try:
        unprocessed = RawEvent.query.filter(
            RawEvent.source.in_(event_providers),
            RawEvent.processed_at.is_(None),
            ~RawEvent.id.in_([r.id for r in raw_events if r.id]),
        ).all()
        raw_events.extend(unprocessed)
    except Exception:
        db.session.rollback()

    stats = {"processed": 0, "created": 0, "updated": 0, "skipped": 0, "errors": 0}

    from pattern_engine.models import LLMUsageLog
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_calls = LLMUsageLog.query.filter(LLMUsageLog.created_at >= today_start).count()
    max_daily = int(os.environ.get("LLM_DAILY_LIMIT", "200"))

    # CRM providers: don't send through batch AI (structured deal data, not NL)
    # Let job-specific stages (_llm_infer_decisions, _process_crm_deals, etc.) handle them
    # Also: don't set processed_at so downstream stages can process them
    CRM_DIRECT_SOURCES = {"hubspot", "pipedrive", "zoho_crm"}

    if provider not in CRM_DIRECT_SOURCES:
        if daily_calls < max_daily:
            processed_ids = _process_ai(raw_events, workspace_id, stats, provider) or set()
            # Only mark processed_at for events that actually got a record created
            # Events classified as "none" remain unprocessed → flow to job-specific stages
            for event in raw_events:
                if event.id in processed_ids:
                    event.processed_at = datetime.utcnow()
            db.session.commit()
        else:
            print(f"LLM daily limit ({max_daily}) reached ({daily_calls} calls today). Skipping AI processing.")
    else:
        print(f"[CRM] Provider {provider}: skipping batch AI, routing to job-specific stages ({len(raw_events)} events)")

    if stats["created"] > 0 or stats["updated"] > 0:
        _auto_standup(workspace_id)
        _auto_progress(workspace_id)
        _auto_progress_v2(workspace_id)
        _auto_link_decisions_to_goals(workspace_id)
        _stale_goal_detection(workspace_id)

    return stats


def _safe_run(fn, label, *args, on_quota="skip"):
    """Run a pipeline sub-stage with independent error handling.
    Returns True if the stage should be retried (quota exhausted), False otherwise."""
    from pattern_engine.llm_client import LLMQuotaExhausted
    try:
        fn(*args)
        db.session.commit()
        return False
    except LLMQuotaExhausted:
        print(f"[PIPELINE] {label}: LLM quota exhausted — will retry on next cycle")
        db.session.rollback()
        return True
    except Exception as e:
        print(f"[PIPELINE] {label}: error (non-fatal) — {e}")
        db.session.rollback()
        return False


def run_for_workspace(user_id, workspace_id):
    integrations = UserIntegration.query.filter_by(user_id=user_id).all()
    total = {"processed": 0, "created": 0, "updated": 0, "skipped": 0, "errors": 0}
    for integration in integrations:
        result = run_for_integration(integration.id)
        if isinstance(result, dict):
            for k in total:
                total[k] += result.get(k, 0)
    from pattern_engine.models import RawEvent as _RawEvent
    all_events = _RawEvent.query.filter(_RawEvent.processed_at.is_(None)).all()
    _process_task_tool_events(workspace_id, all_events)
    db.session.commit()
    _safe_run(_llm_infer_decisions, "decisions", workspace_id, all_events)
    _safe_run(_infer_meetings, "meetings", workspace_id, all_events)
    _safe_run(_infer_knowledge, "knowledge", workspace_id, all_events)
    _safe_run(_enrich_decisions, "enrich_decisions", workspace_id, all_events)
    _safe_run(_auto_align_goals, "goals", workspace_id)
    _auto_link_decisions_to_goals(workspace_id)
    _auto_progress_v2(workspace_id)
    _stale_goal_detection(workspace_id)
    _safe_run(_llm_follow_up_detection, "follow_ups_llm", workspace_id, all_events)
    _safe_run(_crm_follow_up_detection, "follow_ups_crm", workspace_id)
    _safe_run(_auto_resolve_follow_ups, "follow_ups_resolve", workspace_id)
    _safe_run(_update_follow_up_priority, "follow_ups_priority", workspace_id)
    _safe_run(_process_blocker_events, "blockers", workspace_id, all_events)
    _safe_run(_process_crm_blockers, "crm_blockers", workspace_id)
    _safe_run(_auto_resolve_blockers, "blockers_resolve", workspace_id)
    _safe_run(_update_blocker_priority, "blockers_priority", workspace_id)
    _safe_run(_handle_task_deletes, "task_deletes", workspace_id)
    _safe_run(_detect_overdue_tasks, "task_overdue", workspace_id)
    _safe_run(_auto_standup_for_all_members, "standup_all", workspace_id)
    _safe_run(_cross_link_standup_blockers, "standup_blockers", workspace_id)
    _safe_run(_detect_decision_reversal, "decision_reversal", workspace_id)
    _safe_run(_detect_knowledge_staleness, "knowledge_stale", workspace_id)
    _safe_run(_link_knowledge_to_decisions, "knowledge_link", workspace_id)
    _safe_run(_create_chronicle_for_blocker_resolve, "chronicle_blockers", workspace_id)
    _compute_active_phase(workspace_id)
    db.session.commit()
    return total


def run_all(user_id=None, workspace_id=None):
    if workspace_id:
        ws = Workspace.query.get(workspace_id)
        if ws:
            _compile_feed(ws.id)
            return run_for_workspace(ws.creator_id or 1, workspace_id)
    workspaces = Workspace.query.all()
    total = {"processed": 0, "created": 0, "updated": 0, "skipped": 0, "errors": 0}
    for ws in workspaces:
        _compile_feed(ws.id)
        uid = ws.creator_id or 1
        result = run_for_workspace(uid, ws.id)
        for k in total:
            total[k] += result.get(k, 0)
    return total


def _compile_feed(workspace_id):
    from services.activity_compiler import compile_activity_feed
    for attempt in range(3):
        try:
            compile_activity_feed(workspace_id, allow_refresh=True)
            return
        except OperationalError as e:
            if "deadlock detected" in str(e.orig or ""):
                db.session.rollback()
                import time
                time.sleep(0.2 * (attempt + 1))
                continue
            print(f"Activity feed OperationalError (deadlock?): {e}")
            return
        except Exception as e:
            print(f"Activity feed compile error: {e}")
            return


def _resolve_workspace(integration):
    from models.workspace_member import WorkspaceMember
    member = WorkspaceMember.query.filter_by(user_id=integration.user_id).first()
    return member.workspace_id if member else None


def _fetch_raw_events(event_providers, workspace_id):
    existing_source_ids = {}
    existing_raw_refs = set()
    for ep in event_providers:
        ids = set()
        for r in RawEvent.query.filter_by(source=ep).with_entities(RawEvent.source_id, RawEvent.id).all():
            if r.source_id:
                ids.add(r.source_id)
        existing_source_ids[ep] = ids

    # Collect raw_refs of ActivityEvents that already have RawEvents
    for r in RawEvent.query.with_entities(RawEvent.source_ref, RawEvent.source).all():
        if r.source_ref:
            existing_raw_refs.add((r.source, r.source_ref))

    results = []
    for ep in event_providers:
        query = ActivityEvent.query.filter_by(provider=ep, workspace_id=workspace_id)
        if existing_source_ids[ep]:
            query = query.filter(~ActivityEvent.id.cast(db.String).in_(existing_source_ids[ep]))
        activity_events = query.order_by(ActivityEvent.external_timestamp.desc()).limit(200).all()

        for ae in activity_events:
            # Skip if already processed via raw_ref (same original event across sync runs)
            raw_ref = getattr(ae, "raw_ref", None)
            if raw_ref and (ep, raw_ref) in existing_raw_refs:
                continue

            re = RawEvent(
                source=ep,
                source_id=str(ae.id),
                source_ref=raw_ref,
                event_type=ae.activity_type or "generic",
                occurred_at=ae.external_timestamp or datetime.utcnow(),
                raw_payload={
                    "title": ae.title,
                    "details": ae.details,
                    "actor": ae.actor,
                    "status": ae.status,
                    "priority": ae.priority or "P2",
                },
                is_mock=ae.is_mock or False,
            )
            db.session.add(re)
            db.session.flush()
            if raw_ref:
                existing_raw_refs.add((ep, raw_ref))
            results.append(re)

    if results:
        db.session.commit()
    return results


def _get_workspace_creator(workspace_id):
    ws = Workspace.query.get(workspace_id)
    return ws.creator_id if ws else 1


ONBOARDING_AI_TITLES = {
    "welcome to posthog!",
    "welcome to mixpanel",
    "add to your to-do list with one-click capture",
    "welcome to your asana trial",
    "welcome to your new account",
    "get started with posthog",
    "get started with mixpanel",
    "your analytics are ready",
    "here's your first event",
}


MEETING_KEYWORDS = {
    "standup": "daily_standup",
    "daily sync": "daily_standup",
    "morning sync": "daily_standup",
    "sync": "sync",
    "1:1": "one_on_one",
    "one-on-one": "one_on_one",
    "call": "call",
    "meeting": "meeting",
    "discussion": "discussion",
    "interview": "interview",
    "review": "review",
    "planning": "planning",
    "retro": "retrospective",
    "retrospective": "retrospective",
    "demo": "demo",
    "sprint": "sprint_ceremony",
    "kickoff": "kickoff",
    "brainstorm": "brainstorm",
    "workshop": "workshop",
    "office hours": "office_hours",
    "coffee": "casual",
    "lunch": "casual",
    "client": "client_meeting",
    "all-hands": "all_hands",
    "allhands": "all_hands",
    "team": "team_meeting",
    "huddle": "huddle",
    "appointment": "appointment",
    "session": "session",
    "webinar": "webinar",
    "zoom": "video_call",
    "google meet": "video_call",
    "teams": "video_call",
    "conference": "conference",
    "catch-up": "casual",
    "catchup": "casual",
    "touch base": "sync",
    "q&a": "qa_session",
    "roundtable": "roundtable",
}

KNOWLEDGE_SKIP_SOURCES = {"linear", "trello", "asana", "monday", "hubspot", "pipedrive", "calendly"}

# Analytics sources that produce trivial event-type payloads (page_viewed, user_logged_in, etc.)
# These are never knowledge. We skip them unless a custom free-text note field exists.
ANALYTICS_SOURCES = {"mixpanel", "amplitude", "posthog"}

MARKETING_DOMAINS = ["mailchimp.com", "sendgrid.net", "constantcontact.com", "klaviyo.com",
                     "hubspotemail.net", "marketo.com", "salesforce.com",
                     # Service provider educational/marketing — no business-specific knowledge
                     "openrouter.ai", "mongodb.com", "tealhq.com",
                     "quora.com", "razorpay.com", "naukri.com", "selfstudys.com",
                     "indeed.com", "mindnudge", "codsoft",
                     "internshala", "hirist", "cutshort",
                     "weekday.work", "wellfound", "instahyre", "hirect",
                     "zoho-recruit", "recruit.zoho"]

SPAM_SUBJECTS = ["unsubscribe", "click here", "limited time", "% off", "free trial", "newsletter",
                 "your application", "application received", "application status",
                 "thank you for applying", "thanks for applying",
                 "offer letter", "job offer", "hiring",
                 "internship", "resume", "shortlisted",
                 "interview", "job guaranteed", "guaranteed program"]





def _strip_html(text):
    import re
    if not text:
        return ""
    text = re.sub(r'<li>', '\n- ', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'<p>', '\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'\n\s*\n', '\n', text)
    return text.strip()


PROMO_SKIP_SOURCES = {"hubspot", "pipedrive", "zoho", "linear", "trello", "asana", "monday", "github", "calendly", "stripe", "razorpay", "payu", "posthog", "mixpanel", "amplitude"}

def _is_promotional(title, details, source=None):
    if source and source.lower() in PROMO_SKIP_SOURCES:
        return False
    promo_patterns = [
        "newsletter", "unsubscribe", "promotion", "sponsored",
        "you won't believe", "act now", "limited time", "exclusive offer",
        "stop writing the same email", "students can save", "build their skills",
        "move beyond small apps", "test message", "integration test",
        "hello from slack test", "ping check", "welcome to", "test message from",
        "slack test", "testing integration", "testing foundesk", "test ping",
        "save and build", "build your skills",
        "stop writing the same email", "send the same email",
        "tasks due soon", "tasks updated", "daily update", "weekly digest",
        "your trial", "tips for", "you're invited", "get started with",
        "calendar digest", "daily recap", "activity summary",
        "noreply@", "donotreply@", "no-reply@",
    ]
    text = (title + " " + details).lower()
    return any(p in text for p in promo_patterns)


def _strip_inferred_prefix(text):
    if not text:
        return text
    import re as _re
    text = _re.sub(r'<[^>]+>', ' ', text)
    text = _re.sub(
        r'(?i)^(inferred from|extracted from|based on)\s+.+?(?:event|source|integration|record|activity):?\s*',
        '',
        text,
    ).strip()
    text = _re.sub(r'(?i)^(inferred from|extracted from)\s+.+?:\s*', '', text).strip()
    return _re.sub(r'\s+', ' ', text).strip()


TASK_ONLY_SOURCES = {"linear", "trello", "asana", "monday", "github"}
MEETING_ONLY_SOURCES = {"calendly"}

HUBSPOT_DECISION_STAGES = {"contractsent", "closedwon", "closedlost"}

# Pipedrive deals are only decision-worthy on stage progression
PIPEDRIVE_DECISION_STAGES = {"contractsent", "closed_won", "closed_lost", "negotiation", "proposal_sent"}

# Sources that should never produce decisions
NEVER_DECISION_PATTERNS = {
    "decision status updated", "user logged in", "user signed out",
    "page_viewed", "dashboard_viewed", "decision_deleted", "user_logged_in",
    "posthog:", "amplitude:", "mixpanel:",
    "tasks due", "daily update", "weekly digest", "unsubscribe",
    "your trial", "tips for", "get started", "new feature",
    "invoice", "receipt", "payment confirmed",
}


# HubSpot/Pipedrive gates removed — Qwen decides decision-worthiness from the raw event content.


def _extract_key_entities(title):
    """Extract potential company/project names from a title for cross-source dedup."""
    import re
    # Common patterns: "X Deal", "X Contract", "X Subscription", "X Project"
    # Also extract any capitalized multi-word sequences
    entities = set()
    # Remove common prefixes
    clean = re.sub(r'^(hubspot deal|pipedrive deal|deal|contract|subscription):?\s*', '', title, flags=re.IGNORECASE).strip()
    for word in clean.split():
        if word[0].isupper() and len(word) > 2:
            entities.add(word.lower())
    return entities


def _is_duplicate(new_title, existing_titles, threshold=0.82):
    import difflib
    if new_title in existing_titles:
        return True
    new_lower = new_title.lower()
    new_entities = _extract_key_entities(new_title)
    for t in existing_titles:
        t_lower = t.lower()
        # Entity check: if new title mentions a key entity found in existing
        if new_entities and any(e in t_lower for e in new_entities):
            return True
        ratio = difflib.SequenceMatcher(None, new_lower, t_lower).ratio()
        if ratio >= threshold:
            return True
    return False


def _llm_infer_decisions(workspace_id, raw_events):
    from pattern_engine.extraction import extract_decision_from_event, extract_task_from_event
    from pattern_engine.models import LLMUsageLog
    import json as _json
    try:
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_calls = LLMUsageLog.query.filter(LLMUsageLog.created_at >= today_start).count()
        max_daily = int(os.environ.get("LLM_DAILY_LIMIT", "200"))
        remaining = max_daily - daily_calls
        if remaining <= 0:
            print(f"[LIMIT] LLM daily limit ({max_daily}) reached. Skipping decision inference.")
            return

        # Load ALL existing decision titles + source_event_ids for dedup
        existing_records = DecisionLog.query.filter_by(workspace_id=workspace_id).all()
        existing_titles = set()
        existing_source_ids = set()
        for d in existing_records:
            if d.decision:
                existing_titles.add(d.decision)
            if d.source_event_id:
                existing_source_ids.add(str(d.source_event_id))

        creator_id = _get_workspace_creator(workspace_id)
        batch = raw_events[:min(20, remaining)]
        created = 0
        skipped = 0
        tasks_routed = 0
        print(f"[BATCH] Processing {len(batch)} events (ws={workspace_id}, existing_decisions={len(existing_titles)})")
        for event in batch:
            # Skip if this raw event already has a decision (e.g. from _process_ai)
            if str(event.id) in existing_source_ids:
                print(f'[SKIP]  source={event.source} event_id={event.id} reason="already has decision (source_event_id match)"')
                skipped += 1
                continue
            payload = event.raw_payload
            if isinstance(payload, str):
                try:
                    payload = _json.loads(payload)
                except (_json.JSONDecodeError, TypeError):
                    print(f'[SKIP]  source={event.source} event_id={event.id} reason="raw_payload not valid JSON"')
                    skipped += 1
                    continue
            if not isinstance(payload, dict):
                print(f'[SKIP]  source={event.source} event_id={event.id} reason="raw_payload not a dict"')
                skipped += 1
                continue
            raw_title = payload.get("title", "") or ""
            raw_details = payload.get("details", "") or ""
            title = _strip_html(raw_title)
            details = _strip_html(raw_details)
            safe_title = raw_title[:80].encode('ascii', 'replace').decode()
            print(f'[EVENT] source={event.source} title="{safe_title}" raw_title_len={len(raw_title)} stripped_title_len={len(title)}')
            if not title and not details:
                print(f'[SKIP]  source={event.source} title="{title[:50]}" reason="empty after strip_html"')
                skipped += 1
                continue
            if _is_promotional(title, details, source=event.source):
                print(f'[SKIP]  source={event.source} title="{title[:50]}" reason="promotional content"')
                skipped += 1
                continue

            # Source-based routing — task-only sources skip decision extraction
            if event.source and event.source.lower() in TASK_ONLY_SOURCES:
                print(f'[ROUTE] source={event.source} title="{title[:50]}" reason="task-only source"')
                tasks_routed += 1
                continue

            # Meeting-only sources: route to meeting intelligence, never decisions
            if event.source and event.source.lower() in MEETING_ONLY_SOURCES:
                print(f'[ROUTE] source={event.source} title="{title[:50]}" reason="meeting-only source"')
                tasks_routed += 1
                continue

            # Analytics-only sources: never produce decisions
            if event.source and event.source.lower() in {"posthog", "amplitude", "mixpanel"}:
                print(f'[SKIP]  source={event.source} title="{title[:50]}" reason="analytics-only source"')
                skipped += 1
                continue

            # Content too short to be a decision
            if len(title) + len(details) < 50:
                print(f'[SKIP]  source={event.source} title="{title[:50]}" reason="content too short ({len(title) + len(details)} chars)"')
                skipped += 1
                continue

            # Never-decision patterns: system events, analytics pings, automated reports
            title_lower = title.lower()
            if any(pat in title_lower for pat in NEVER_DECISION_PATTERNS):
                print(f'[SKIP]  source={event.source} title="{title[:50]}" reason="matches NEVER_DECISION_PATTERNS"')
                skipped += 1
                continue

            # Gmail: skip noreply/donotreply senders
            if event.source and event.source.lower() == "gmail":
                actor = (payload.get("actor") or "").lower()
                if any(pat in actor for pat in ["noreply@", "donotreply@", "no-reply@", "mailchimp.com", "adobe.com", "hubspot.com", "asana.com", "monday.com", "notion.so", "linkedin.com", "twitter.com"]):
                    print(f'[SKIP]  source=gmail title="{title[:50]}" reason="unwanted sender domain" actor="{actor[:40]}"')
                    skipped += 1
                    continue

            event_text = f"Title: {title}\nDetails: {details}" if details else title
            try:
                result = extract_decision_from_event(event_text, event.source)
            except Exception as e:
                from pattern_engine.llm_client import LLMQuotaExhausted
                if isinstance(e, LLMQuotaExhausted):
                    print(f"[LLM EXHAUSTED] All LLM tiers exhausted — stopping decision inference")
                    print(f"[BATCH] Result: created={created} skipped={skipped} tasks_routed={tasks_routed}")
                    return
                print(f'[ERROR] source={event.source} title="{title[:50]}" error="{e}"')
                skipped += 1
                continue
            confidence = result.get("confidence", 0)
            print(f'[QWEN]  source={event.source} title="{title[:50]}" response={json.dumps(result)[:300]}')
            if not result.get("has_decision"):
                print(f'[QWEN-R] source={event.source} title="{title[:50]}" has_decision=false confidence={confidence}')
                skipped += 1
                continue
            if confidence < 0.4:
                print(f'[SKIP]  source={event.source} title="{title[:50]}" reason="confidence {confidence} < 0.4"')
                skipped += 1
                continue
            decision_title = (result.get("title") or title)[:255]
            decision_title = _strip_inferred_prefix(decision_title)
            if not decision_title:
                print(f'[SKIP]  source={event.source} title="{title[:50]}" reason="decision_title empty after strip"')
                skipped += 1
                continue
            # Dedup by similarity (not just exact match)
            if _is_duplicate(decision_title, existing_titles):
                print(f'[SKIP]  source={event.source} title="{decision_title[:50]}" reason="duplicate of existing decision"')
                skipped += 1
                continue
            existing_titles.add(decision_title)
            existing_source_ids.add(str(event.id))
            summary = _strip_inferred_prefix(result.get("summary", ""))
            decision_type = result.get("decision_type")
            # Validate decision_type against allowed enum
            allowed_types = {"product", "hiring", "sales", "financial", "technical", "strategic", "none"}
            if decision_type not in allowed_types:
                decision_type = None
            decision = DecisionLog(
                decision=decision_title,
                context=summary[:500],
                created_by=creator_id,
                workspace_id=workspace_id,
                source="ai_pattern_engine",
                source_integration=event.source,
                source_event_id=event.id,
                ai_status="pending_confirmation",
                confidence_score=round(confidence, 2),
                decision_type=decision_type,
                source_signal="inferred",
            )
            db.session.add(decision)
            db.session.flush()
            _result = {"record_type": "decision", "fields": {"title": decision_title, "summary": summary}, "confidence": 0.5, "source_signal": "inferred"}
            _create_chronicle(decision, _result, event, workspace_id)
            created += 1
            print(f'[INSERT] source={event.source} title="{decision_title[:50]}" summary="{summary[:60]}"')
        db.session.commit()
        print(f"[SUMMARY] ws={workspace_id} created={created} skipped={skipped} routed={tasks_routed}")
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] ws={workspace_id} exception={e}")
        import traceback
        traceback.print_exc()


def _enrich_decisions(workspace_id, raw_events):
    try:
        decisions = DecisionLog.query.filter_by(workspace_id=workspace_id).order_by(DecisionLog.created_at.desc()).limit(50).all()
        all_meetings = MeetingNotes.query.filter_by(workspace_id=workspace_id).all()
        meetings_with_decisions = [m for m in all_meetings if m.decisions_made and isinstance(m.decisions_made, list) and len(m.decisions_made) > 0]
        for d in decisions:
            if d.linked_meeting_id:
                continue
            matching = None
            # Priority 1: match by same source_event_id
            if d.source_event_id:
                matching = MeetingNotes.query.filter(
                    MeetingNotes.workspace_id == workspace_id,
                    MeetingNotes.source_event_id == str(d.source_event_id)
                ).first()
            # Priority 2: match by content (decisions_made field)
            if not matching:
                for m in meetings_with_decisions:
                    for dm in m.decisions_made:
                        if dm and d.decision:
                            dm_norm = dm.strip().lower()
                            dec_norm = d.decision.strip().lower()
                            if dm_norm in dec_norm or dec_norm in dm_norm:
                                matching = m
                                break
                            dec_terms = set(dec_norm.split())
                            dm_terms = set(dm_norm.split())
                            common = dec_terms & dm_terms
                            if len(common) >= 2 and len(common) >= len(dec_terms) * 0.5:
                                matching = m
                                break
                    if matching:
                        break
            # Priority 3: match by title/key_topics similarity
            if not matching:
                dec_lower = d.decision.lower() if d.decision else ''
                best = None
                best_score = -1
                for m in all_meetings:
                    score = 0
                    if m.title:
                        t_lower = m.title.lower()
                        if dec_lower in t_lower or t_lower in dec_lower:
                            score += 20
                        else:
                            dec_terms = set(dec_lower.split())
                            title_terms = set(t_lower.split())
                            overlap = dec_terms & title_terms
                            score += len(overlap) * 5
                    if m.key_topics and isinstance(m.key_topics, list):
                        for kt in m.key_topics:
                            if kt and kt.lower() in dec_lower:
                                score += 15
                    if score > best_score:
                        best_score = score
                        best = m
                if best_score > 5:
                    matching = best
            # Priority 4: fall back to time proximity
            if not matching and d.created_at:
                all_time_range = MeetingNotes.query.filter(
                    MeetingNotes.workspace_id == workspace_id,
                    MeetingNotes.date >= d.created_at - timedelta(hours=2),
                    MeetingNotes.date <= d.created_at + timedelta(hours=2),
                ).order_by(MeetingNotes.date).all()
                if all_time_range:
                    best = None
                    best_score = -1
                    for m in all_time_range:
                        score = 0
                        if m.source_integration == d.source_integration:
                            score += 10
                        time_delta = abs((m.date - d.created_at).total_seconds()) if m.date and d.created_at else 0
                        score -= time_delta / 60
                        if score > best_score:
                            best_score = score
                            best = m
                    matching = best
            if matching:
                d.linked_meeting_id = matching.id
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Decision enrichment error: {e}")


MEETING_VALID_SOURCES = {"google_calendar", "google_meet", "calendly", "notion", "google_docs", "slack"}
MEETING_SKIP_SOURCES = {"linear", "trello", "asana", "github", "hubspot", "pipedrive", "monday", "gmail", "posthog", "mixpanel", "amplitude"}

MEETING_SKIP_TITLE_PATTERNS = ["ooo", "lunch", "break", "personal", "blocked", "out of office", "holiday", "birthday", "focus time"]

CONTENT_MIN_LENGTH = {
    'google_calendar': 80,
    'google_meet': 40,
    'calendly': 40,
    'notion': 100,
    'google_docs': 100,
    'slack': 60,
}

MEETING_KEYWORDS_FOR_NOTION_DOCS = ["meeting", "sync", "call", "standup", "review", "demo", "interview", "retro", "1:1", "1-1", "one on one", "all hands", "allhands", "brainstorm", "agenda", "attendees", "action items", "decisions", "discussion"]

SLACK_MEETING_CHANNELS = ["meeting-notes", "recaps", "standups", "meeting-recaps", "stand-up", "daily-standup"]

SLACK_MEETING_PREFIXES = ["meeting recap:", "standup:", "call summary:", "meeting notes:"]


def _is_valid_meeting_source(src, payload):
    """Check if a source is valid for meeting notes. Qwen decides meeting-worthiness from content."""
    return src in MEETING_VALID_SOURCES


def _strip_meeting_html(text):
    import re
    if not text:
        return ""
    text = re.sub(r'<li>', '\n- ', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    text = re.sub(r'</?p>', '\n', text)
    text = re.sub(r'<hr\s*/?>', '', text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'(?:📹[\uFE00-\uFE0F\u200D]?)?\s*Google Meet:\s*https?://\S+', '', text)
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'Inferred from \w+ event:\s*', '', text)
    text = re.sub(r'\n\s*\n+', '\n', text)
    return text.strip()


def _infer_meetings(workspace_id, raw_events):
    _llm_exhausted = False
    try:
        import json as _json
        from pattern_engine.extraction import extract_meeting_from_event
        from pattern_engine.models import LLMUsageLog

        existing = {m.title for m in MeetingNotes.query.filter_by(workspace_id=workspace_id).with_entities(MeetingNotes.title).all()}
        existing_titles_7d = {
            m.title for m in MeetingNotes.query.filter(
                MeetingNotes.workspace_id == workspace_id,
                MeetingNotes.date >= datetime.utcnow() - timedelta(days=7)
            ).with_entities(MeetingNotes.title).all()
        }

        # Check LLM budget
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        daily_calls = LLMUsageLog.query.filter(LLMUsageLog.created_at >= today_start).count()
        max_daily = int(os.environ.get("LLM_DAILY_LIMIT", "200"))
        remaining = max_daily - daily_calls

        created = 0
        creator_id = _get_workspace_creator(workspace_id)

        for event in raw_events:
            src = (event.source or "").lower()
            if src not in MEETING_VALID_SOURCES and src != "slack":
                continue

            payload = event.raw_payload
            if isinstance(payload, str):
                try:
                    payload = _json.loads(payload)
                except (_json.JSONDecodeError, TypeError):
                    continue
            if not isinstance(payload, dict):
                continue

            title = _strip_meeting_html(payload.get("title", "") or "")
            details = _strip_meeting_html(payload.get("details", "") or "")
            title_lower = title.lower()

            # Content gate: skip empty or too-short content (source-specific thresholds)
            if not title and not details:
                continue
            min_len = CONTENT_MIN_LENGTH.get(src, 40)
            if len(details) < min_len:
                continue

            # Skip OOO/lunch/break/personal events
            if any(pat in title_lower for pat in MEETING_SKIP_TITLE_PATTERNS):
                continue

            # Calendar events: skip if only a Meet link with no agenda
            if src == "google_calendar" and not details.strip():
                continue

            # Calendly: skip booking confirmations with no content
            if src == "calendly":
                if not details.strip() or "calendly.com" in details:
                    continue

            meeting_title = title[:255] if title else f"Meeting from {src}"
            if meeting_title in existing:
                continue
            existing.add(meeting_title)

            # Cross-source dedup: check if same meeting from google_calendar already
            # exists as google_meet or vice versa via time proximity
            occurs_at = payload.get("occurred_at") or event.occurred_at or datetime.utcnow()
            if isinstance(occurs_at, str):
                try:
                    occurs_at = datetime.fromisoformat(occurs_at)
                except (ValueError, TypeError):
                    occurs_at = datetime.utcnow()

            # Check for time-proximate existing MeetingNotes (within 30 min window)
            if src in ("google_calendar", "google_meet"):
                time_window_start = occurs_at - timedelta(minutes=15)
                time_window_end = occurs_at + timedelta(minutes=15)
                proximate = MeetingNotes.query.filter(
                    MeetingNotes.workspace_id == workspace_id,
                    MeetingNotes.date >= time_window_start,
                    MeetingNotes.date <= time_window_end,
                    MeetingNotes.source_integration.in_(["google_calendar", "google_meet"]),
                    MeetingNotes.source_integration != src,
                ).first()
                if proximate:
                    print(f"[MEETING] Cross-source dedup: '{meeting_title}' ({src}) overlaps '{proximate.title}' ({proximate.source_integration}) — skipping")
                    continue
            if isinstance(occurs_at, str):
                try:
                    occurs_at = datetime.fromisoformat(occurs_at)
                except (ValueError, TypeError):
                    occurs_at = datetime.utcnow()

            attendees_str = payload.get("attendees") or ""

            # Try Qwen extraction if LLM budget remains
            qwen_result = None
            if remaining > 0 and not _llm_exhausted:
                event_text = f"Title: {title}\nDetails: {details}" if details else title
                try:
                    qwen_result = extract_meeting_from_event(event_text, src)
                    remaining -= 1
                except Exception as exc:
                    from pattern_engine.llm_client import LLMQuotaExhausted
                    if isinstance(exc, LLMQuotaExhausted):
                        print(f"[LLM EXHAUSTED] All LLM tiers exhausted — skipping further meeting LLM calls")
                        _llm_exhausted = True
                    else:
                        pass

            if qwen_result and qwen_result.get("is_meeting"):
                raw_mt = qwen_result.get("meeting_type", "other")
                # Map old-style enum values (planning, review, sync, etc.) to frontend dropdown values
                MEETING_TYPE_MAP = {
                    "planning": "Sprint Planning",
                    "review": "Review",
                    "sync": "Standup",
                    "demo": "Client Call",
                    "standup": "Standup",
                    "investor": "Investor Sync",
                    "customer": "Client Call",
                    "retro": "Retro",
                    "one_on_one": "1:1",
                    "all_hands": "All Hands",
                    "brainstorm": "Brainstorm",
                    "other": "Other",
                    "sprint planning": "Sprint Planning",
                    "investor sync": "Investor Sync",
                    "client call": "Client Call",
                }
                mt = MEETING_TYPE_MAP.get(raw_mt.lower().strip(), "Other")
                summary = qwen_result.get("summary", details[:500])
                key_topics = qwen_result.get("key_topics", [])
                decisions_made = qwen_result.get("decisions_made", [])
                action_items = qwen_result.get("action_items", [])
                attendees_list = qwen_result.get("attendees", [])
                follow_up_needed = qwen_result.get("follow_up_needed", False)
                follow_up_note = qwen_result.get("follow_up_note", "")
                qwen_title = (qwen_result.get("title") or meeting_title)[:255]

                # Validate title doesn't start with source prefix
                if any(qwen_title.lower().startswith(prefix) for prefix in ["linear:", "trello:", "asana:", "hubspot:", "pipedrive:", "github:", "monday:", "gmail:"]):
                    qwen_title = meeting_title

                # Use Qwen attendees if available, fall back to event attendees
                if attendees_list and isinstance(attendees_list, list):
                    attendees_str = ", ".join(attendees_list)

                note = MeetingNotes(
                    title=qwen_title,
                    summary=summary[:500] if summary else details[:500],
                    attendees=attendees_str,
                    meeting_type=mt,
                    date=occurs_at,
                    key_topics=key_topics,
                    decisions_made=decisions_made,
                    action_items=action_items,
                    follow_up_needed=follow_up_needed,
                    follow_up_note=follow_up_note[:500] if follow_up_note else "",
                    created_by=creator_id,
                    workspace_id=workspace_id,
                    source_integration=src,
                    source_event_id=str(event.id),
                    status="Finalized" if (len(details) > 200 or src in ("google_meet", "notion", "google_docs")) else "Draft",
                )
                db.session.add(note)
                db.session.flush()

                # Cross-module linking: create DecisionLog entries for each decision
                # Dedup against existing DecisionLog entries (not just meeting titles)
                existing_decision_texts = set()
                for existing_dl in DecisionLog.query.filter_by(workspace_id=workspace_id).with_entities(DecisionLog.decision).all():
                    if existing_dl.decision:
                        existing_decision_texts.add(existing_dl.decision.strip().lower())
                linked_decision_ids = []
                for decision_text in decisions_made:
                    dt = decision_text.strip()
                    if dt and dt.lower() not in existing_decision_texts and dt not in existing_titles_7d:
                        existing_decision_texts.add(dt.lower())
                        existing_titles_7d.add(dt)
                        dl = DecisionLog(
                            decision=dt[:255],
                            context=f"Extracted from meeting: {qwen_title}",
                            created_by=creator_id,
                            workspace_id=workspace_id,
                            source="ai_pattern_engine",
                            source_integration=src,
                            linked_meeting_id=note.id,
                            ai_status="pending_confirmation",
                            confidence_score=0.7,
                            source_signal="explicit",
                        )
                        db.session.add(dl)
                        db.session.flush()
                        linked_decision_ids.append(dl.id)

                # Cross-module linking: create Task entries for each action item
                linked_task_ids = []
                for action_text in action_items:
                    if action_text.strip():
                        t = Task(
                            title=action_text[:255],
                            description=f"From meeting: {qwen_title}",
                            status="Not Started",
                            workspace_id=workspace_id,
                            user_id=creator_id,
                            linked_meeting_id=note.id,
                        )
                        db.session.add(t)
                        db.session.flush()
                        linked_task_ids.append(t.id)

                _create_chronicle(note, {
                    "record_type": "meeting_note",
                    "fields": {"title": qwen_title, "summary": summary[:200]},
                    "confidence": 0.8, "source_signal": "explicit",
                }, event, workspace_id)

                # Auto-create FollowUp record when meeting needs follow-up
                if follow_up_needed and follow_up_note and creator_id:
                    from models.follow_up import FollowUp
                    fu = FollowUp(
                        person_name=", ".join(attendees_list) if attendees_list else "Meeting participant",
                        context=follow_up_note[:200],
                        followup_date=datetime.utcnow() + timedelta(days=3),
                        status="pending",
                        linked_meeting_id=note.id,
                        user_id=creator_id,
                        workspace_id=workspace_id,
                    )
                    db.session.add(fu)

                print(f'[MEETING] Qwen src={src} title="{qwen_title[:50]}" decisions={len(linked_decision_ids)} actions={len(linked_task_ids)}')
            else:
                # Keyword-based fallback (no LLM or Qwen rejected)
                content_len = len(details)
                # For slack recaps: extract a clean title from the content
                slack_meeting = False
                if src == "slack" and details:
                    import re as _re
                    slack_prefixes = [r"^Meeting recap:\s*", r"^Standup:\s*", r"^Call summary:\s*"]
                    for pat in slack_prefixes:
                        match = _re.search(pat, details, _re.IGNORECASE)
                        if match:
                            after_prefix = details[match.end():].split('\n')[0].strip()
                            if after_prefix:
                                meeting_title = after_prefix[:255]
                                slack_meeting = True
                                break
                    # Non-meeting Slack messages: skip MeetingNotes creation
                    # They flow through to _llm_infer_decisions and _process_blocker_events
                    if not slack_meeting:
                        continue
                note = MeetingNotes(
                    title=meeting_title,
                    summary=details[:500] if details else "",
                    attendees=attendees_str,
                    meeting_type="other",
                    date=occurs_at,
                    created_by=creator_id,
                    workspace_id=workspace_id,
                    source_integration=src,
                    source_event_id=str(event.id),
                    status="Finalized" if content_len > 200 else "Draft",
                )
                db.session.add(note)
                db.session.flush()
                _create_chronicle(note, {
                    "record_type": "meeting_note",
                    "fields": {"title": meeting_title, "summary": details[:200]},
                    "confidence": 0.5, "source_signal": "inferred",
                }, event, workspace_id)
                print(f'[MEETING] keyword src={src} title="{meeting_title[:50]}"')

            created += 1

        if created > 0:
            db.session.commit()
            print(f"Meeting inference for ws {workspace_id}: {created} meetings created")
        else:
            print(f"Meeting inference for ws {workspace_id}: 0 meetings (no new matches)")
    except Exception as e:
        db.session.rollback()
        print(f"Meeting inference error for ws {workspace_id}: {e}")
        import traceback
        traceback.print_exc()


def prepare_for_qwen(raw_content, source):
    import re
    if not raw_content:
        return ""
    content = re.sub(r'<li>', '\n- ', raw_content)
    content = re.sub(r'<br\s*/?>', '\n', content)
    content = re.sub(r'</?p>', '\n', content)
    content = re.sub(r'<[^>]+>', ' ', content)
    content = re.sub(r'https?://\S+', '', content)
    content = re.sub(r'Inferred from \w+ event:\s*', '', content)
    content = re.sub(r'[\U00010000-\U0010ffff]', '', content)
    content = re.sub(r'\s+', ' ', content).strip()
    return content[:2000]


def _is_knowledge_noise(event, payload):
    """Minimal noise gate — reject only obvious junk without calling Qwen."""
    src = (event.source or "").lower()
    if src in KNOWLEDGE_SKIP_SOURCES:
        return True

    # Analytics pre-filter: skip mixpanel/amplitude/posthog unless they carry
    # a non-trivial free-text note/comment field (custom prose, not event_type labels).
    ANALYTICS_FREE_TEXT_FIELDS = {"note", "comment", "description", "details", "message", "body"}
    if src in ANALYTICS_SOURCES:
        has_prose = False
        for field in ANALYTICS_FREE_TEXT_FIELDS:
            val = payload.get(field, "")
            if isinstance(val, str) and len(val.strip()) > 100:
                has_prose = True
                break
        if not has_prose:
            return True

    title = (payload.get("title", "") or "").lower()
    details = (payload.get("details", "") or "").lower()
    text = title + " " + details

    # Too short after stripping
    import re as _re
    stripped = _re.sub(r'<[^>]+>', '', text)
    stripped = _re.sub(r'https?://\S+', '', stripped)
    stripped = _re.sub(r'\s+', ' ', stripped).strip()
    if len(stripped) < 80:
        return True

    # Marketing domains in sender/from field
    sender = (payload.get("actor", "") or "").lower()
    sender_email = (payload.get("from", "") or "").lower()
    sender_combined = sender + " " + sender_email
    if any(dom in sender_combined for dom in MARKETING_DOMAINS):
        return True
    if _re.search(r'noreply@\S+', sender_combined):
        return True

    # Spam subject lines
    if any(spam in title for spam in SPAM_SUBJECTS):
        return True

    # Auto-generated GitHub commits
    if src == "github":
        commit = details or title
        if any(commit.strip().startswith(p) for p in ["merge branch", "bump version", "update dependencies", "chore:", "fix: typo"]):
            return True

    # Slack bots
    if src == "slack" and payload.get("bot_id"):
        return True

    return False


def _infer_knowledge(workspace_id, raw_events):
    """
    Pull pending RawEvents, mark them processing, classify via Qwen,
    mark done/failed/skipped. Logs per-source diagnostics.
    Uses PipelineLock to prevent concurrent runs.
    """
    try:
        import json as _json
        import socket as _socket
        from pattern_engine.extraction import classify_knowledge_from_event
        from pattern_engine.models import LLMUsageLog, PipelineLock
        from difflib import SequenceMatcher
        from datetime import timedelta
        from collections import defaultdict

        # PipelineLock: prevent concurrent knowledge runs for this workspace
        lock_name = f"knowledge_{workspace_id}"
        lock_ttl = int(os.environ.get("PIPELINE_LOCK_TTL_MINUTES", "15"))
        expires_at = datetime.utcnow() + timedelta(minutes=lock_ttl)
        existing_lock = PipelineLock.query.filter_by(pipeline_name=lock_name).first()
        if existing_lock:
            if existing_lock.expires_at and existing_lock.expires_at > datetime.utcnow():
                print(f"[KNOWLEDGE] Lock active for ws {workspace_id}, skipping (expires {existing_lock.expires_at})")
                return
            db.session.delete(existing_lock)
            db.session.flush()

        new_lock = PipelineLock(
            workspace_id=workspace_id,
            pipeline_name=lock_name,
            started_at=datetime.utcnow(),
            expires_at=expires_at,
            host=_socket.gethostname(),
        )
        db.session.add(new_lock)
        db.session.flush()

        batch_size = int(os.environ.get("KNOWLEDGE_BATCH_SIZE", "15"))
        lock_ttl_minutes = int(os.environ.get("PIPELINE_LOCK_TTL_MINUTES", "15"))
        stale_cutoff = datetime.utcnow() - timedelta(minutes=lock_ttl_minutes)

        # Grab pending events, plus processing events older than lock TTL (stuck from a crash)
        pending = RawEvent.query.filter(
            (RawEvent.pipeline_name.is_(None) | (RawEvent.pipeline_name == 'knowledge')),
        ).filter(
            db.or_(
                RawEvent.processing_status == 'pending',
                db.and_(
                    RawEvent.processing_status == 'processing',
                    RawEvent.processed_at == None,
                    RawEvent.created_at < stale_cutoff,
                ),
            )
        ).order_by(RawEvent.created_at.asc()).limit(batch_size).all()

        if not pending:
            print(f"[KNOWLEDGE] No pending events for ws {workspace_id}")
            return

        # Mark them processing
        now = datetime.utcnow()
        for ev in pending:
            ev.processing_status = 'processing'
            ev.pipeline_name = 'knowledge'
        db.session.flush()

        existing_titles = {k.title for k in KnowledgeItem.query.filter_by(workspace_id=workspace_id).with_entities(KnowledgeItem.title).all()}
        thirty_days_ago = now - timedelta(days=30)
        recent_items = KnowledgeItem.query.filter(
            KnowledgeItem.workspace_id == workspace_id,
            KnowledgeItem.created_at >= thirty_days_ago
        ).all()

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        daily_calls = LLMUsageLog.query.filter(LLMUsageLog.created_at >= today_start).count()
        max_daily = int(os.environ.get("LLM_DAILY_LIMIT", "200"))
        remaining = max_daily - daily_calls

        creator_id = _get_workspace_creator(workspace_id)

        # Per-source counters
        per_source = defaultdict(lambda: {"seen": 0, "noise": 0, "sent_to_qwen": 0, "approved": 0, "inserted": 0})

        created = 0
        skipped_noise = 0
        skipped_qwen = 0
        skipped_dedup = 0
        llm_errors = 0

        for event in pending:
            src = (event.source or "").lower()
            per_source[src]["seen"] += 1

            payload = event.raw_payload
            if isinstance(payload, str):
                try:
                    payload = _json.loads(payload)
                except (_json.JSONDecodeError, TypeError):
                    event.processing_status = 'skipped'
                    event.last_error = 'invalid JSON payload'
                    continue
            if not isinstance(payload, dict):
                event.processing_status = 'skipped'
                event.last_error = 'non-dict payload'
                continue

            if _is_knowledge_noise(event, payload):
                skipped_noise += 1
                per_source[src]["noise"] += 1
                event.processing_status = 'skipped'
                event.last_error = 'noise gate'
                continue

            title = payload.get("title", "") or ""
            details = payload.get("details", "") or ""
            raw_text = f"Title: {title}\nContent: {details}" if details else title
            qwen_input = prepare_for_qwen(raw_text, src)
            if not qwen_input or len(qwen_input) < 40:
                skipped_noise += 1
                per_source[src]["noise"] += 1
                event.processing_status = 'skipped'
                event.last_error = 'too short after prepare'
                continue

            per_source[src]["sent_to_qwen"] += 1
            qwen_result = None
            if remaining > 0:
                try:
                    qwen_result = classify_knowledge_from_event(qwen_input, src)
                    remaining -= 1
                except Exception as exc:
                    llm_errors += 1
                    event.retry_count = (event.retry_count or 0) + 1
                    event.last_error = str(exc)[:500]
                    # On full quota exhaustion, always re-queue as pending (never failed)
                    from pattern_engine.llm_client import LLMQuotaExhausted
                    if isinstance(exc, LLMQuotaExhausted):
                        event.processing_status = 'pending'
                        print(f"[LLM EXHAUSTED] Event {event.id} re-queued as pending to retry next cycle")
                    elif event.retry_count >= 3:
                        event.processing_status = 'failed'
                    else:
                        event.processing_status = 'pending'  # re-queue for retry
                    continue

            if not qwen_result or not qwen_result.get("is_knowledge"):
                skipped_qwen += 1
                event.processing_status = 'done'
                event.last_error = 'qwen: not knowledge'
                continue

            ktype = qwen_result.get("knowledge_type", "none")
            if ktype == "none":
                skipped_qwen += 1
                event.processing_status = 'done'
                event.last_error = 'qwen: type=none'
                continue

            confidence = qwen_result.get("confidence", 0)
            if confidence < 0.5:
                skipped_qwen += 1
                event.processing_status = 'done'
                event.last_error = 'qwen: low confidence'
                continue

            summary = qwen_result.get("summary", "")
            if not summary or len(summary) < 40:
                skipped_qwen += 1
                event.processing_status = 'done'
                event.last_error = 'qwen: short summary'
                continue

            per_source[src]["approved"] += 1
            ktitle = (qwen_result.get("title") or title)[:255]
            kcontent = f"{summary or ''} {' '.join(qwen_result.get('key_points', []) or [])}"

            if ktitle in existing_titles:
                skipped_dedup += 1
                event.processing_status = 'done'
                event.last_error = 'duplicate title'
                continue

            is_dup = False
            # Check against DB items (from prior runs)
            for existing_item in recent_items:
                ratio = SequenceMatcher(None, existing_item.title.lower(), ktitle.lower()).ratio()
                if ratio > 0.82:
                    is_dup = True
                    break
                # Content-level dedup: same knowledge with different title
                existing_content = f"{existing_item.summary or ''} {' '.join(existing_item.key_points or [])}"
                if kcontent and existing_content:
                    cr = SequenceMatcher(None, kcontent.lower(), existing_content.lower()).ratio()
                    if cr > 0.70:
                        is_dup = True
                        break
            # Also check against titles created earlier in this same batch
            if not is_dup:
                for existing_title in existing_titles:
                    ratio = SequenceMatcher(None, existing_title.lower(), ktitle.lower()).ratio()
                    if ratio > 0.82:
                        is_dup = True
                        break
            if is_dup:
                skipped_dedup += 1
                event.processing_status = 'done'
                event.last_error = 'similarity dup'
                continue

            existing_titles.add(ktitle)

            item = KnowledgeItem(
                title=ktitle, knowledge_type=ktype, summary=summary,
                key_points=qwen_result.get("key_points", []),
                applicable_to=qwen_result.get("applicable_to", ""),
                confidence=confidence, source=src, source_integration=src,
                source_event_id=str(event.id),
                integration_event_id=f"{src}_{event.id}",
                raw_content=qwen_input[:2000], workspace_id=workspace_id,
                created_by=creator_id, status="auto_inferred",
            )
            db.session.add(item)
            db.session.flush()

            _result = {
                "record_type": "knowledge",
                "fields": {"title": ktitle, "description": summary[:200]},
                "confidence": confidence,
                "source_signal": "explicit",
            }
            _create_chronicle(item, _result, event, workspace_id)
            created += 1
            per_source[src]["inserted"] += 1
            event.processing_status = 'done'
            event.last_error = None

        db.session.commit()

        # Release pipeline lock
        PipelineLock.query.filter_by(pipeline_name=lock_name).delete()
        db.session.commit()

        # Per-source diagnostics
        print(f"[KNOWLEDGE] ws={workspace_id} batch={len(pending)} created={created} noise={skipped_noise} qwen_rejected={skipped_qwen} dedup={skipped_dedup} llm_errors={llm_errors}")
        for src_name, counts in sorted(per_source.items()):
            print(f"  [{src_name}] seen={counts['seen']} noise={counts['noise']} → qwen={counts['sent_to_qwen']} → approved={counts['approved']} → inserted={counts['inserted']}")

    except Exception as e:
        # Release pipeline lock BEFORE rollback (own session to avoid rollback side-effects)
        try:
            _pl = PipelineLock.query.filter_by(pipeline_name=lock_name).first()
            if _pl:
                db.session.delete(_pl)
                db.session.commit()
        except Exception:
            pass
        db.session.rollback()
        print(f"Knowledge inference error for ws {workspace_id}: {e}")
        import traceback
        traceback.print_exc()


def _process_ai(raw_events, workspace_id, stats, provider):
    ANALYTICS_SOURCES = {"posthog", "amplitude", "mixpanel"}
    processed_ids = set()
    for i in range(0, len(raw_events), 20):
        batch = raw_events[i:i + 20]
        # Strip analytics events before AI processing — never produce tasks/decisions
        batch = [e for e in batch if (e.source or "").lower() not in ANALYTICS_SOURCES]
        if not batch:
            continue
        stats["processed"] += len(batch)
        _batch_titles = set()
        try:
            results = extract_batch(batch)
            for event, result in zip(batch, results):
                # Noise gate: skip personal/job-spam Gmail before chronicle creation
                payload = event.raw_payload
                if isinstance(payload, str):
                    try:
                        import json as _j
                        payload = _j.loads(payload)
                    except Exception:
                        payload = {}
                if (event.source or "").lower() == "gmail" and _is_knowledge_noise(event, payload):
                    stats["skipped"] += 1
                    print(f"[SKIP] Gmail noise: '{str(payload.get('title', ''))[:60]}'")
                    continue
                _create_chronicle(None, result, event, workspace_id)
                if result.get("record_type") == "none":
                    stats["skipped"] += 1
                    continue

                model_class = RECORD_MODELS.get(result["record_type"])
                if not model_class:
                    stats["skipped"] += 1
                    continue

                # Source gate: meeting_note only from valid meeting sources (slack is conditional)
                if result["record_type"] == "meeting_note":
                    src = (event.source or "").lower()
                    payload = event.raw_payload
                    if isinstance(payload, str):
                        try:
                            import json as _j
                            payload = _j.loads(payload)
                        except Exception:
                            payload = {}
                    if not _is_valid_meeting_source(src, payload):
                        stats["skipped"] += 1
                        continue

                title = str(result.get("fields", {}).get("title") or "")
                decision_text = str(result.get("fields", {}).get("decision_text") or "")
                person_name = str(result.get("fields", {}).get("person_name") or "")
                _title_lower = (title or decision_text or person_name).strip().lower()
                if _title_lower in ONBOARDING_AI_TITLES or _title_lower.startswith("welcome to "):
                    stats["skipped"] += 1
                    continue

                existing = _find_existing(model_class, workspace_id, event.source_id)
                if existing:
                    _update_record(existing, model_class, result, event, workspace_id, stats)
                    processed_ids.add(event.id)
                else:
                    if is_duplicate_exact(db.session, model_class, workspace_id, event.source_id):
                        stats["skipped"] += 1
                        continue
                    if is_previously_dismissed(db.session, model_class, workspace_id, event.source_id):
                        stats["skipped"] += 1
                        continue
                    if is_duplicate_similar(db.session, model_class, workspace_id, title or decision_text or person_name)[0]:
                        stats["skipped"] += 1
                        continue
                    _canonical = (title or decision_text or person_name).strip().lower()
                    if _canonical in _batch_titles:
                        stats["skipped"] += 1
                        continue
                    _batch_titles.add(_canonical)
                    record = _build_record(model_class, result["fields"], workspace_id)
                    if not record:
                        stats["errors"] += 1
                        continue
                    apply_tags(
                        record, event,
                        result.get("confidence", 0.5),
                        result.get("source_signal", "inferred"),
                    )
                    db.session.add(record)
                    db.session.flush()
                    stats["created"] += 1
                    processed_ids.add(event.id)
                    _create_chronicle(record, result, event, workspace_id)
            db.session.commit()

        except Exception as e:
            print(f"AI batch processing error: {e}")
            stats["errors"] += len(batch)
    return processed_ids


def _find_existing(model_class, workspace_id, source_event_id):
    if not source_event_id or not hasattr(model_class, "source_event_id"):
        return None
    return model_class.query.filter_by(
        workspace_id=workspace_id,
        source_event_id=str(source_event_id)
    ).first()


def _update_record(existing, model_class, result, event, workspace_id, stats):
    new_confidence = result.get("confidence", 0)
    try:
        existing_confidence = getattr(existing, "confidence_score", 0) or 0
    except Exception:
        existing_confidence = 0
    if new_confidence <= existing_confidence:
        stats["skipped"] += 1
        return

    fields = result["fields"]
    if model_class == Task:
        existing.title = fields.get("title", existing.title)[:255]
        existing.description = fields.get("description", existing.description)
        existing.priority = fields.get("priority", existing.priority)
        existing.status = fields.get("status", existing.status)
        existing.deadline = fields.get("deadline", existing.deadline)
        existing.estimated_hours = fields.get("estimated_hours", existing.estimated_hours)
    elif model_class == DecisionLog:
        existing.decision = fields.get("decision_text") or fields.get("decision") or fields.get("title") or existing.decision
        existing.context = fields.get("context", existing.context)
        existing.alternatives = fields.get("alternatives", existing.alternatives)
        existing.attendees = fields.get("attendees", existing.attendees)
        existing.consequences = fields.get("consequences", existing.consequences)
        existing.startup_stage = fields.get("startup_stage", existing.startup_stage)
        existing.linked_meeting_id = fields.get("linked_meeting_id", existing.linked_meeting_id)
        existing.status = fields.get("status", existing.status)
    elif model_class == Goal:
        existing.title = fields.get("title", existing.title)[:255]
        existing.description = fields.get("description", existing.description)
    elif model_class == Blocker:
        existing.title = fields.get("title", existing.title)[:255]
        existing.description = fields.get("description", existing.description)
        existing.severity = fields.get("severity", existing.severity)
    elif model_class == MeetingNotes:
        existing.title = fields.get("title", existing.title)[:255]
        existing.summary = fields.get("summary", existing.summary)
        existing.attendees = fields.get("attendees", existing.attendees)
        existing.meeting_type = fields.get("meeting_type", existing.meeting_type)
        existing.agenda = fields.get("agenda", existing.agenda)
        existing.tags = fields.get("tags", existing.tags)
        existing.duration = fields.get("duration", existing.duration)
        meeting_date = fields.get("date")
        if meeting_date:
            if isinstance(meeting_date, str):
                try:
                    meeting_date = datetime.fromisoformat(meeting_date.replace("Z", "+00:00").split("+")[0])
                except (ValueError, TypeError):
                    meeting_date = None
            if meeting_date:
                existing.date = meeting_date
    elif model_class == FollowUp:
        existing.person_name = fields.get("person_name", existing.person_name)
    elif model_class == KnowledgeItem:
        existing.title = fields.get("title", existing.title)[:255]
        existing.summary = fields.get("summary") or fields.get("content") or existing.summary
        existing.knowledge_type = fields.get("knowledge_type") or fields.get("category") or existing.knowledge_type
        existing.key_points = fields.get("key_points") or fields.get("tags") or existing.key_points

    try:
        existing.confidence_score = round(new_confidence, 2)
    except Exception:
        pass
    try:
        existing.source_signal = result.get("source_signal", getattr(existing, "source_signal", None))
    except Exception:
        pass
    if hasattr(existing, "updated_at"):
        existing.updated_at = datetime.utcnow()
    stats["updated"] += 1


def _clean_field(value, maxlen=None):
    if not value:
        return ""
    import re as _re
    cleaned = _re.sub(r'<[^>]+>', '', str(value))
    cleaned = _re.sub(
        r'^(inferred from|extracted from|based on)\s+.+?:\s*',
        '',
        cleaned,
        flags=_re.IGNORECASE
    ).strip()
    if maxlen:
        cleaned = cleaned[:maxlen]
    return cleaned


def _build_record(model_class, fields, workspace_id):
    creator_id = _get_workspace_creator(workspace_id)
    try:
        if model_class == Task:
            return Task(
                title=_clean_field(fields.get("title", "Untitled"), 255),
                description=_clean_field(fields.get("description")),
                priority=fields.get("priority", "P2"),
                status=fields.get("status", "Not Started"),
                deadline=_parse_date(fields.get("deadline")),
                estimated_hours=fields.get("estimated_hours"),
                goal_id=fields.get("linked_goal_id"),
                linked_decision_id=fields.get("linked_decision_id"),
                workspace_id=workspace_id,
                user_id=creator_id,
            )
        elif model_class == DecisionLog:
            return DecisionLog(
                decision=_clean_field(fields.get("decision_text") or fields.get("decision") or fields.get("title"), 255) or "Untitled Decision",
                context=_clean_field(fields.get("context"), 500),
                alternatives=fields.get("alternatives"),
                attendees=fields.get("attendees"),
                consequences=fields.get("consequences"),
                startup_stage=fields.get("startup_stage"),
                linked_meeting_id=fields.get("linked_meeting_id"),
                status=fields.get("status", "Proposed"),
                created_by=creator_id,
                workspace_id=workspace_id,
            )
        elif model_class == Goal:
            return Goal(
                title=fields.get("title", "Untitled Goal")[:255],
                description=fields.get("description"),
                goal_type=fields.get("goal_type", "monthly"),
                status="pending",
                user_id=creator_id,
                workspace_id=workspace_id,
            )
        elif model_class == Blocker:
            return Blocker(
                title=fields.get("title", "Untitled Blocker")[:255],
                description=fields.get("description"),
                severity=fields.get("severity", "medium"),
                status="open",
                workspace_id=workspace_id,
            )
        elif model_class == MeetingNotes:
            meeting_date = fields.get("date") or fields.get("occurred_at")
            if isinstance(meeting_date, str):
                try:
                    meeting_date = datetime.fromisoformat(meeting_date.replace("Z", "+00:00").split("+")[0])
                except (ValueError, TypeError):
                    meeting_date = None
            return MeetingNotes(
                title=fields.get("title", "Meeting")[:255],
                summary=fields.get("summary"),
                attendees=fields.get("attendees"),
                meeting_type=fields.get("meeting_type"),
                agenda=fields.get("agenda"),
                tags=fields.get("tags"),
                duration=fields.get("duration"),
                date=meeting_date or fields.get("date") or datetime.utcnow(),
                created_by=creator_id,
                workspace_id=workspace_id,
                status="Draft",
            )
        elif model_class == FollowUp:
            return FollowUp(
                person_name=fields.get("person_name", "Unknown")[:100],
                followup_date=_parse_date(fields.get("suggested_date")),
                status="pending",
                user_id=creator_id,
                workspace_id=workspace_id,
            )
        elif model_class == KnowledgeItem:
            return KnowledgeItem(
                title=fields.get("title", "Untitled Knowledge")[:255],
                summary=fields.get("summary") or fields.get("content") or fields.get("description"),
                knowledge_type=fields.get("knowledge_type") or fields.get("category", "insight"),
                key_points=fields.get("key_points") or fields.get("tags"),
                workspace_id=workspace_id,
                created_by=creator_id,
                status="Draft",
            )
    except Exception as e:
        print(f"Error building record: {e}")
        return None


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return None


def _get_workspace_stage(workspace_id):
    ws = Workspace.query.get(workspace_id)
    return ws.stage if ws else "Think"


def _auto_align_goals(workspace_id):
    from pattern_engine.extraction import check_goal_alignment, suggest_goal_from_signal
    from difflib import SequenceMatcher
    creator_id = _get_workspace_creator(workspace_id)
    if not creator_id:
        return

    existing_goals = Goal.query.filter_by(workspace_id=workspace_id).filter(Goal.status != 'duplicate').all()
    existing_titles = [g.title for g in existing_goals]
    existing_titles_lower = [t.lower() for t in existing_titles]

    def _is_valid_goal_title(title):
        if not title or not title.strip():
            return False
        t = title.strip().lower()
        if t in ("untitled goal", "untitled", "new goal", "goal", "", "my goal", "new"):
            return False
        if len(t) < 5:
            return False
        return True

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.goal_type == "daily",
        Goal.created_at >= today_start,
    ).first()
    if not today_goals:
        recent_decisions = DecisionLog.query.filter(
            DecisionLog.workspace_id == workspace_id,
            DecisionLog.created_at >= (datetime.utcnow() - timedelta(hours=24)),
        ).limit(5).all()
        recent_tasks = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.created_at >= (datetime.utcnow() - timedelta(hours=24)),
        ).limit(5).all()

        signals = []
        for d in recent_decisions:
            if d.decision and len(d.decision) > 10:
                signals.append(("decision", d.decision))
        for t in recent_tasks:
            if t.title and len(t.title) > 10:
                signals.append(("task", t.title))

        for item_type, item_title in signals[:3]:
            try:
                if existing_titles:
                    result = check_goal_alignment(item_type, item_title, existing_titles)
                    if result and result.get("aligned_goal") and result.get("alignment_confidence", 0) > 0.8:
                        matched = result["aligned_goal"]
                        if not _is_valid_goal_title(matched):
                            continue
                        existing_titles.append(matched)
                        existing_titles_lower.append(matched.lower())
                        goal = Goal(
                            title=matched[:255],
                            description=f"Auto-aligned from {item_type}: {item_title[:200]}",
                            goal_type="daily",
                            status="pending",
                            user_id=creator_id,
                            workspace_id=workspace_id,
                            date=datetime.utcnow().date(),
                        )
                        db.session.add(goal)
                        print(f"[GOAL] Auto-created daily goal '{matched[:50]}' from {item_type}")
                else:
                    result = suggest_goal_from_signal(item_type, item_title)
                    if result and result.get("suggested_goal") and result.get("confidence", 0) > 0.7:
                        suggested = result["suggested_goal"]
                        if not _is_valid_goal_title(suggested):
                            continue
                        gtype = result.get("goal_type", "daily")
                        existing_titles.append(suggested)
                        existing_titles_lower.append(suggested.lower())
                        goal = Goal(
                            title=suggested[:255],
                            description=f"Suggested from {item_type}: {item_title[:200]}",
                            goal_type=gtype,
                            status="pending",
                            user_id=creator_id,
                            workspace_id=workspace_id,
                            date=datetime.utcnow().date(),
                        )
                        db.session.add(goal)
                        print(f"[GOAL] Created new goal '{suggested[:50]}' ({gtype}) from {item_type}")
            except Exception as e:
                from pattern_engine.llm_client import LLMQuotaExhausted
                if isinstance(e, LLMQuotaExhausted):
                    raise
                print(f"[GOAL] Error processing signal '{item_title[:40]}': {e}")

    # Dedup across all goal types by title similarity
    all_goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status != 'duplicate',
    ).all()
    for g in all_goals:
        for other in all_goals:
            if g.id >= other.id:
                continue
            ratio = SequenceMatcher(None, g.title.lower(), other.title.lower()).ratio()
            if ratio > 0.8:
                print(f"[GOAL] Dedup: '{g.title[:40]}' ~ '{other.title[:40]}' (ratio={ratio:.2f}) — marking older as duplicate")
                older = g if g.id < other.id else other
                older.status = "duplicate"


def _compute_active_phase(workspace_id):
    from datetime import datetime, timedelta
    total_goals = Goal.query.filter_by(workspace_id=workspace_id).count()
    done_goals = Goal.query.filter_by(workspace_id=workspace_id, status="completed").count()
    goal_completion = (done_goals / total_goals * 100) if total_goals > 0 else 0

    total_tasks = Task.query.filter_by(workspace_id=workspace_id).count()
    done_tasks = Task.query.filter_by(workspace_id=workspace_id, status="Done").count()
    task_completion = (done_tasks / total_tasks * 100) if total_tasks > 0 else 0

    recent_window = datetime.utcnow() - timedelta(days=7)
    recent_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.updated_at >= recent_window,
    ).count()
    recent_done = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "Done",
        Task.updated_at >= recent_window,
    ).count()
    velocity = (recent_done / recent_tasks * 100) if recent_tasks > 0 else 0

    integrations = UserIntegration.query.filter_by(user_id=_get_workspace_creator(workspace_id)).count()
    integration_bonus = min(integrations * 5, 25)

    # Calendar overload penalty: if no deep work blocks found today, apply -10 penalty
    calendar_penalty = 0
    try:
        from models.activity_event import ActivityEvent
        from models.workspace import Workspace as WsModel
        ws_obj = WsModel.query.get(workspace_id)
        if ws_obj:
            rules = ws_obj.calendar_rules or {}
            start_hour = int(rules.get("start_hour", 9))
            end_hour = int(rules.get("end_hour", 18))
            work_minutes = (end_hour - start_hour) * 60
            busy_window = datetime.utcnow() - timedelta(hours=24)
            today_events = ActivityEvent.query.filter(
                ActivityEvent.workspace_id == workspace_id,
                ActivityEvent.provider == "google_calendar",
                ActivityEvent.external_timestamp >= busy_window,
            ).count()
            if today_events > work_minutes // 30:  # More events than available half-hour slots
                calendar_penalty = 10
    except Exception:
        pass

    score = goal_completion * 0.3 + task_completion * 0.3 + velocity * 0.25 + integration_bonus - calendar_penalty
    score = max(score, 0)  # floor at 0

    if score < 15:
        phase = "Think"
    elif score < 40:
        phase = "Build"
    elif score < 70:
        phase = "Launch"
    else:
        phase = "Scale"

    ws = Workspace.query.get(workspace_id)
    scores = {
        "goal_completion": round(goal_completion, 1),
        "task_completion": round(task_completion, 1),
        "velocity": round(velocity, 1),
        "integration_bonus": integration_bonus,
        "calendar_penalty": calendar_penalty,
        "total_score": round(score, 1),
    }
    # Compute 3-tier health status (on_track / needs_attention / stale_workspace)
    if total_goals == 0 and total_tasks == 0:
        health = "stale_workspace"
    elif goal_completion < 10 and task_completion < 10 and velocity < 10:
        health = "stale_workspace"
    elif goal_completion < 30 or task_completion < 30 or velocity < 20:
        health = "needs_attention"
    else:
        health = "on_track"

    if ws:
        if ws.active_phase != phase:
            ws.active_phase = phase
        if ws.active_health != health:
            ws.active_health = health
        ws.active_phase_scores = scores
        print(f"[PHASE] Workspace {workspace_id}: {phase} (health={health}, score={score:.0f}, goals={goal_completion:.0f}%, tasks={task_completion:.0f}%, velocity={velocity:.0f}%, cal_penalty={calendar_penalty})")


TASK_TOOL_SOURCES = {"linear", "trello", "asana", "monday"}
TASK_TOOL_MODULES = {}

def _load_task_tool_module(source):
    if source not in TASK_TOOL_MODULES:
        try:
            mod = __import__(f"pattern_engine.sync.{source}", fromlist=["sync"])
            TASK_TOOL_MODULES[source] = mod
        except ImportError:
            TASK_TOOL_MODULES[source] = None
    return TASK_TOOL_MODULES[source]

def _map_tool_status(raw_status, source):
    """Map tool-specific statuses to FounDesk task statuses."""
    if not raw_status:
        return "Not Started"
    s = raw_status.strip().lower()
    if s in ("done", "completed", "closed", "100%"):
        return "Done"
    if s in ("canceled", "cancelled", "archived"):
        return "Cancelled"
    if s in ("in progress", "started", "active", "working on it", "review"):
        return "In Progress"
    if s in ("blocked", "waiting", "stuck"):
        return "Blocked"
    if s in ("backlog", "to do", "planning", "not started"):
        return "Not Started"
    return "Not Started"

def _map_tool_priority(priority_str):
    """Map tool-specific priority to P0-P3."""
    if not priority_str:
        return None
    s = str(priority_str).strip().lower()
    if s in ("p0", "critical", "urgent"):
        return "P0"
    if s in ("p1", "high"):
        return "P1"
    if s in ("p2", "medium"):
        return "P2"
    if s in ("p3", "low", "none"):
        return "P3"
    return None

def _parse_source_category(details, src):
    """Extract native grouping from task-tool details text."""
    if not details:
        return src.capitalize() if src else "Manual"
    if src == "linear":
        m = __import__('re').search(r'Team:\s*(.+?)(?:\||$)', details)
        return m.group(1).strip() if m else "Linear"
    if src == "asana":
        m = __import__('re').search(r'Project:\s*(.+?)(?:\||$)', details)
        return m.group(1).strip() if m else "Asana"
    if src == "monday":
        m = __import__('re').search(r'Board:\s*(.+?)(?:,|$)', details)
        board = m.group(1).strip() if m else None
        g = __import__('re').search(r'Group:\s*(.+?)(?:\||$)', details)
        group = g.group(1).strip() if g else None
        if board and group:
            return f"{board} / {group}"
        return board or group or "Monday.com"
    if src == "trello":
        m = __import__('re').search(r'Board:\s*(.+?)(?:\||$)', details)
        return m.group(1).strip() if m else "Trello"
    return src.capitalize()

def _process_task_tool_events(workspace_id, raw_events):
    creator_id = _get_workspace_creator(workspace_id)
    count = 0
    for event in raw_events:
        src = (event.source or "").lower()
        if src not in TASK_TOOL_SOURCES:
            continue
        if event.processing_status == 'done':
            continue
        payload = event.raw_payload
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except (json.JSONDecodeError, TypeError):
                continue
        if not isinstance(payload, dict):
            continue
        title = (payload.get("title") or "").strip()
        if not title:
            continue
        details = payload.get("details") or ""
        raw_status = payload.get("status") or ""
        mapped_status = _map_tool_status(raw_status, src)
        priority = _map_tool_priority(payload.get("priority"))
        raw_progress = payload.get("progress_percentage")
        try: progress = int(raw_progress) if raw_progress is not None else None
        except (ValueError, TypeError): progress = None
        risk = payload.get("risk_level")
        existing = Task.query.filter_by(
            workspace_id=workspace_id,
            source=src,
            source_ref=event.source_ref,
        ).first()
        source_category = _parse_source_category(details, src)
        if existing:
            existing.title = title[:255]
            existing.description = details
            existing.status = mapped_status
            existing.source_category = source_category
            if priority:
                existing.priority = priority
            if progress is not None:
                existing.progress_percentage = progress
            if risk:
                existing.risk_level = risk
            count += 1
            continue
        task = Task(
            title=title[:255],
            description=details,
            status=mapped_status,
            priority=priority or "P2",
            progress_percentage=progress,
            risk_level=risk,
            source_category=source_category,
            workspace_id=workspace_id,
            user_id=creator_id or 1,
            source=src,
            source_ref=event.source_ref,
            source_event_id=event.id,
        )
        db.session.add(task)
        event.processing_status = 'done'
        event.processed_at = datetime.utcnow()
        count += 1
    if count:
        db.session.flush()
        print(f"[TASK-TOOL] Created/updated {count} tasks from task-tool sources (ws={workspace_id})")

def _llm_follow_up_detection(workspace_id, raw_events):
    """Job 8: Classify follow-ups from Gmail, Slack, and other conversational sources."""
    from pattern_engine.extraction import extract_follow_up_from_event
    from pattern_engine.models import LLMUsageLog
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_calls = LLMUsageLog.query.filter(LLMUsageLog.created_at >= today_start).count()
    max_daily = int(os.environ.get("LLM_DAILY_LIMIT", "200"))
    remaining = max_daily - daily_calls
    if remaining <= 0:
        return

    creator_id = _get_workspace_creator(workspace_id)
    follow_up_sources = {"gmail", "slack", "hubspot", "pipedrive"}
    created = 0
    for event in raw_events[:min(5, remaining)]:
        src = (event.source or "").lower()
        if src not in follow_up_sources:
            continue
        payload = event.raw_payload
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except (json.JSONDecodeError, TypeError):
                continue
        if not isinstance(payload, dict):
            continue
        title = payload.get("title", "") or ""
        details = payload.get("details", "") or ""
        event_text = f"Title: {title}\nDetails: {details}" if details else title
        if len(event_text.strip()) < 30:
            continue
        try:
            result = extract_follow_up_from_event(event_text, src)
            if result and result.get("is_follow_up"):
                person = result.get("person_name", "") or "Unknown"
                # Skip placeholder names — low confidence extractions
                if person.lower() in ("unknown", "meeting participant", "participant", "someone", "attendee", "guest", "person", "member", "user", "client", "team member", ""):
                    print(f"[FOLLOW-UP] Skipped placeholder person_name='{person}' from {src}")
                    continue
                context = result.get("context", "")[:200]
                action = result.get("action_needed", "")[:200]
                suggested_date = result.get("suggested_followup_date", "")
                full_context = f"{context} - {action}" if action else context
                fu = FollowUp(
                    person_name=person[:100],
                    context=full_context[:200] if full_context else None,
                    followup_date=_parse_date(suggested_date) if suggested_date else (datetime.utcnow() + timedelta(days=3)),
                    status="pending",
                    user_id=creator_id,
                    workspace_id=workspace_id,
                    source=src,
                    source_event_id=str(event.id),
                )
                db.session.add(fu)
                created += 1
                print(f"[FOLLOW-UP] Created from {src}: '{person}' — {context[:40]}")
        except Exception:
            pass
    if created:
        db.session.commit()
        print(f"[FOLLOW-UP] Created {created} follow-ups from Job 8 (ws={workspace_id})")


def _crm_follow_up_detection(workspace_id):
    """Rule-based: detect stalled HubSpot/Pipedrive deals and create follow-ups."""
    from models.activity_event import ActivityEvent
    from models.goal import Goal
    creator_id = _get_workspace_creator(workspace_id)
    if not creator_id:
        return

    stalled_cutoff = datetime.utcnow() - timedelta(days=7)
    crm_sources = {"hubspot", "pipedrive"}
    for src in crm_sources:
        # Find deals with no recent activity
        recent = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider == src,
            ActivityEvent.external_timestamp >= stalled_cutoff,
        ).with_entities(ActivityEvent.raw_ref).distinct().all()
        active_deals = set(r[0] for r in recent if r[0])

        all_deals = ActivityEvent.query.filter(
            ActivityEvent.workspace_id == workspace_id,
            ActivityEvent.provider == src,
        ).with_entities(ActivityEvent.raw_ref, ActivityEvent.external_timestamp).distinct().all()
        deal_activity = {}
        for ref, ts in all_deals:
            if ref:
                if ref not in deal_activity or ts > deal_activity[ref]:
                    deal_activity[ref] = ts

        for deal_ref, last_active in deal_activity.items():
            if last_active and last_active < stalled_cutoff and deal_ref not in active_deals:
                existing = FollowUp.query.filter_by(
                    workspace_id=workspace_id,
                    source=src,
                    source_event_id=deal_ref,
                    status="pending",
                ).first()
                if not existing:
                    fu = FollowUp(
                        person_name=f"{src}: {deal_ref[:50]}",
                        context=f"Deal stalled — no stage movement since {last_active.strftime('%b %d')}",
                        followup_date=datetime.utcnow() + timedelta(days=1),
                        status="pending",
                        user_id=creator_id,
                        workspace_id=workspace_id,
                        source=src,
                        source_event_id=deal_ref,
                        priority="high",
                    )
                    db.session.add(fu)
                    print(f"[FOLLOW-UP] CRM stalled deal: {deal_ref[:40]} ({src})")
    db.session.commit()


def _auto_resolve_follow_ups(workspace_id):
    """Auto-resolve follow-ups when the concern is addressed by a later event."""
    pending = FollowUp.query.filter_by(workspace_id=workspace_id, status="pending").all()
    resolved = 0
    for fu in pending:
        # 1. Check if a meeting note mentions this person
        if fu.linked_meeting_id:
            from models.meeting_notes import MeetingNotes
            meeting = MeetingNotes.query.get(fu.linked_meeting_id)
            if meeting and meeting.attendees and fu.person_name.lower() in meeting.attendees.lower():
                fu.status = "resolved"
                resolved += 1
                print(f"[FOLLOW-UP] Auto-resolved: '{fu.person_name}' — meeting covered topic")
                continue

        # 2. Check if a later meeting mentions this person
        if fu.person_name and fu.person_name != "Unknown" and fu.person_name != "Meeting participant":
            from models.meeting_notes import MeetingNotes
            later_meetings = MeetingNotes.query.filter(
                MeetingNotes.workspace_id == workspace_id,
                MeetingNotes.date > fu.created_at,
            ).all()
            for m in later_meetings:
                if m.attendees and fu.person_name.lower() in m.attendees.lower():
                    fu.status = "resolved"
                    resolved += 1
                    print(f"[FOLLOW-UP] Auto-resolved: '{fu.person_name}' — met again ({m.title[:30]})")
                    break

        # 3. Check if a linked task was completed
        if fu.linked_task_id:
            from models.task import Task
            task = Task.query.get(fu.linked_task_id)
            if task and task.status == "Done":
                fu.status = "resolved"
                resolved += 1
                print(f"[FOLLOW-UP] Auto-resolved: '{fu.person_name}' — linked task done")
                continue

        # 4. Check CRM: if deal had activity after follow-up creation
        if fu.source in ("hubspot", "pipedrive") and fu.source_event_id:
            from models.activity_event import ActivityEvent
            later = ActivityEvent.query.filter(
                ActivityEvent.workspace_id == workspace_id,
                ActivityEvent.provider == fu.source,
                ActivityEvent.raw_ref == fu.source_event_id,
                ActivityEvent.external_timestamp > fu.created_at,
            ).first()
            if later:
                fu.status = "resolved"
                resolved += 1
                print(f"[FOLLOW-UP] Auto-resolved: CRM deal '{fu.person_name}' — activity resumed")
                continue

    if resolved:
        db.session.commit()
        print(f"[FOLLOW-UP] Auto-resolved {resolved} follow-ups (ws={workspace_id})")


def _update_follow_up_priority(workspace_id):
    """Update follow-up priority based on staleness."""
    from datetime import datetime
    now = datetime.utcnow()
    pending = FollowUp.query.filter_by(workspace_id=workspace_id, status="pending").all()
    for fu in pending:
        age_days = (now - fu.created_at).days
        if age_days >= 14:
            fu.priority = "critical"
        elif age_days >= 7:
            fu.priority = "high"
        elif age_days >= 3:
            fu.priority = "normal"
        else:
            fu.priority = fu.priority or "normal"
    db.session.commit()


def _update_meeting_follow_up_dedup(workspace_id, raw_events):
    """Dedup follow-ups: prevent creating multiple follow-ups for same meeting."""
    from models.follow_up import FollowUp
    existing_meeting_ids = set()
    for fu in FollowUp.query.filter_by(workspace_id=workspace_id, status="pending").all():
        if fu.linked_meeting_id:
            existing_meeting_ids.add(fu.linked_meeting_id)
    return existing_meeting_ids


def _process_blocker_events(workspace_id, raw_events):
    from pattern_engine.extraction import extract_blocker_from_event
    from pattern_engine.models import LLMUsageLog
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily_calls = LLMUsageLog.query.filter(LLMUsageLog.created_at >= today_start).count()
    max_daily = int(os.environ.get("LLM_DAILY_LIMIT", "200"))
    remaining = max_daily - daily_calls
    if remaining <= 0:
        return

    creator_id = _get_workspace_creator(workspace_id)
    source_texts = ["slack", "gmail", "notion", "google_docs"]
    for event in raw_events[:min(30, remaining)]:
        if event.source not in source_texts:
            continue
        payload = event.raw_payload
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except (json.JSONDecodeError, TypeError):
                continue
        if not isinstance(payload, dict):
            continue
        title = payload.get("title", "") or ""
        details = payload.get("details", "") or ""
        event_text = f"Title: {title}\nDetails: {details}" if details else title
        try:
            result = extract_blocker_from_event(event_text, event.source)
            if result and result.get("is_blocker"):
                title_text = result.get("title", "Untitled Blocker")[:255]
                existing = Blocker.query.filter_by(
                    workspace_id=workspace_id,
                    title=title_text,
                    status="open",
                ).first()
                if not existing:
                    blocker = Blocker(
                        title=title_text,
                        description=result.get("description", "")[:500],
                        severity=result.get("severity", "medium"),
                        status="open",
                        source_integration=event.source,
                        confidence_score=0.7,
                        workspace_id=workspace_id,
                    )
                    db.session.add(blocker)
                    print(f"[BLOCKER] Detected from {event.source}: '{title_text[:50]}'")
        except Exception:
            pass

    stalled_cutoff = datetime.utcnow() - timedelta(days=7)
    stalled_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "In Progress",
        Task.updated_at <= stalled_cutoff,
    ).all()
    for t in stalled_tasks:
        # Skip tasks that already have an explicit blocker description (user-set block)
        if t.blocker_description:
            continue
        # Skip tasks that already have a linked blocker record from a non-system source
        existing_real = Blocker.query.filter(
            Blocker.workspace_id == workspace_id,
            Blocker.task_id == t.id,
            Blocker.status == "open",
            Blocker.source_integration != "system",
        ).first()
        if existing_real:
            continue
        existing_system = Blocker.query.filter_by(
            workspace_id=workspace_id,
            task_id=t.id,
            source_integration="system",
            status="open",
        ).first()
        if not existing_system:
            blocker = Blocker(
                title=f"Task stalled: {t.title[:200]}",
                description=f"Task '{t.title}' has been in progress since {t.updated_at.strftime('%b %d')} with no status change",
                severity="medium",
                status="open",
                source_integration="system",
                confidence_score=0.9,
                task_id=t.id,
                workspace_id=workspace_id,
            )
            db.session.add(blocker)
            print(f"[BLOCKER] Stalled task: '{t.title[:40]}' (stalled {t.updated_at.strftime('%b %d')})")


def _process_crm_blockers(workspace_id):
    """Detect deal blockers from HubSpot/Pipedrive notes fields."""
    from models.activity_event import ActivityEvent
    deal_events = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider.in_(["hubspot", "pipedrive"]),
        ActivityEvent.activity_type == "deal",
        ActivityEvent.details.contains("Notes:"),
    ).all()
    created = 0
    for ev in deal_events:
        notes = ""
        if "| Notes:" in (ev.details or ""):
            notes = ev.details.split("| Notes:")[-1].strip()
        if not notes or len(notes) < 10:
            continue
        title_text = f"Deal blocker: {ev.title.replace('HubSpot Deal: ', '').replace('Pipedrive Deal: ', '')[:200]}"
        existing = Blocker.query.filter_by(
            workspace_id=workspace_id,
            title=title_text,
            status="open",
        ).first()
        if not existing:
            blocker = Blocker(
                title=title_text,
                description=notes[:500],
                severity="high",
                status="open",
                source_integration=ev.provider,
                source_signal="structured",
                confidence_score=1.0,
                workspace_id=workspace_id,
            )
            db.session.add(blocker)
            created += 1
            print(f"[CRM-BLOCKER] Deal blocker: '{title_text[:50]}'")
    if created:
        db.session.commit()
        print(f"[CRM-BLOCKER] Created {created} deal blockers (ws={workspace_id})")


def _auto_resolve_blockers(workspace_id):
    """Auto-resolve blockers when the blocking condition clears."""
    now = datetime.utcnow()
    open_blockers = Blocker.query.filter_by(workspace_id=workspace_id, status="open").all()
    resolved = 0
    for b in open_blockers:
        if b.task_id:
            task = Task.query.get(b.task_id)
            if task:
                if task.status in ("Done", "Completed", "Cancelled"):
                    b.status = "resolved"
                    b.resolved_at = now
                    resolved += 1
                    print(f"[BLOCKER] Auto-resolved: '{b.title[:40]}' — linked task done/cancelled")
                    continue
                # Conditions 2 & 3 only apply to stalled-task blockers (source_integration="system")
                # CRM, standup, and AI-detected blockers have different semantics — task
                # activity doesn't mean the blocker is resolved.
                if b.source_integration == "system":
                    if task.status == "In Progress" and task.updated_at > (now - timedelta(hours=24)):
                        b.status = "resolved"
                        b.resolved_at = now
                        resolved += 1
                        print(f"[BLOCKER] Auto-resolved: '{b.title[:40]}' — task resumed activity")
                        continue
                    if task.status != "Blocked" and task.blocked_at is None and task.status != "In Progress":
                        b.status = "resolved"
                        b.resolved_at = now
                        resolved += 1
                        print(f"[BLOCKER] Auto-resolved: '{b.title[:40]}' — task no longer blocked/in-progress")
                        continue

    if resolved:
        db.session.commit()
        print(f"[BLOCKER] Auto-resolved {resolved} blockers (ws={workspace_id})")


def _update_blocker_priority(workspace_id):
    """Update blocker severity based on age (7+ days -> high)."""
    now = datetime.utcnow()
    open_blockers = Blocker.query.filter_by(workspace_id=workspace_id, status="open").all()
    for b in open_blockers:
        age_days = (now - b.created_at).days
        if age_days >= 7 and b.severity != "high":
            b.severity = "high"
            print(f"[BLOCKER] Escalated '{b.title[:40]}' to high (age={age_days}d)")
    db.session.commit()


def _detect_overdue_tasks(workspace_id):
    """Flag tasks past deadline or stale for >7 days as 'at_risk'."""
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    cutoff = now - timedelta(days=7)
    flagged = 0

    # Tasks past deadline
    overdue = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.deadline.isnot(None),
        Task.deadline < now,
        Task.status.in_(["Not Started", "In Progress", "Blocked"]),
    ).all()
    for t in overdue:
        if not t.phase_tag or "overdue" not in (t.phase_tag or ""):
            t.phase_tag = "overdue"
            flagged += 1

    # Stale unstarted tasks (no update for 7+ days)
    stale = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status.in_(["Not Started", "In Progress"]),
        Task.updated_at < cutoff,
    ).all()
    for t in stale:
        if not t.phase_tag or "stale" not in (t.phase_tag or ""):
            t.phase_tag = "stale" if "overdue" not in (t.phase_tag or "") else f"{t.phase_tag},stale"
            flagged += 1

    if flagged:
        db.session.commit()
        print(f"[TASK] Flagged {flagged} overdue/stale tasks (ws={workspace_id})")


def _handle_task_deletes(workspace_id):
    """Mark tasks as 'Cancelled' when upstream ActivityEvent indicates delete/archive.
    ActivityEvent has no 'action' column, so we match via title/activity_type flags."""
    from models.activity_event import ActivityEvent
    deleted_refs = set()
    deleted_keywords = ("deleted", "archived", "removed", "delete", "archive", "remove")
    deleted_events = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider.in_(["linear", "trello", "asana", "monday"]),
    ).all()
    for ae in deleted_events:
        text = f"{ae.title or ''} {ae.details or ''} {ae.activity_type or ''}".lower()
        if any(kw in text for kw in deleted_keywords):
            if ae.raw_ref:
                deleted_refs.add(ae.raw_ref)

    if deleted_refs:
        affected = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.source_ref.in_(deleted_refs),
            Task.status.in_(["Not Started", "In Progress", "Blocked"]),
        ).update({"status": "Cancelled", "updated_at": datetime.utcnow()}, synchronize_session='fetch')
        if affected:
            db.session.commit()
            print(f"[TASK] Cancelled {affected} tasks deleted/archived upstream")


def _compile_daily_briefing(workspace_id, user_id):
    """Deterministic compiler: gathers all relevant records for a user's daily briefing.
    Every record is selected by code, not by the LLM.
    Returns a structured dict with source IDs for full traceability."""
    from models.standup import Standup
    from models.activity_event import ActivityEvent
    from datetime import datetime, timedelta

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    yesterday_end = today_start

    compiled = {
        "yesterday": {},
        "today": {},
        "risks": {},
        "business": {},
        "source_refs": {
            "task_ids": [],
            "blocker_ids": [],
            "meeting_ids": [],
            "decision_ids": [],
            "goal_ids": [],
            "activity_ids": [],
        },
        "summary": "",
    }

    # ── TASKS ──────────────────────────────────────────────────────
    # Completed yesterday
    completed_yesterday = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "Done",
        Task.updated_at >= yesterday_start,
        Task.updated_at < yesterday_end,
    ).order_by(Task.updated_at.desc()).all()

    # In progress
    in_progress = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "In Progress",
    ).order_by(Task.priority.asc(), Task.deadline.asc().nullslast()).limit(10).all()

    # Overdue
    overdue_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.deadline < now,
        Task.deadline.isnot(None),
        Task.status.notin_(["Done", "Cancelled"]),
    ).order_by(Task.deadline.asc()).all()

    # Blocked
    blocked_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.status == "Blocked",
    ).all()

    # Due today
    due_today = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.deadline >= today_start,
        Task.deadline < today_start + timedelta(days=1),
        Task.status.notin_(["Done", "Cancelled"]),
    ).all()

    compiled["yesterday"]["completed_tasks"] = [
        {"id": t.id, "title": t.title, "source": t.source}
        for t in completed_yesterday
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in completed_yesterday)

    compiled["today"]["priority_tasks"] = [
        {"id": t.id, "title": t.title, "priority": t.priority, "status": t.status, "deadline": t.deadline.isoformat() if t.deadline else None}
        for t in in_progress
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in in_progress)

    compiled["today"]["due_today"] = [
        {"id": t.id, "title": t.title, "priority": t.priority}
        for t in due_today
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in due_today)

    compiled["risks"]["overdue_tasks"] = [
        {"id": t.id, "title": t.title, "deadline": t.deadline.isoformat() if t.deadline else None, "days_overdue": (now - t.deadline).days if t.deadline else 0}
        for t in overdue_tasks
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in overdue_tasks)

    compiled["risks"]["blocked_tasks"] = [
        {"id": t.id, "title": t.title, "blocker_description": t.blocker_description}
        for t in blocked_tasks
    ]
    compiled["source_refs"]["task_ids"].extend(t.id for t in blocked_tasks)

    # ── BLOCKERS ───────────────────────────────────────────────────
    open_blockers = Blocker.query.filter_by(
        workspace_id=workspace_id,
        status="open",
    ).order_by(
        db.case((Blocker.severity == "high", 0), (Blocker.severity == "medium", 1), else_=2),
        Blocker.created_at.asc(),
    ).all()

    compiled["risks"]["blockers"] = []
    for b in open_blockers:
        entry = {
            "id": b.id,
            "title": b.title,
            "severity": b.severity,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "age_days": (now - b.created_at).days if b.created_at else 0,
            "source_integration": b.source_integration,
        }
        if b.task_id:
            task = Task.query.get(b.task_id)
            if task:
                entry["linked_task"] = {"id": task.id, "title": task.title}
        compiled["risks"]["blockers"].append(entry)
        compiled["source_refs"]["blocker_ids"].append(b.id)

    # ── MEETINGS ───────────────────────────────────────────────────
    meetings_yesterday = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == workspace_id,
        MeetingNotes.date >= yesterday_start,
        MeetingNotes.date < yesterday_end,
    ).order_by(MeetingNotes.date.desc()).all()

    meetings_today = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == workspace_id,
        MeetingNotes.date >= today_start,
        MeetingNotes.date < today_start + timedelta(days=1),
    ).order_by(MeetingNotes.date.asc()).all()

    compiled["yesterday"]["meetings"] = [
        {"id": m.id, "title": m.title, "attendees": m.attendees, "action_items": m.action_items}
        for m in meetings_yesterday
    ]
    compiled["source_refs"]["meeting_ids"].extend(m.id for m in meetings_yesterday)

    compiled["today"]["upcoming_meetings"] = [
        {"id": m.id, "title": m.title, "attendees": m.attendees, "action_items": m.action_items}
        for m in meetings_today
    ]
    compiled["source_refs"]["meeting_ids"].extend(m.id for m in meetings_today)

    # ── DECISIONS ──────────────────────────────────────────────────
    decisions_yesterday = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        DecisionLog.created_at >= yesterday_start,
        DecisionLog.created_at < yesterday_end,
    ).order_by(DecisionLog.confidence_score.desc().nullslast(), DecisionLog.created_at.desc()).all()

    unresolved_decisions = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        DecisionLog.ai_status == "pending_confirmation",
    ).order_by(DecisionLog.confidence_score.desc().nullslast(), DecisionLog.created_at.desc()).limit(5).all()

    compiled["yesterday"]["decisions"] = [
        {"id": d.id, "title": d.decision, "confidence": d.confidence_score, "status": d.ai_status}
        for d in decisions_yesterday
    ]
    compiled["source_refs"]["decision_ids"].extend(d.id for d in decisions_yesterday)

    compiled["risks"]["unresolved_decisions"] = [
        {"id": d.id, "title": d.decision, "confidence": d.confidence_score}
        for d in unresolved_decisions if d.id not in compiled["source_refs"]["decision_ids"]
    ]
    compiled["source_refs"]["decision_ids"].extend(d.id for d in unresolved_decisions)

    # ── GOALS ──────────────────────────────────────────────────────
    all_goals = Goal.query.filter_by(workspace_id=workspace_id).filter(Goal.status != "duplicate").all()

    goals_progressed = []
    goals_at_risk = []
    goals_completed = []
    for g in all_goals:
        if g.status == "completed" and g.updated_at and g.updated_at >= yesterday_start:
            goals_completed.append(g)
        if g.status == "at_risk":
            goals_at_risk.append(g)
        if g.status in ("in_progress", "pending"):
            linked_tasks = Task.query.filter_by(goal_id=g.id, workspace_id=workspace_id).all()
            total = len(linked_tasks)
            done = sum(1 for t in linked_tasks if t.status == "Done")
            progress = round((done / total) * 100) if total > 0 else 0
            goals_progressed.append(g)

    compiled["yesterday"]["goals_completed"] = [
        {"id": g.id, "title": g.title}
        for g in goals_completed
    ]
    compiled["source_refs"]["goal_ids"].extend(g.id for g in goals_completed)

    compiled["today"]["goal_progress"] = [
        {"id": g.id, "title": g.title, "status": g.status}
        for g in goals_progressed
    ]
    compiled["source_refs"]["goal_ids"].extend(g.id for g in goals_progressed)

    compiled["risks"]["goals_at_risk"] = [
        {"id": g.id, "title": g.title}
        for g in goals_at_risk
    ]
    compiled["source_refs"]["goal_ids"].extend(g.id for g in goals_at_risk)

    # ── CRM ────────────────────────────────────────────────────────
    crm_providers = ("hubspot", "pipedrive", "zoho_crm")
    recent_crm = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider.in_(crm_providers),
        ActivityEvent.external_timestamp >= yesterday_start,
        ActivityEvent.external_timestamp < yesterday_end,
    ).order_by(ActivityEvent.external_timestamp.desc()).limit(10).all()

    compiled["business"]["crm_updates"] = [
        {"id": ae.id, "title": ae.title, "provider": ae.provider, "details": ae.details}
        for ae in recent_crm
    ]
    compiled["source_refs"]["activity_ids"].extend(ae.id for ae in recent_crm)

    # ── Important recent emails (non-newsletter, non-automated) ────
    important_emails = ActivityEvent.query.filter(
        ActivityEvent.workspace_id == workspace_id,
        ActivityEvent.provider == "gmail",
        ActivityEvent.external_timestamp >= yesterday_start,
        ActivityEvent.external_timestamp < yesterday_end,
    ).order_by(ActivityEvent.external_timestamp.desc()).limit(5).all()

    compiled["business"]["important_emails"] = [
        {"id": ae.id, "title": ae.title, "actor": ae.actor}
        for ae in important_emails
    ]
    compiled["source_refs"]["activity_ids"].extend(ae.id for ae in important_emails)

    return compiled


def _generate_standup_from_compiled(workspace_id, user_id):
    """Generate a daily briefing from compiled data, with optional LLM rewrite."""
    from models.standup import Standup
    import json

    today = datetime.utcnow().strftime("%Y-%m-%d")

    existing = Standup.query.filter_by(
        user_id=user_id,
        workspace_id=workspace_id,
        date=today,
    ).first()
    if existing:
        return

    compiled = _compile_daily_briefing(workspace_id, user_id)

    # Build the three text fields from compiled data
    yesterday_lines = []
    if compiled["yesterday"].get("completed_tasks"):
        yesterday_lines.append("Completed:")
        for t in compiled["yesterday"]["completed_tasks"]:
            yesterday_lines.append(f"  - {t['title']}")
    if compiled["yesterday"].get("meetings"):
        yesterday_lines.append("Meetings:")
        for m in compiled["yesterday"]["meetings"]:
            yesterday_lines.append(f"  - {m['title']}")
    if compiled["yesterday"].get("decisions"):
        yesterday_lines.append("Decisions:")
        for d in compiled["yesterday"]["decisions"]:
            yesterday_lines.append(f"  - {d['title']}")
    q1 = "\n".join(yesterday_lines) if yesterday_lines else "No recorded activity yesterday."

    today_lines = []
    if compiled["today"].get("priority_tasks"):
        today_lines.append("Priority work:")
        for t in compiled["today"]["priority_tasks"][:5]:
            today_lines.append(f"  - {t['title']} ({t['priority']})")
    if compiled["today"].get("due_today"):
        today_lines.append("Due today:")
        for t in compiled["today"]["due_today"]:
            today_lines.append(f"  - {t['title']}")
    if compiled["today"].get("upcoming_meetings"):
        today_lines.append("Meetings:")
        for m in compiled["today"]["upcoming_meetings"]:
            today_lines.append(f"  - {m['title']}")
    q2 = "\n".join(today_lines) if today_lines else "No planned work."

    risk_lines = []
    if compiled["risks"].get("blockers"):
        risk_lines.append("Blockers:")
        for b in compiled["risks"]["blockers"]:
            if "untitled" in b["title"].lower():
                print(f"[STANDUP] Skipping untitled blocker: '{b['title']}'")
                continue
            age = f" ({b['age_days']}d old)" if b["age_days"] > 0 else ""
            risk_lines.append(f"  - [{b['severity'].upper()}] {b['title']}{age}")
    if compiled["risks"].get("overdue_tasks"):
        risk_lines.append("Overdue:")
        for t in compiled["risks"]["overdue_tasks"][:5]:
            risk_lines.append(f"  - {t['title']} ({t['days_overdue']}d overdue)")
    if compiled["risks"].get("goals_at_risk"):
        risk_lines.append("Goals at risk:")
        for g in compiled["risks"]["goals_at_risk"]:
            risk_lines.append(f"  - {g['title']}")
    q3 = "\n".join(risk_lines) if risk_lines else "No blockers or risks."

    # Attempt LLM rewrite of the compiled data
    llm_summary = ""
    try:
        from pattern_engine.extraction import rewrite_standup_narrative
        llm_summary = rewrite_standup_narrative(compiled)
    except Exception as e:
        print(f"[STANDUP] LLM rewrite failed (non-fatal): {e}")

    compiled["summary"] = llm_summary

    standup = Standup(
        user_id=user_id,
        workspace_id=workspace_id,
        date=today,
        q1_yesterday=q1,
        q2_today=q2,
        q3_blockers=q3,
        compiled_json=json.dumps(compiled),
    )
    db.session.add(standup)
    db.session.commit()
    print(f"[STANDUP] Generated daily briefing for user {user_id} (ws={workspace_id})")
    total_records = sum(len(v) for v in compiled["source_refs"].values())
    print(f"[STANDUP]   Sources: {total_records} records from {len([k for k, v in compiled['source_refs'].items() if v])} categories")


def _auto_standup_for_all_members(workspace_id):
    """Generate standup briefings for all active members who haven't submitted today."""
    from models.standup import Standup
    from models.workspace_member import WorkspaceMember
    today = datetime.utcnow().strftime("%Y-%m-%d")
    created = 0

    members = WorkspaceMember.query.filter_by(workspace_id=workspace_id, status="active").all()
    for m in members:
        if m.user_id is None:
            continue
        existing = Standup.query.filter_by(
            user_id=m.user_id,
            workspace_id=workspace_id,
            date=today,
        ).first()
        if existing:
            continue
        _generate_standup_from_compiled(workspace_id, m.user_id)
        created += 1

    if created:
        db.session.commit()
        print(f"[STANDUP] Auto-generated {created} briefings for ws={workspace_id}")


def _cross_link_standup_blockers(workspace_id):
    """Link standup q3_blockers text to actual Blocker records.
    If a standup mentions a blocker by title, link it. If no matching blocker
    exists and the text is clearly a blocker, create one."""
    from models.standup import Standup
    from difflib import SequenceMatcher
    today = datetime.utcnow().strftime("%Y-%m-%d")
    standups = Standup.query.filter_by(workspace_id=workspace_id, date=today).all()
    open_blockers = Blocker.query.filter_by(workspace_id=workspace_id, status="open").all()
    linked = 0

    for s in standups:
        if not s.q3_blockers or s.q3_blockers.strip() in ("No blockers.", ""):
            continue
        blocker_text = s.q3_blockers.lower()
        matched = False
        for b in open_blockers:
            if b.title.lower() in blocker_text or SequenceMatcher(None, b.title.lower(), blocker_text[:len(b.title)]).ratio() > 0.6:
                matched = True
                break
        if not matched:
            for line in s.q3_blockers.split("\n"):
                line = line.strip().lstrip("- ").strip()
                if "untitled" in line.lower():
                    print(f"[STANDUP] Skipping untitled line: '{line[:40]}'")
                    continue
                if line and len(line) > 10 and line.lower() not in ("no blockers.", "no blockers", ""):
                    existing = Blocker.query.filter_by(workspace_id=workspace_id, title=line[:255], status="open").first()
                    if not existing:
                        blocker = Blocker(
                            workspace_id=workspace_id,
                            title=line[:255],
                            description=f"From standup #{s.id} (user {s.user_id})",
                            severity="medium",
                            status="open",
                            source_integration="standup",
                        )
                        db.session.add(blocker)
                        linked += 1
                        print(f"[STANDUP] Created blocker from standup: '{line[:40]}'")

    if linked:
        db.session.commit()
        print(f"[STANDUP] Created {linked} blockers from standup text (ws={workspace_id})")


def _create_chronicle(record, result, event, workspace_id):
    try:
        rtype = result.get("record_type", "none")
        fields = result.get("fields", {})
        title = fields.get("title") or fields.get("decision_text") or fields.get("person_name") or "Processed event"
        desc = fields.get("description") or fields.get("context") or fields.get("summary") or ""
        payload = event.raw_payload
        if isinstance(payload, str):
            import json
            payload = json.loads(payload)
        event_type = rtype if rtype != "none" else "activity"
        chronicle_title = title if rtype != "none" else f"Ingested: {payload.get('title', '') or event.source}"
        stage = _get_workspace_stage(workspace_id)
        user_id = getattr(record, "created_by", None) or getattr(record, "user_id", None) if record else None
        chronicle = ChronicleEvent(
            workspace_id=workspace_id,
            event_type=event_type,
            title=str(chronicle_title)[:200],
            description=str(desc)[:200] if desc else None,
            stage=stage,
            user_id=user_id,
            source_type=rtype if rtype not in ("none", "activity") else None,
            source_id=record.id if record else None,
            meta_data={"provider": event.source, "raw_title": payload.get("title", ""), "record_type": rtype, "record_id": record.id if record else None},
        )
        db.session.add(chronicle)
    except Exception as e:
        print(f"Chronicle creation error: {e}")


def _auto_standup(workspace_id):
    """Generate a rich daily briefing using the deterministic compiler + LLM rewrite."""
    from models.workspace_member import WorkspaceMember
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id).order_by(WorkspaceMember.id.asc()).first()
    user_id = member.user_id if member else 1
    _generate_standup_from_compiled(workspace_id, user_id=user_id)


def _auto_progress(workspace_id):
    from datetime import datetime, timedelta
    goals = Goal.query.filter_by(workspace_id=workspace_id, status="pending").all()
    for goal in goals:
        total = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id).count()
        done = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id, status="Done").count()
        if total > 0:
            progress = round((done / total) * 100)
            if progress == 100:
                goal.status = "completed"
            continue


def _auto_link_decisions_to_goals(workspace_id):
    """Link decisions to goals using temporal+topical heuristics.
    Threshold raised from 0.25 to 0.45 to avoid false positive links.
    0.25 is too low — e.g. 'Offer Volume Discount?' scoring 0.33 against
    'Finalize Discount Tiers' has some topical overlap but not enough to
    confidently say that decision represents progress toward that goal.
    A secondary temporal check is applied: decision must be within 7 days
    of goal creation (before or after) to be linked, preventing stale matches.
    """
    from models.goal import Goal, goal_decisions
    from models.decision_log import DecisionLog
    from pattern_engine.dedup import _tokenize, _cosine_similarity

    active_goals = Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status.in_(["pending", "in_progress"]),
    ).all()
    if not active_goals:
        return

    linked_ids = set()
    for g in active_goals:
        for d in g.linked_decisions:
            linked_ids.add(d.id)
    all_decisions = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        ~DecisionLog.id.in_(linked_ids) if linked_ids else True,
    ).limit(20).all()

    for dec in all_decisions:
        if not dec.decision:
            continue
        dec_tokens = _tokenize(dec.decision)
        if not dec_tokens:
            continue

        best_goal = None
        best_score = 0.0
        for goal in active_goals:
            goal_tokens = _tokenize(goal.title)
            if not goal_tokens:
                continue
            score = _cosine_similarity(dec_tokens, goal_tokens)
            if score > best_score:
                best_score = score
                best_goal = goal

        # Raised threshold: 0.45 + temporal proximity within 7 days
        if best_score >= 0.45 and best_goal:
            time_diff = abs((dec.created_at - best_goal.created_at).days)
            if time_diff <= 7:
                best_goal.linked_decisions.append(dec)
                print(f"[GOAL] Linked decision '{dec.decision[:40]}...' to goal '{best_goal.title[:40]}' (score={best_score:.2f}, temporal_diff={time_diff}d)")
            else:
                print(f"[GOAL] Skipped link: '{dec.decision[:40]}...' score={best_score:.2f} but temporal_diff={time_diff}d > 7d")


def _auto_progress_v2(workspace_id):
    """Enhanced progress: considers linked tasks, decisions, and time-based goals."""
    from datetime import datetime, timedelta
    from models.goal import Goal
    from models.task import Task
    from models.decision_log import DecisionLog
    now = datetime.utcnow()

    for goal in Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status.in_(["pending", "in_progress"]),
    ).all():
        # 1. Linked tasks
        linked_tasks = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id).all()
        total_tasks = len(linked_tasks)
        done_tasks = sum(1 for t in linked_tasks if t.status == "Done")

        # 2. Linked decisions (via goal_decisions join)
        linked_decisions = goal.linked_decisions
        total_decisions = len(linked_decisions)
        confirmed_decisions = sum(1 for d in linked_decisions if d.status in ("Confirmed", "Implemented"))

        # 3. Compute progress
        numerator = done_tasks + confirmed_decisions
        denominator = total_tasks + total_decisions

        if denominator > 0:
            progress = round((numerator / denominator) * 100)
        elif goal.date:
            # Time-based: elapsed vs total duration
            created = goal.created_at.date()
            deadline = goal.date
            total_days = (deadline - created).days if deadline > created else 1
            elapsed = (now.date() - created).days
            progress = min(round((elapsed / total_days) * 100), 99)
        else:
            continue

        # 4. Auto-transition
        if progress >= 100:
            goal.status = "completed"
            print(f"[GOAL] Auto-completed '{goal.title[:40]}' ({goal.goal_type}) — all linked work done")
            # Cascade: if parent exists and all sub-goals done -> complete parent
            if goal.parent_id:
                parent = Goal.query.get(goal.parent_id)
                if parent and parent.status != "completed":
                    siblings = Goal.query.filter_by(parent_id=goal.parent_id).all()
                    if all(s.status == "completed" for s in siblings):
                        parent.status = "completed"
                        print(f"[GOAL] Cascade: parent '{parent.title[:40]}' also completed")
        elif progress > 0 and goal.status == "pending":
            goal.status = "in_progress"
        elif progress == 0 and goal.status == "in_progress":
            goal.status = "pending"


def _stale_goal_detection(workspace_id, stale_days=5):
    """Flag goals with no linked activity for stale_days as at_risk."""
    from datetime import datetime, timedelta
    from models.goal import Goal
    from models.task import Task
    from models.decision_log import DecisionLog
    cutoff = datetime.utcnow() - timedelta(days=stale_days)

    for goal in Goal.query.filter(
        Goal.workspace_id == workspace_id,
        Goal.status.in_(["pending", "in_progress"]),
    ).all():
        # Check linked tasks
        latest_task = Task.query.filter_by(goal_id=goal.id, workspace_id=workspace_id).order_by(Task.updated_at.desc()).first()
        latest_decision = None
        if goal.linked_decisions:
            latest_decision = max(goal.linked_decisions, key=lambda d: d.created_at)

        latest_activity = None
        if latest_task and latest_task.updated_at:
            latest_activity = latest_task.updated_at
        if latest_decision and latest_decision.created_at:
            if not latest_activity or latest_decision.created_at > latest_activity:
                latest_activity = latest_decision.created_at

        if latest_activity and latest_activity < cutoff:
            goal.status = "at_risk"
            print(f"[GOAL] Stale: '{goal.title[:40]}' — no activity since {latest_activity.date()}")
        elif not latest_activity and goal.created_at < cutoff:
            goal.status = "at_risk"
            print(f"[GOAL] Stale: '{goal.title[:40]}' — never linked to any work")


def _detect_knowledge_staleness(workspace_id, stale_days=60):
    """Flag KnowledgeItems untouched for stale_days as needing review."""
    from models.knowledge_item import KnowledgeItem
    cutoff = datetime.utcnow() - timedelta(days=stale_days)
    items = KnowledgeItem.query.filter(
        KnowledgeItem.workspace_id == workspace_id,
        KnowledgeItem.status.in_(["auto_inferred", "verified"]),
    ).all()
    flagged = 0
    for item in items:
        latest = item.reviewed_at or item.created_at
        if latest < cutoff:
            item.review_flag = "needs_review"
            flagged += 1
            print(f"[KNOWLEDGE] Stale: '{item.title[:40]}' — unverified since {latest.date()}")
        elif item.review_flag == "needs_review" and latest >= cutoff:
            item.review_flag = None
    if flagged:
        db.session.commit()
        print(f"[KNOWLEDGE] Flagged {flagged} knowledge items as needs_review (ws={workspace_id})")


def _detect_decision_reversal(workspace_id):
    """Qwen-based detection: does a new decision contradict/reverse a prior logged decision?"""
    from models.decision_log import DecisionLog
    unlinked = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        DecisionLog.superseded_by_id.is_(None),
        DecisionLog.status.in_(["Proposed", "Confirmed", "Implemented"]),
        DecisionLog.ai_status != "dismissed",
    ).order_by(DecisionLog.created_at.desc()).limit(10).all()
    if len(unlinked) < 2:
        return
    reversed_count = 0
    for i, later in enumerate(unlinked):
        if later.status == "Reversed":
            continue
        for earlier in unlinked[i+1:]:
            if earlier.status == "Reversed":
                continue
            time_gap = (later.created_at - earlier.created_at).days
            if time_gap > 30 or time_gap < 0:
                continue
            try:
                from pattern_engine.extraction import detect_contradiction
                result = detect_contradiction(earlier.decision, later.decision)
                if result and result.get("is_contradiction") and result.get("confidence", 0) >= 0.6:
                    later.superseded_by_id = earlier.id
                    later.status = "Reversed"
                    earlier.status = "Superseded"
                    reversed_count += 1
                    print(f"[DECISION] Reversal: '{later.decision[:40]}' supersedes '{earlier.decision[:40]}' (confidence={result.get('confidence', 0):.2f})")
                    from models.chronicle_event import ChronicleEvent
                    try:
                        ws = Workspace.query.get(workspace_id)
                        ce = ChronicleEvent(
                            workspace_id=workspace_id,
                            event_type="decision_reversed",
                            title=f"Decision Reversed: {later.decision[:80]}",
                            description=f"'{later.decision[:100]}' reverses/supersedes '{earlier.decision[:100]}'",
                            stage=ws.stage if ws else "Think",
                            source_type="decision",
                            source_id=earlier.id,
                            meta_data={"superseding_id": later.id, "superseded_id": earlier.id},
                        )
                        db.session.add(ce)
                    except Exception:
                        pass
                    break
            except Exception:
                continue
    if reversed_count:
        db.session.commit()
        print(f"[DECISION] Detected {reversed_count} reversal(s) (ws={workspace_id})")


def _create_chronicle_for_blocker_resolve(workspace_id):
    """Create ChronicleEvent entries when blockers are resolved."""
    from models.blocker import Blocker
    from models.chronicle_event import ChronicleEvent
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=1)
    resolved = Blocker.query.filter(
        Blocker.workspace_id == workspace_id,
        Blocker.status == "resolved",
        Blocker.resolved_at >= cutoff,
    ).all()
    ws_obj = Workspace.query.get(workspace_id)
    created = 0
    for b in resolved:
        existing = ChronicleEvent.query.filter_by(
            workspace_id=workspace_id,
            event_type="blocker_resolved",
            source_id=b.id,
        ).first()
        if existing:
            continue
        ce = ChronicleEvent(
            workspace_id=workspace_id,
            event_type="blocker_resolved",
            title=f"Blocker Resolved: {b.title[:80]}",
            description=f"Blocker '{b.title[:100]}' resolved (severity={b.severity})",
            stage=ws_obj.stage if ws_obj else "Think",
            source_type="blocker",
            source_id=b.id,
            meta_data={"severity": b.severity, "task_id": b.task_id},
        )
        db.session.add(ce)
        created += 1
    if created:
        db.session.commit()
        print(f"[CHRONICLE] Created {created} blocker-resolved events (ws={workspace_id})")


def _link_knowledge_to_decisions(workspace_id):
    """Auto-link knowledge items to decisions that reference similar content."""
    from models.knowledge_item import KnowledgeItem
    from models.decision_log import DecisionLog
    from pattern_engine.dedup import _tokenize, _cosine_similarity
    items = KnowledgeItem.query.filter_by(
        workspace_id=workspace_id,
        linked_decision_id=None,
    ).limit(20).all()
    if not items:
        return
    recent_decisions = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        DecisionLog.created_at >= (datetime.utcnow() - timedelta(days=30)),
    ).all()
    linked = 0
    for item in items:
        item_tokens = _tokenize(f"{item.title} {item.summary or ''}")
        if not item_tokens:
            continue
        best_dec = None
        best_score = 0.0
        for d in recent_decisions:
            dec_tokens = _tokenize(d.decision)
            if not dec_tokens:
                continue
            score = _cosine_similarity(item_tokens, dec_tokens)
            if score > best_score:
                best_score = score
                best_dec = d
        if best_score >= 0.45 and best_dec:
            item.linked_decision_id = best_dec.id
            linked += 1
            print(f"[KNOWLEDGE] Linked '{item.title[:40]}' to decision #{best_dec.id} (score={best_score:.2f})")
    if linked:
        db.session.commit()
        print(f"[KNOWLEDGE] Linked {linked} items to decisions (ws={workspace_id})")
