from app import app
with app.app_context():
    from config.database import db
    from sqlalchemy import text

    # Check if events are processed
    processed = db.session.execute(text("SELECT COUNT(*) FROM raw_events WHERE processed_at IS NOT NULL")).scalar()
    unprocessed = db.session.execute(text("SELECT COUNT(*) FROM raw_events WHERE processed_at IS NULL")).scalar()
    print(f"Processed: {processed}, Unprocessed: {unprocessed}")

    # Search for specific themes in raw_payload
    terms = ["mongodb", "postgresql", "nexora", "futuregrid", "acme technologies", 
             "480", "teams integration", "sso", "onboarding", "backend engineer",
             "120k", "50k", "5k"]
    for term in terms:
        rows = db.session.execute(
            text(f"SELECT id, source, raw_payload::text FROM raw_events WHERE LOWER(raw_payload::text) LIKE :term LIMIT 3"),
            {"term": f"%{term}%"}
        ).fetchall()
        if rows:
            print(f"\n=== '{term}' found in {len(rows)} events ===")
            for r in rows:
                print(f"  [{r[0]}] {r[1]}: {r[2][:200]}")
        else:
            print(f"'{term}': NOT FOUND")

    # Full raw_payload for specific events
    print("\n=== FULL PAYLOAD for google_docs events ===")
    docs = db.session.execute(text("SELECT id, raw_payload::text FROM raw_events WHERE source='google_docs'")).fetchall()
    for d in docs:
        print(f"[{d[0]}] {d[1][:500]}")
        print()

    # Check gmail content more closely
    print("\n=== FULL PAYLOAD for gmail events ===")
    gmails = db.session.execute(text("SELECT id, raw_payload::text FROM raw_events WHERE source='gmail'")).fetchall()
    for g in gmails:
        print(f"[{g[0]}] {g[1][:500]}")
        print()
