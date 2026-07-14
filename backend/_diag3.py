import os, sys
sys.path.insert(0, os.path.abspath('.'))

with open(os.devnull, 'w') as devnull:
    from app import app
    from config.database import db

with app.app_context():
    conn = db.engine.connect()

    result = conn.execute(db.text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
    tables = [r[0] for r in result]
    print('=== TABLES ===')
    for t in tables:
        cnt = conn.execute(db.text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
        print(f'  {t:35s} {cnt} rows')

    if 'raw_events' in tables:
        print('\n=== RAW_EVENTS BY SOURCE ===')
        result = conn.execute(db.text('SELECT source, COUNT(*) FROM raw_events GROUP BY source ORDER BY COUNT(*) DESC'))
        for r in result:
            print(f'  {r[0]:25s} {r[1]}')

    if 'meeting_notes' in tables:
        print('\n=== MEETING_NOTES BY SOURCE_INTEGRATION ===')
        result = conn.execute(db.text('SELECT source_integration, COUNT(*) FROM meeting_notes GROUP BY source_integration'))
        for r in result:
            print(f'  {r[0] or "NULL":25s} {r[1]}')

    if 'activity_events' in tables:
        print('\n=== ACTIVITY_EVENTS BY SOURCE ===')
        result = conn.execute(db.text('SELECT source, COUNT(*) FROM activity_events GROUP BY source ORDER BY COUNT(*) DESC'))
        for r in result:
            print(f'  {r[0]:25s} {r[1]}')

    # Check notion/google_docs/slack in all relevant tables
    target_sources = ['notion', 'google_docs', 'google_meet', 'calendly', 'slack']
    tables_to_check = [t for t in tables if t in ('raw_events', 'activity_events')]
    for src in target_sources:
        for tbl in tables_to_check:
            cnt = conn.execute(db.text(f'SELECT COUNT(*) FROM "{tbl}" WHERE source=\'{src}\'')).scalar()
            if cnt > 0:
                print(f'\n=== {src.upper()} IN {tbl}: {cnt} rows ===')
                result = conn.execute(db.text(f'SELECT * FROM "{tbl}" WHERE source=\'{src}\' LIMIT 3'))
                col_names = result.keys()
                rows = result.fetchall()
                for i, row in enumerate(rows):
                    print(f'\n  Row {i+1}:')
                    for j, col in enumerate(col_names):
                        val = str(row[j])[:200] if row[j] else 'NULL'
                        print(f'    {col}: {val}')

    conn.close()
