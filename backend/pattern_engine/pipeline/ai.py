import os
import json
from datetime import datetime, timedelta
from config.database import db
from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.blocker import Blocker
from models.meeting_notes import MeetingNotes
from models.follow_up import FollowUp
from models.knowledge_item import KnowledgeItem
from models.workspace import Workspace
from pattern_engine.models import RawEvent, PatternCorrection
from pattern_engine.dedup import is_duplicate_exact, is_duplicate_similar, is_previously_dismissed
from pattern_engine.extraction import extract_batch
from pattern_engine.tagging import apply_tags
from sqlalchemy.exc import OperationalError

from .constants import RECORD_MODELS
from .utils import _get_workspace_creator, _get_workspace_stage, _clean_field, _parse_date, _find_existing, _update_record, _build_record, _create_chronicle


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
                     # Service provider educational/marketing \u2014 no business-specific knowledge
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

PROMO_SKIP_SOURCES = {"hubspot", "pipedrive", "zoho", "linear", "trello", "asana", "monday", "github", "calendly", "stripe", "razorpay", "payu", "posthog", "mixpanel", "amplitude"}

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

            # Source-based routing \u2014 task-only sources skip decision extraction
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
                    print(f"[LLM EXHAUSTED] All LLM tiers exhausted \u2014 stopping decision inference")
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
    text = re.sub(r'(?:\U0001f4f9[\uFE00-\uFE0F\u200D]?)?\s*Google Meet:\s*https?://\S+', '', text)
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
                    print(f"[MEETING] Cross-source dedup: '{meeting_title}' ({src}) overlaps '{proximate.title}' ({proximate.source_integration}) \u2014 skipping")
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
                        print(f"[LLM EXHAUSTED] All LLM tiers exhausted \u2014 skipping further meeting LLM calls")
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
    """Minimal noise gate \u2014 reject only obvious junk without calling Qwen."""
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
            print(f"  [{src_name}] seen={counts['seen']} noise={counts['noise']} \u2192 qwen={counts['sent_to_qwen']} \u2192 approved={counts['approved']} \u2192 inserted={counts['inserted']}")

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
        # Strip analytics events before AI processing \u2014 never produce tasks/decisions
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
