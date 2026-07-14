import sqlite3, os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'foundesk.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
print("=== TABLES ===")
for r in cur.fetchall():
    print(r[0])

# Check raw_events
try:
    cur.execute("SELECT source, COUNT(*) FROM raw_events GROUP BY source ORDER BY COUNT(*) DESC")
    print("\n=== RAW_EVENTS BY SOURCE ===")
    for r in cur.fetchall():
        print(f"  {r[0]:25s} {r[1]}")
except Exception as e:
    print(f"\nError querying raw_events: {e}")

# Check meeting_notes
try:
    cur.execute("SELECT source_integration, COUNT(*) FROM meeting_notes GROUP BY source_integration")
    print("\n=== MEETING_NOTES BY SOURCE_INTEGRATION ===")
    for r in cur.fetchall():
        print(f"  {r[0]:25s} {r[1]}")
except Exception as e:
    print(f"\nError querying meeting_notes: {e}")

# Check task counts
try:
    cur.execute("SELECT source_integration, COUNT(*) FROM tasks WHERE source_integration IS NOT NULL GROUP BY source_integration")
    print("\n=== TASKS BY SOURCE_INTEGRATION ===")
    for r in cur.fetchall():
        print(f"  {r[0]:25s} {r[1]}")
except Exception as e:
    print(f"\nError querying tasks: {e}")

# Check decision_logs
try:
    cur.execute("SELECT source_integration, COUNT(*) FROM decision_logs WHERE source_integration IS NOT NULL GROUP BY source_integration")
    print("\n=== DECISION_LOGS BY SOURCE_INTEGRATION ===")
    for r in cur.fetchall():
        print(f"  {r[0]:25s} {r[1]}")
except Exception as e:
    print(f"\nError querying decision_logs: {e}")

conn.close()
