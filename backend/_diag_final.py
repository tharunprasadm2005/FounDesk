import os, psycopg2
from dotenv import load_dotenv; load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

print("=== ALL TABLES COUNT ===")
for t in ["raw_events","decision_logs","meeting_notes","knowledge_items","tasks","goals","blockers","follow_ups","standups"]:
    cur.execute(f"SELECT COUNT(*) FROM {t}"); c = cur.fetchone()[0]
    print(f"  {t}: {c}")

print("\n=== DECISIONS by source_integration ===")
cur.execute("SELECT source_integration, COUNT(*) FROM decision_logs WHERE source_integration IS NOT NULL GROUP BY source_integration ORDER BY COUNT(*) DESC")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== TASKS by source ===")
cur.execute("SELECT source, COUNT(*) FROM tasks WHERE source IS NOT NULL GROUP BY source ORDER BY source")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== FOLLOW-UPS ===")
cur.execute("SELECT COUNT(*) FROM follow_ups")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT person_name, context, status FROM follow_ups LIMIT 5")
for r in cur.fetchall():
    print(f"  person='{r[0][:30] if r[0] else 'N/A'}' | context='{str(r[1])[:60] if r[1] else 'N/A'}' | status={r[2]}")

print("\n=== MEETING NOTES ===")
cur.execute("SELECT COUNT(*) FROM meeting_notes")
print(f"  Total: {cur.fetchone()[0]}")

print("\n=== BLOCKERS ===")
cur.execute("SELECT COUNT(*) FROM blockers")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT title, severity, source_event_id FROM blockers LIMIT 5")
for r in cur.fetchall():
    print(f"  '{r[0][:50] if r[0] else 'N/A'}' | severity={r[1]}")

print("\n=== GOALS ===")
cur.execute("SELECT COUNT(*) FROM goals")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT goal_type, COUNT(*) FROM goals GROUP BY goal_type")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== STANDUPS ===")
cur.execute("SELECT COUNT(*) FROM standups")
print(f"  Total: {cur.fetchone()[0]}")
cur.execute("SELECT id, title, summary IS NOT NULL AS has_summary, sentiment FROM standups ORDER BY id DESC LIMIT 3")
for r in cur.fetchall():
    print(f"  id={r[0]} title='{r[1] or 'N/A'}' | has_summary={r[2]} | sentiment={r[3]}")

print("\n=== ACTIVE PHASE ===")
cur.execute("SELECT id, name, active_phase FROM workspaces")
for r in cur.fetchall():
    print(f"  ws={r[0]} '{r[1]}': phase={r[2]}")

print("\n=== RAW EVENTS status ===")
cur.execute("SELECT processing_status, COUNT(*) FROM raw_events GROUP BY processing_status ORDER BY processing_status")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== RAW EVENTS done by source ===")
cur.execute("SELECT source, COUNT(*) FROM raw_events WHERE processing_status='done' GROUP BY source ORDER BY source")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

print("\n=== RECONCILIATION ===")
cur.execute("SELECT COUNT(*) FROM raw_events")
raw = cur.fetchone()[0]
derived = sum(
    cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    for t in ["decision_logs","meeting_notes","knowledge_items","tasks","goals","blockers","follow_ups","standups"]
)
print(f"  Raw events: {raw}")
print(f"  Total derived: {derived}")

cur.close()
conn.close()
