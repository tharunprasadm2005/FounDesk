import os, psycopg2
from dotenv import load_dotenv; load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

# Find an existing done event to use as test target
cur.execute("SELECT id, source, processing_status FROM raw_events WHERE processing_status = 'pending' LIMIT 1")
row = cur.fetchone()
print(f"Before: id={row[0]} source={row[1]} status={row[2]}")
test_id = row[0]

# Set it to processing with old timestamp
cur.execute("UPDATE raw_events SET processing_status = 'processing', created_at = NOW() - INTERVAL '2 hours', retry_count = 1 WHERE id = %s", (test_id,))
conn.commit()
cur.execute("SELECT processing_status, created_at FROM raw_events WHERE id = %s", (test_id,))
r = cur.fetchone()
print(f"After forced stale: status={r[0]} created_at={r[1]}")

cur.close()
conn.close()
print(f"Test event {test_id} is now in stale 'processing' state, ready for pipeline test")
