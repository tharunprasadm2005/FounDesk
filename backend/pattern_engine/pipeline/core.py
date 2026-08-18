import os
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace', line_buffering=True)
from datetime import datetime, timedelta
from config.database import db
from models.user_integration import UserIntegration
from models.workspace import Workspace
from models.activity_event import ActivityEvent
from pattern_engine.models import RawEvent
from sqlalchemy.exc import OperationalError

from .constants import MAX_DEADLOCK_RETRIES, PROVIDER_MAP
from .fetch import _fetch_raw_events
from .ai import _process_ai, _llm_infer_decisions, _infer_meetings, _infer_knowledge, _enrich_decisions
from .goals import _auto_align_goals, _auto_link_decisions_to_goals, _auto_progress, _auto_progress_v2, _stale_goal_detection, _compute_active_phase
from .tasks import _process_task_tool_events, _llm_infer_tasks, _detect_overdue_tasks, _handle_task_deletes
from .followups import _llm_follow_up_detection, _crm_follow_up_detection, _auto_resolve_follow_ups, _update_follow_up_priority
from .blockers import _process_blocker_events, _process_crm_blockers, _auto_resolve_blockers, _update_blocker_priority
from .standup import _auto_standup, _auto_standup_for_all_members, _cross_link_standup_blockers
from .decisions import _detect_decision_reversal
from .knowledge import _detect_knowledge_staleness, _link_knowledge_to_decisions
from .chronicle import _create_chronicle_for_blocker_resolve


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
        ws_ae_ids = ActivityEvent.query.filter_by(workspace_id=workspace_id).with_entities(ActivityEvent.id).all()
        ws_ae_id_strs = {str(r[0]) for r in ws_ae_ids}
        unprocessed = RawEvent.query.filter(
            RawEvent.source.in_(event_providers),
            RawEvent.processed_at.is_(None),
            ~RawEvent.id.in_([r.id for r in raw_events if r.id]),
        ).all()
        if ws_ae_id_strs:
            unprocessed = [r for r in unprocessed if r.source_id in ws_ae_id_strs]
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
            # Events classified as "none" remain unprocessed -> flow to job-specific stages
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
        print(f"[PIPELINE] {label}: LLM quota exhausted \u2014 will retry on next cycle")
        db.session.rollback()
        return True
    except Exception as e:
        print(f"[PIPELINE] {label}: error (non-fatal) \u2014 {e}")
        db.session.rollback()
        return False


def _unprocessed_events_for_workspace(workspace_id):
    """Unprocessed raw events scoped to a workspace (via their activity_event ids),
    plus reset stale 'processing' events (from crashed runs) back to pending."""
    from pattern_engine.models import RawEvent as _RawEvent
    lock_ttl = int(os.environ.get("PIPELINE_LOCK_TTL_MINUTES", "15"))
    stale_cutoff = datetime.utcnow() - timedelta(minutes=lock_ttl)
    # Reset stuck 'processing' events older than the lock TTL so they get reprocessed
    stale = _RawEvent.query.filter(
        _RawEvent.processing_status == 'processing',
        _RawEvent.processed_at.is_(None),
        _RawEvent.created_at < stale_cutoff,
    ).all()
    if stale:
        for ev in stale:
            ev.processing_status = 'pending'
            ev.pipeline_name = None
            ev.last_error = None
        db.session.flush()

    ws_ae_ids = ActivityEvent.query.filter_by(workspace_id=workspace_id).with_entities(ActivityEvent.id).all()
    ws_ae_id_strs = {str(r[0]) for r in ws_ae_ids}
    if not ws_ae_id_strs:
        return []
    events = _RawEvent.query.filter(_RawEvent.processed_at.is_(None)).order_by(_RawEvent.created_at.asc()).all()
    return [e for e in events if e.source_id in ws_ae_id_strs]


def _drain_noise_events(workspace_id):
    """Finalize events that have completed their pass through the pipeline.
    Terminal statuses (done/skipped/failed) mean every job-specific stage already
    evaluated them, so mark processed_at to stop them from being re-polled each cycle."""
    from pattern_engine.models import RawEvent as _RawEvent
    ws_ae_ids = ActivityEvent.query.filter_by(workspace_id=workspace_id).with_entities(ActivityEvent.id).all()
    ws_ae_id_strs = {str(r[0]) for r in ws_ae_ids}
    lock_ttl = int(os.environ.get("PIPELINE_LOCK_TTL_MINUTES", "15"))
    stale_cutoff = datetime.utcnow() - timedelta(minutes=lock_ttl)
    terminal_statuses = ('done', 'skipped', 'failed')
    analytics_sources = {"mixpanel", "amplitude", "posthog"}
    drained = 0
    events = _RawEvent.query.filter(
        _RawEvent.processed_at.is_(None),
    ).all()
    for ev in events:
        if ev.source_id not in ws_ae_id_strs:
            continue
        # Events from analytics providers are never consumed by AI stages —
        # finalize them once they're old enough so they stop being re-polled.
        if ev.created_at < stale_cutoff and (ev.source or "").lower() in analytics_sources:
            ev.pipeline_name = None
            ev.processed_at = datetime.utcnow()
            drained += 1
            continue
        if ev.created_at < stale_cutoff and ev.processing_status in terminal_statuses:
            ev.pipeline_name = None
            ev.processed_at = datetime.utcnow()
            drained += 1
    if drained:
        print(f"[PIPELINE] Finalized {drained} terminal/noise events for ws {workspace_id}")


def run_for_workspace(user_id, workspace_id):
    integrations = UserIntegration.query.filter_by(user_id=user_id).all()
    total = {"processed": 0, "created": 0, "updated": 0, "skipped": 0, "errors": 0}
    for integration in integrations:
        result = run_for_integration(integration.id)
        if isinstance(result, dict):
            for k in total:
                total[k] += result.get(k, 0)
    all_events = _unprocessed_events_for_workspace(workspace_id)
    _process_task_tool_events(workspace_id, all_events)
    db.session.commit()
    _safe_run(_llm_infer_tasks, "tasks_llm", workspace_id, all_events)
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
    _drain_noise_events(workspace_id)
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
