import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ["APP_ENV"] = "development"
os.environ["SKIP_SCHEDULER"] = "1"
from app import app
from config.database import db
from sqlalchemy import text

with app.app_context():
    cur = db.session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
    print("=== all tables ===")
    for r in cur:
        print(f"  {r[0]}")

    cur = db.session.execute(text("SELECT COUNT(*) FROM follow_ups"))
    print(f"Follow-ups: {cur.scalar()}")

    cur = db.session.execute(text("SELECT id, context IS NOT NULL AS has_context FROM follow_ups"))
    print("Follow-ups with context:")
    for r in cur:
        print(f"  id={r[0]} has_context={r[1]}")

    cur = db.session.execute(text("SELECT COUNT(*) FROM goals"))
    print(f"Goals: {cur.scalar()}")

    cur = db.session.execute(text("SELECT COUNT(*) FROM blockers"))
    print(f"Blockers: {cur.scalar()}")

    cur = db.session.execute(text("SELECT COUNT(*) FROM standups"))
    print(f"Standups: {cur.scalar()}")

    cur = db.session.execute(text("SELECT id, name, active_phase FROM workspaces WHERE id IN (370,371,372)"))
    print("Workspaces:")
    for r in cur:
        print(f"  ws={r[0]} '{r[1]}' phase={r[2]}")

    # Check if decisions table exists
    cur = db.session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%decis%' OR table_name LIKE '%task%'"))
    print("Decision/Task tables:")
    for r in cur:
        print(f"  {r[0]}")
