def normalize_generic(source, source_id, event_type, occurred_at, raw_payload, is_mock=False):
    from pattern_engine.models import RawEvent
    return RawEvent(
        source=source,
        source_id=source_id,
        event_type=event_type,
        occurred_at=occurred_at,
        raw_payload=raw_payload,
        is_mock=is_mock,
    )
