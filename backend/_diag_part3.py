import os, psycopg2
from dotenv import load_dotenv; load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# 1. Duplicate titles in decision_logs
cur.execute("SELECT decision, COUNT(*) FROM decision_logs GROUP BY decision HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC LIMIT 20")
print("=== Decision Log duplicates ===")
for r in cur.fetchall():
    print(f"  '{r[0][:60]}': {r[1]}")

# 2. Duplicate titles in meeting_notes
cur.execute("SELECT title, COUNT(*) FROM meeting_notes GROUP BY title HAVING COUNT(*) > 1 ORDER BY COUNT(*) DESC LIMIT 20")
print("\n=== Meeting Notes duplicates ===")
for r in cur.fetchall():
    print(f"  '{r[0][:60]}': {r[1]}")

# 3. Check for UNIQUE constraint on integration_event_id
cur.execute("""
    SELECT conname, contype, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'decision_logs'::regclass AND contype = 'u'
""")
print("\n=== Decision logs UNIQUE constraints ===")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[2]}")

cur.execute("""
    SELECT conname, contype, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'meeting_notes'::regclass AND contype = 'u'
""")
print("\n=== Meeting notes UNIQUE constraints ===")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[2]}")

# 4. Test UNIQUE constraint enforcement (try inserting a deliberate duplicate)
# First find an existing decision_log
cur.execute("SELECT id, decision, source_event_id FROM decision_logs WHERE source_event_id IS NOT NULL LIMIT 1")
row = cur.fetchone()
if row:
    print(f"\n=== UNIQUE constraint test ===")
    print(f"  Existing: id={row[0]} decision='{row[1][:30]}' source_event_id={row[2]}")
    # Try inserting duplicate — will fail if constraint exists
    try:
        cur.execute("INSERT INTO decision_logs (decision, source_event_id, workspace_id, user_id) VALUES (%s, %s, 1, 1) ON CONFLICT DO NOTHING", (row[1], row[2]))
        conn.commit()
        print(f"  No constraint violation — INSERT succeeded (either ON CONFLICT DO NOTHING worked or no UNIQUE constraint)")
    except Exception as e:
        print(f"  Constraint enforced: {e}")
        conn.rollback()

cur.close()
conn.close()
