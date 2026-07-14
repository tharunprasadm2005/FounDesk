import os, psycopg2
from dotenv import load_dotenv; load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

print("=== RAW EVENTS by source ===")
cur.execute("SELECT source, COUNT(*) FROM raw_events GROUP BY source ORDER BY COUNT(*) DESC")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== RAW EVENTS by status ===")
cur.execute("SELECT processing_status, COUNT(*) FROM raw_events GROUP BY processing_status ORDER BY processing_status")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== DECISION LOGS ===")
cur.execute("SELECT COUNT(*) FROM decision_logs")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT source, COUNT(*) FROM decision_logs GROUP BY source ORDER BY COUNT(*) DESC")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== MEETING NOTES ===")
cur.execute("SELECT COUNT(*) FROM meeting_notes")
print(f"  Total: {cur.fetchone()[0]}")

print("\n=== KNOWLEDGE ITEMS ===")
cur.execute("SELECT COUNT(*) FROM knowledge_items")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT source, COUNT(*) FROM knowledge_items GROUP BY source ORDER BY COUNT(*) DESC")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== TASKS ===")
cur.execute("SELECT COUNT(*) FROM tasks")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT source, COUNT(*) FROM tasks WHERE source IS NOT NULL GROUP BY source ORDER BY COUNT(*) DESC")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")
cur.execute("SELECT COUNT(*) FROM tasks WHERE source IS NULL OR source = 'manual'")
print(f"  manual/null source: {cur.fetchone()[0]}")

print("\n=== GOALS ===")
cur.execute("SELECT COUNT(*) FROM goals")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT goal_type, COUNT(*) FROM goals GROUP BY goal_type")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== BLOCKERS ===")
cur.execute("SELECT COUNT(*) FROM blockers")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT source, COUNT(*) FROM blockers GROUP BY source ORDER BY COUNT(*) DESC")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== FOLLOW-UPS ===")
cur.execute("SELECT COUNT(*) FROM follow_ups")
print(f"  Total: {cur.fetchone()[0]}")

print("\n=== STANDUPS ===")
cur.execute("SELECT COUNT(*) FROM standups")
print(f"  Total: {cur.fetchone()[0]}")

print("\n=== CHRONICLE EVENTS ===")
cur.execute("SELECT COUNT(*) FROM chronicle_events")
print(f"  Total: {cur.fetchone()[0]}")

print("\n=== ACTIVE PHASE ===")
cur.execute("SELECT id, name, active_phase FROM workspaces")
for r in cur.fetchall():
    print(f"  ws={r[0]} '{r[1]}': phase={r[2]}")

cur.close()
conn.close()
