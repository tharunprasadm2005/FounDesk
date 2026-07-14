"""Query FollowUp data to confirm context column works."""
import os, sys
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))
os.environ["APP_ENV"] = "development"
from app import app
from config.database import db
from sqlalchemy import text

with app.app_context():
    cur = db.session.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name='follow_ups'
        ORDER BY ordinal_position
    """))
    print("=== follow_ups columns ===")
    for r in cur:
        print(f"  {r[0]:30s} {r[1]:20s} nullable={r[2]}")

    cur = db.session.execute(text("""
        SELECT id, person_name, context, status, created_at
        FROM follow_ups ORDER BY id
    """))
    print("\n=== ALL follow_ups ===")
    for r in cur:
        print(f"  id={r[0]:3d} person='{r[1]}' context='{str(r[2])[:120] if r[2] else 'NULL'}' status={r[3]} created={r[4]}")
