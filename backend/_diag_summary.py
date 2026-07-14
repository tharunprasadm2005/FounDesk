import os, sys
sys.path.insert(0, os.path.abspath('.'))
from app import app
from config.database import db

with app.app_context():
    conn = db.engine.connect()

    print("RAW_EVENTS BY SOURCE:")
    result = conn.execute(db.text("SELECT source, COUNT(*) FROM raw_events GROUP BY source ORDER BY COUNT(*) DESC"))
    for r in result:
        print(f"  {r[0]:25s} {r[1]}")

    print("\nMEETING_NOTES BY SOURCE_INTEGRATION:")
    result = conn.execute(db.text("SELECT source_integration, COUNT(*) FROM meeting_notes GROUP BY source_integration"))
    for r in result:
        print(f"  {r[0] or 'NULL':25s} {r[1]}")

    # Show calendar events that have meeting content
    print("\n=== GOOGLE CALENDAR activity events (titles) ===")
    result = conn.execute(db.text("SELECT id, title, details FROM activity_events WHERE provider='google_calendar'"))
    for r in result:
        title = str(r[1])[:100] if r[1] else "NULL"
        details = str(r[2])[:200] if r[2] else "NULL"
        print(f"  ID={r[0]} title={title}")
        print(f"    details len={len(str(r[2])) if r[2] else 0}")

    conn.close()
