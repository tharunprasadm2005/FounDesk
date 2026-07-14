"""Run the remaining pipeline steps that timed out."""
import os, sys
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, os.path.dirname(__file__))
os.environ["APP_ENV"] = "development"
os.environ["SKIP_SCHEDULER"] = "1"
from app import app
from config.database import db
from pattern_engine.pipeline import (
    _auto_align_goals,
    _process_blocker_events,
    _compute_active_phase,
    _auto_standup,
)
from pattern_engine.models import RawEvent
from sqlalchemy import text

WS_ID = 372

with app.app_context():
    print("=== Running remaining pipeline steps ===")

    # Goals
    print("\n[GOALS] _auto_align_goals...")
    try:
        _auto_align_goals(WS_ID)
        db.session.commit()
    except Exception as e:
        print(f"  Error: {e}")
        db.session.rollback()

    # Blockers
    print("\n[BLOCKERS] _process_blocker_events...")
    all_events = RawEvent.query.all()
    try:
        _process_blocker_events(WS_ID, all_events)
        db.session.commit()
    except Exception as e:
        print(f"  Error: {e}")
        db.session.rollback()

    # Standup
    print("\n[STANDUP] _auto_standup...")
    try:
        _auto_standup(WS_ID)
        db.session.commit()
    except Exception as e:
        print(f"  Error: {e}")
        db.session.rollback()

    # Active phase
    print("\n[PHASE] _compute_active_phase...")
    try:
        _compute_active_phase(WS_ID)
        db.session.commit()
    except Exception as e:
        print(f"  Error: {e}")
        db.session.rollback()

    # RESULTS
    print("\n=== RESULTS ===")
    for t in ["goals", "blockers", "standups"]:
        c = db.session.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
        print(f"  {t}: {c}")

    cur = db.session.execute(text("SELECT id, name, active_phase FROM workspaces WHERE id=:ws"), {"ws": WS_ID})
    for r in cur:
        print(f"  Active phase: ws={r[0]} '{r[1]}' phase={r[2]}")

    if c_goals := db.session.execute(text("SELECT COUNT(*) FROM goals")).scalar():
        print("\n=== GOALS ===")
        for r in db.session.execute(text("SELECT id, title, goal_type, status FROM goals LIMIT 5")):
            print(f"  id={r[0]} '{r[1][:40] if r[1] else 'N/A'}' type={r[2]} status={r[3]}")

    if c_blockers := db.session.execute(text("SELECT COUNT(*) FROM blockers")).scalar():
        print("\n=== BLOCKERS ===")
        for r in db.session.execute(text("SELECT id, title, severity, status FROM blockers LIMIT 5")):
            print(f"  id={r[0]} '{r[1][:50] if r[1] else 'N/A'}' severity={r[2]} status={r[3]}")

    if c_standups := db.session.execute(text("SELECT COUNT(*) FROM standups")).scalar():
        print("\n=== STANDUPS ===")
        for r in db.session.execute(text("SELECT id, q1_yesterday IS NOT NULL AS has_summary, date FROM standups ORDER BY id DESC LIMIT 3")):
            print(f"  id={r[0]} has_q1={r[1]} date={r[2]}")

    print("\nDone.")
