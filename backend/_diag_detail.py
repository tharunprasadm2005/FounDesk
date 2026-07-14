import os, psycopg2
from dotenv import load_dotenv; load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

print("=== DECISIONS ===")
cur.execute("SELECT id, decision, source, workspace_id FROM decision_logs LIMIT 10")
for r in cur.fetchall():
    print(f"  id={r[0]} decision='{r[1][:40] if r[1] else 'N/A'}' source={r[2]} ws={r[3]}")

print("\n=== DECISIONS by source ===")
cur.execute("SELECT source, COUNT(*) FROM decision_logs GROUP BY source")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== TASKS ===")
cur.execute("SELECT id, title, source, workspace_id FROM tasks LIMIT 10")
for r in cur.fetchall():
    print(f"  id={r[0]} title='{r[1][:40]}' source={r[2]} ws={r[3]}")

print("\n=== RAW EVENTS done ===")
cur.execute("SELECT id, source, source_ref FROM raw_events WHERE processing_status='done'")
for r in cur.fetchall():
    print(f"  id={r[0]} source={r[1]} ref={r[2]}")

print("\n=== RAW EVENTS pending ===")
cur.execute("SELECT id, source, source_ref FROM raw_events WHERE processing_status='pending' LIMIT 10")
for r in cur.fetchall():
    print(f"  id={r[0]} source={r[1]} ref={r[2]}")

cur.close()
conn.close()
