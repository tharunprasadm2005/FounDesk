import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ["APP_ENV"] = "development"
from app import app
from config.database import db
from sqlalchemy import text

with app.app_context():
    # Check decision_logs for ws=372
    cur = db.session.execute(text("SELECT COUNT(*) FROM decision_logs WHERE workspace_id=372"))
    print(f"DecisionLogs for ws=372: {cur.scalar()}")

    cur = db.session.execute(text("SELECT id, decision, created_at FROM decision_logs WHERE workspace_id=372 ORDER BY id"))
    print("Recent decision_logs:")
    for r in cur:
        print(f"  id={r[0]} created={r[1]} decision={str(r[2])[:60] if r[2] else 'None'}")

    cur = db.session.execute(text("SELECT COUNT(*) FROM tasks WHERE workspace_id=372"))
    print(f"Tasks for ws=372: {cur.scalar()}")

    cur = db.session.execute(text("SELECT id, title, created_at FROM tasks WHERE workspace_id=372 ORDER BY id"))
    print("Recent tasks:")
    for r in cur:
        print(f"  id={r[0]} created={r[1]} title={str(r[2])[:60] if r[2] else 'None'}")

    # Check the Goal model
    cur = db.session.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='goals' ORDER BY ordinal_position"))
    print("Goals columns:")
    for r in cur:
        print(f"  {r[0]} ({r[1]})")
