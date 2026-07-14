import os, psycopg2
from dotenv import load_dotenv; load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("SELECT processing_status, COUNT(*) FROM raw_events GROUP BY processing_status ORDER BY processing_status")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")
cur.close()
conn.close()
