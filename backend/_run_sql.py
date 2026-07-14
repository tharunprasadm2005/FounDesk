import os
from dotenv import load_dotenv
load_dotenv()
import psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("UPDATE raw_events SET processing_status = 'pending', retry_count = 1 WHERE processing_status = 'processing' AND created_at < NOW() - INTERVAL '1 hour'")
print(f"Updated {cur.rowcount} rows")
conn.commit()
cur.close()
conn.close()
