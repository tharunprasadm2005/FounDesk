from config.database import db
from models.workspace import Workspace
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from datetime import datetime, timezone
from sqlalchemy.exc import OperationalError
import threading
import time
from .providers import (
    getGmailData,
    getCalendarData,
    getGithubData,
    getSlackData,
    getNotionData,
    getMondayData,
    getMeetData,
    getDocsData,
    getTrelloData,
    getAsanaData,
    getCalendlyData,
    getLinearData,
    getHubspotData,
    getPipedriveData,
    getZohoData,
)

_compile_locks = {}
_compile_lock = threading.Lock()
_last_compile_time = {}
_COMPILE_COOLDOWN_SECONDS = 300



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
