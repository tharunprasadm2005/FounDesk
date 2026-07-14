import os, psycopg2
from dotenv import load_dotenv; load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

tables = [
    "follow_ups",
    "blockers",
    "knowledge_items",
    "meeting_notes",
    "decision_logs",
    "tasks",
    "standups",
    "goals",
    "raw_events",
    "chronicle_events",
    "activity_events",
]

print("=== Before cleanup ===")
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    c = cur.fetchone()[0]
    print(f"  {t}: {c}")

# Delete in dependency order (children first, then parents)
print("\n=== Running cleanup ===")
for t in tables:
    try:
        cur.execute(f"DELETE FROM {t}")
        print(f"  DELETED {t}")
    except Exception as e:
        print(f"  FAILED {t}: {e}")
        conn.rollback()

conn.commit()

print("\n=== After cleanup ===")
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t}")
    c = cur.fetchone()[0]
    print(f"  {t}: {c}")

# Verify users/workspaces/integrations are intact
print("\n=== Preserved data ===")
cur.execute("SELECT COUNT(*) FROM users")
print(f"  users: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM workspaces")
print(f"  workspaces: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM user_integrations")
print(f"  user_integrations: {cur.fetchone()[0]}")

cur.close()
conn.close()
