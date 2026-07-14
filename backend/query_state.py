from app import app
with app.app_context():
    from models.decision_log import DecisionLog
    from pattern_engine.models import RawEvent
    from config.database import db
    from sqlalchemy import text

    # Query all decisions
    decisions = DecisionLog.query.order_by(DecisionLog.created_at.desc()).all()
    print(f'=== DECISION LOG ({len(decisions)} total) ===')
    for d in decisions:
        ctx = d.context[:80] if d.context else '(none)'
        dec = d.decision[:80] if d.decision else '(none)'
        print(f'  [{d.id}] status={d.status} type={d.decision_type} source={d.source} src_int={d.source_integration} ai_status={d.ai_status}')
        print(f'        decision: {dec}')
        print(f'        context: {ctx}')
        print(f'        superseded_by_id={d.superseded_by_id} confidence={d.confidence_score}')
        print()

    # Raw events by source
    raw_sources = db.session.execute(text('SELECT source, COUNT(*) as cnt FROM raw_events GROUP BY source ORDER BY cnt DESC')).fetchall()
    total = sum(r[1] for r in raw_sources)
    print(f'=== RAW EVENTS BY SOURCE ({total} total) ===')
    for source, cnt in raw_sources:
        print(f'  {source}: {cnt}')

    print()

    # Check raw events content for seed themes
    events = db.session.execute(text("SELECT id, source, event_type, occurred_at, raw_payload::text FROM raw_events ORDER BY occurred_at DESC LIMIT 25")).fetchall()
    for e in events:
        pay = (e[4] or '')[:150]
        print(f'  [{e[0]}] {e[1]}/{e[2]} @ {e[3]}')
        if pay:
            print(f'        {pay}')
        print()
