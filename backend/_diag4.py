import os, sys
sys.path.insert(0, os.path.abspath('.'))
from app import app
from config.database import db

with app.app_context():
    conn = db.engine.connect()

    # Show the actual raw_events for google_docs, slack, calendly
    for src in ['google_docs', 'slack', 'calendly', 'google_meet']:
        result = conn.execute(db.text(f'SELECT id, source, raw_payload, occurred_at FROM raw_events WHERE source=\'{src}\' ORDER BY id'))
        cnt = result.rowcount
        print(f'\n=== {src} RAW_EVENTS: {cnt} rows ===')
        # Reset cursor
        result = conn.execute(db.text(f'SELECT id, source, raw_payload, occurred_at FROM raw_events WHERE source=\'{src}\' ORDER BY id'))
        rows = result.fetchall()
        for r in rows:
            rid, source, payload, occ = r
            print(f'\n  ID={rid} source={source} occurred_at={occ}')
            # Print first 500 chars of payload
            if payload:
                payload_str = str(payload)[:500]
                print(f'  payload (first 500): {payload_str}')
            else:
                print(f'  payload: NULL')

    # Show google_meet activity events (maybe it uses a different table)
    from sqlalchemy import inspect
    insp = inspect(db.engine)
    cols = insp.get_columns('activity_events')
    col_names = [c['name'] for c in cols]
    print(f'\n=== ACTIVITY_EVENTS COLUMNS: {", ".join(col_names)} ===')
    
    # Check if activity_events has a 'source' column or similar
    if 'integration' in col_names:
        result = conn.execute(db.text('SELECT integration, COUNT(*) FROM activity_events GROUP BY integration ORDER BY COUNT(*) DESC'))
        print('\n=== ACTIVITY_EVENTS BY INTEGRATION ===')
        for r in result:
            print(f'  {r[0]:25s} {r[1]}')

    conn.close()
