import sqlite3, os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'instance', 'foundesk.db')
print(f"DB path: {db_path}")
if not os.path.exists(db_path):
    print("ERROR: DB file does not exist")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]
print(f"\n=== TABLES ({len(tables)}) ===")
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM [{t}]")
    cnt = cur.fetchone()[0]
    print(f"  {t:35s} {cnt} rows")

# Raw events table
for src_table in ['raw_events', 'integration_events', 'activity_events']:
    if src_table in tables:
        cur.execute(f"SELECT source, COUNT(*) FROM [{src_table}] GROUP BY source ORDER BY COUNT(*) DESC")
        rows = cur.fetchall()
        print(f"\n=== {src_table.upper()} BY SOURCE ===")
        for r in rows:
            print(f"  {r[0]:25s} {r[1]}")

# Meeting notes
if 'meeting_notes' in tables:
    cur.execute("SELECT source_integration, COUNT(*) FROM meeting_notes GROUP BY source_integration")
    print("\n=== MEETING_NOTES BY SOURCE_INTEGRATION ===")
    for r in cur.fetchall():
        print(f"  {r[0] or 'NULL':25s} {r[1]}")

conn.close()
