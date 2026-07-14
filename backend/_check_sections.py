import os
os.chdir(os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()
import psycopg2
c = psycopg2.connect(os.environ['DATABASE_URL'])
cur = c.cursor()

print("=== BLOCKERS ===")
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='blockers'")
cols = [r[0] for r in cur.fetchall()]
print(f"Columns: {cols}")
cur.execute("SELECT * FROM blockers WHERE workspace_id=384 LIMIT 20")
rows = cur.fetchall()
if rows:
    colnames = [desc[0] for desc in cur.description]
    for r in rows:
        print(dict(zip(colnames, r)))
else:
    print("No blockers found")
print(f"Total blockers: {len(rows)}")

print("\n=== STANDUPS ===")
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='standups'")
cols = [r[0] for r in cur.fetchall()]
print(f"Columns: {cols}")
cur.execute("SELECT * FROM standups WHERE workspace_id=384 ORDER BY created_at DESC LIMIT 10")
rows = cur.fetchall()
if rows:
    colnames = [desc[0] for desc in cur.description]
    for r in rows:
        print(dict(zip(colnames, r)))
else:
    print("No standups found")

print("\n=== ACTIVITY EVENTS (last 10) ===")
cur.execute("SELECT id, provider, title, status, external_timestamp, category FROM activity_events WHERE workspace_id=384 ORDER BY external_timestamp DESC LIMIT 10")
for r in cur.fetchall():
    print(f"  id={r[0]} prov={r[1]:<20} status={r[4]} title={r[2][:60]}")

print("\n=== TASKS (by status for list view) ===")
cur.execute("SELECT status, COUNT(*) FROM tasks WHERE workspace_id=384 GROUP BY status ORDER BY status")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")
