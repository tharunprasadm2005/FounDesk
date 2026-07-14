import os, sys
sys.path.insert(0, os.path.abspath('.'))
from app import app
from config.database import db

with app.app_context():
    conn = db.engine.connect()

    for prov in ['notion', 'google_meet', 'slack', 'calendly', 'google_docs']:
        result = conn.execute(db.text(f"SELECT id, title, details, actor, external_timestamp FROM activity_events WHERE provider='{prov}' ORDER BY id"))
        rows = result.fetchall()
        print(f"=== {prov} ACTIVITY_EVENTS: {len(rows)} rows ===")
        for r in rows[:5]:
            title = str(r[1])[:150] if r[1] else "NULL"
            details = str(r[2])[:150] if r[2] else "NULL"
            print(f"  ID={r[0]} title={title.encode('ascii', 'replace').decode()}")
            print(f"  details={details.encode('ascii', 'replace').decode()}")
        print()

    conn.close()
