import os, psycopg2
from dotenv import load_dotenv; load_dotenv()
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()
try:
    cur.execute("ALTER TABLE follow_ups ADD COLUMN context TEXT")
    print("Added context column to follow_ups")
except psycopg2.errors.DuplicateColumn:
    print("context column already exists")
    conn.rollback()
conn.commit()
cur.close()
conn.close()
