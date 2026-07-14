import os
from dotenv import load_dotenv; load_dotenv()
import psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
cur.execute("ALTER TABLE goals ADD COLUMN IF NOT EXISTS date DATE;")
conn.commit()
cur.close()
conn.close()
print("Migration: date column added to goals table")
