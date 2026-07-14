"""Verify .env loading works without CLI env vars + show FollowUp with context."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ["APP_ENV"] = "development"

# Do NOT set DATABASE_URL on CLI — rely on .env loading via config.database
from app import app
from config.database import db
from sqlalchemy import text

with app.app_context():
    # Verify .env was loaded (DATABASE_URL should be set)
    db_url = os.environ.get("DATABASE_URL", "NOT SET")
    print(f"DATABASE_URL loaded from .env: {'Yes (starts with postgresql://)' if db_url.startswith('postgresql://') else 'NO - check .env'}")
    
    # 1.1 Show FollowUp model columns and a real row
    cur = db.session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='follow_ups' ORDER BY ordinal_position"))
    print("\n=== FollowUp columns ===")
    for r in cur:
        print(f"  {r[0]} ({r[1]})")
    
    cur = db.session.execute(text("SELECT id, person_name, context, status FROM follow_ups LIMIT 5"))
    print("\n=== FollowUp rows ===")
    for r in cur:
        ctx = r[2] or ""
        print(f"  id={r[0]} person='{r[1]}' context_len={len(ctx)} context_preview='{ctx[:80]}' status={r[3]}")
    
    # Full context for first row
    cur = db.session.execute(text("SELECT context FROM follow_ups WHERE context IS NOT NULL LIMIT 1"))
    row = cur.fetchone()
    if row:
        print(f"\n=== Full context for first follow-up ===")
        print(f"  {row[0]}")
