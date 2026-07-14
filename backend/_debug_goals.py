"""Debug _auto_align_goals step by step."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ["APP_ENV"] = "development"
os.environ["SKIP_SCHEDULER"] = "1"
os.environ["LLM_ROUTING_STRATEGY"] = "structured_fast"

from app import app
from config.database import db
from pattern_engine.pipeline import _auto_align_goals
from models.decision_log import DecisionLog
from models.task import Task
from models.goal import Goal
from datetime import datetime, timedelta

WS_ID = 372

with app.app_context():
    # Step 1: Check existing goals
    existing = Goal.query.filter_by(workspace_id=WS_ID).all()
    print(f"Existing goals: {len(existing)}")
    
    # Step 2: Check today's daily goals
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    daily = Goal.query.filter(
        Goal.workspace_id == WS_ID,
        Goal.goal_type == "daily",
        Goal.created_at >= today_start,
    ).first()
    print(f"Today's daily goals: {daily}")
    
    # Step 3: Check recent decisions
    recent_decisions = DecisionLog.query.filter(
        DecisionLog.workspace_id == WS_ID,
        DecisionLog.created_at >= (datetime.utcnow() - timedelta(hours=24)),
    ).limit(5).all()
    print(f"Recent decisions: {len(recent_decisions)}")
    for d in recent_decisions:
        print(f"  id={d.id} txt='{str(d.decision)[:60]}' len={len(str(d.decision))}")
    
    # Step 4: Check recent tasks
    recent_tasks = Task.query.filter(
        Task.workspace_id == WS_ID,
        Task.created_at >= (datetime.utcnow() - timedelta(hours=24)),
    ).limit(5).all()
    print(f"Recent tasks: {len(recent_tasks)}")
    for t in recent_tasks:
        print(f"  id={t.id} title='{str(t.title)[:60]}' len={len(str(t.title))}")
    
    # Step 5: Build signals
    signals = []
    for d in recent_decisions:
        if d.decision and len(d.decision) > 10:
            signals.append(("decision", d.decision))
    for t in recent_tasks:
        if t.title and len(t.title) > 10:
            signals.append(("task", t.title))
    print(f"Signals: {len(signals)}")
    
    # Step 6: Call check_goal_alignment for first signal
    if signals:
        from pattern_engine.extraction import check_goal_alignment
        item_type, item_title = signals[0]
        existing_titles = [g.title for g in existing]
        print(f"Testing check_goal_alignment with: type={item_type}, title='{item_title[:50]}'")
        try:
            result = check_goal_alignment(item_type, item_title, existing_titles)
            print(f"Result: {result}")
            if result:
                print(f"  aligned_goal: {result.get('aligned_goal')}")
                print(f"  confidence: {result.get('alignment_confidence')}")
        except Exception as e:
            print(f"ERROR: {e}")
    
    # Finally, run the actual function
    print("\n--- Running _auto_align_goals ---")
    try:
        _auto_align_goals(WS_ID)
        db.session.commit()
        goals_after = Goal.query.filter_by(workspace_id=WS_ID).all()
        print(f"Goals after: {len(goals_after)}")
        for g in goals_after:
            print(f"  id={g.id} '{g.title}' type={g.goal_type} status={g.status}")
    except Exception as e:
        print(f"Auto align failed: {e}")
        db.session.rollback()
