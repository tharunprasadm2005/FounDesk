from datetime import datetime
from config.database import db
from pattern_engine.models import RawEvent
from models.activity_event import ActivityEvent


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
