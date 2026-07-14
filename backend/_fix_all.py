"""Comprehensive fix for Part 2 issues:
1. Delete fake fundraising templates from DB
2. Delete leftover "Finalize Discount Tiers" goal
3. Remove stale follow-ups with generic "Meeting participant" names
4. Run pipeline to process remaining 16 RawEvents
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()
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
    # ─── 1. Delete fake fundraising templates ───
    print("=== Part 2: Delete fake templates ===")
    for table in ["phase_template_tasks", "phase_template_goals", "phase_templates"]:
        c = db.session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        print(f"  Before: {table}: {c}")
    db.session.execute(text(f"DELETE FROM phase_template_tasks"))
    db.session.execute(text(f"DELETE FROM phase_template_goals"))
    db.session.execute(text(f"DELETE FROM phase_templates"))
    db.session.commit()
    for table in ["phase_template_tasks", "phase_template_goals", "phase_templates"]:
        c = db.session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
        print(f"  After: {table}: {c}")

    # ─── 4. Delete leftover "Finalize Discount Tiers" goal ───
    print("\n=== Part 4: Delete leftover fake goal ===")
    goals_before = db.session.execute(text("SELECT id, title, goal_type, status FROM goals WHERE title LIKE '%Discount Tiers%'")).fetchall()
    print(f"  Found {len(goals_before)} fake goals:")
    for r in goals_before:
        print(f"    id={r[0]} title='{r[1]}' type={r[2]} status={r[3]}")
    db.session.execute(text("DELETE FROM goals WHERE title LIKE '%Discount Tiers%'"))
    db.session.commit()
    goals_after = db.session.execute(text("SELECT id, title, goal_type, status FROM goals WHERE title LIKE '%Discount Tiers%'")).fetchall()
    print(f"  After delete: {len(goals_after)} remaining")

    # ─── 5. Remove stale follow-ups with generic "Meeting participant" names ───
    print("\n=== Part 5: Remove stale/generic follow-ups ===")
    all_followups = db.session.execute(text("SELECT id, title, type, status, assignee_name FROM followups WHERE workspace_id=:ws"), {"ws": WS_ID}).fetchall()
    print(f"  Total follow-ups: {len(all_followups)}")
    generic_titles = []
    for r in all_followups:
        title = (r[1] or "").strip().lower()
        assignee = (r[4] or "").strip().lower() if r[4] else ""
        is_generic = (
            "meeting participant" in title
            or assignee in ("", "null", "none")
            and title in ("", "follow-up", "todo", "task")
            or "meeting" in title and "participant" in title
            or title.startswith("meeting participant")
        )
        if is_generic or (assignee in ("", "null", "none") and title in ("", "follow-up", "todo", "task")):
            generic_titles.append(r[0])
    if generic_titles:
        print(f"  Deleting {len(generic_titles)} stale follow-ups: ids={generic_titles}")
        for fid in generic_titles:
            db.session.execute(text("DELETE FROM followups WHERE id=:id"), {"id": fid})
        db.session.commit()
    else:
        print("  No generic follow-ups found")
    remaining = db.session.execute(text("SELECT COUNT(*) FROM followups WHERE workspace_id=:ws"), {"ws": WS_ID}).scalar()
    print(f"  Remaining follow-ups: {remaining}")

    # ─── 1. Run pipeline ───
    print("\n=== Part 1: Run pipeline for remaining RawEvents ===")
    remaining_raw = RawEvent.query.filter_by(workspace_id=WS_ID, processed=False).count()
    print(f"  Unprocessed RawEvents: {remaining_raw}")

    print("  _auto_align_goals...")
    try:
        _auto_align_goals(WS_ID)
        db.session.commit()
    except Exception as e:
        print(f"    Error: {e}")
        db.session.rollback()

    print("  _process_blocker_events...")
    all_events = RawEvent.query.all()
    try:
        _process_blocker_events(WS_ID, all_events)
        db.session.commit()
    except Exception as e:
        print(f"    Error: {e}")
        db.session.rollback()

    print("  _auto_standup...")
    try:
        _auto_standup(WS_ID)
        db.session.commit()
    except Exception as e:
        print(f"    Error: {e}")
        db.session.rollback()

    print("  _compute_active_phase...")
    try:
        _compute_active_phase(WS_ID)
        db.session.commit()
    except Exception as e:
        print(f"    Error: {e}")
        db.session.rollback()

    # ─── RESULTS ───
    print("\n=== RESULTS ===")
    for t in ["goals", "blockers", "standups"]:
        c = db.session.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
        print(f"  {t}: {c}")

    cur = db.session.execute(text("SELECT id, name, active_phase, active_health FROM workspaces WHERE id=:ws"), {"ws": WS_ID})
    for r in cur:
        print(f"  Workspace: id={r[0]} name='{r[1]}' phase='{r[2]}' health='{r[3]}'")

    if db.session.execute(text("SELECT COUNT(*) FROM goals")).scalar():
        print("\n=== GOALS ===")
        for r in db.session.execute(text("SELECT id, title, goal_type, status FROM goals LIMIT 10")):
            print(f"  id={r[0]} '{r[1][:50] if r[1] else 'N/A'}' type={r[2]} status={r[3]}")

    remaining_raw = RawEvent.query.filter_by(workspace_id=WS_ID, processed=False).count()
    print(f"\n  Remaining unprocessed RawEvents: {remaining_raw}")

    print("\n=== DONE ===")
