import os
os.environ["LLM_DAILY_LIMIT"] = "500"
os.environ["LLM_ROUTING_STRATEGY"] = "qwen"
os.environ["LLM_MODEL_PRIMARY"] = "qwen2.5:7b"
os.environ["LLM_MODEL_SECONDARY"] = "qwen2.5:7b"
os.environ["LLM_MODEL_FALLBACK"] = "qwen2.5:7b"
os.environ["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
os.environ["OPENAI_API_KEY"] = "ollama"

from app import app
with app.app_context():
    from pattern_engine.models import RawEvent
    from config.database import db
    from sqlalchemy import text
    
    remaining = RawEvent.query.filter(RawEvent.processed_at.is_(None)).count()
    print(f"Remaining unprocessed events: {remaining}")
    
    # Run remaining pipeline stages
    from pattern_engine.pipeline import _infer_knowledge, _infer_meetings, _detect_decision_reversal
    
    events = RawEvent.query.all()
    
    print("\n=== Inferring meetings ===")
    _infer_meetings(384, events)
    
    print("\n=== Inferring knowledge ===")
    _infer_knowledge(384, events)
    
    print("\n=== Detecting decision reversals ===")
    _detect_decision_reversal(384)
    
    # Print final counts
    from models.decision_log import DecisionLog
    decisions = DecisionLog.query.filter_by(workspace_id=384).all()
    print(f"\n=== FINAL RESULTS ===")
    print(f"Decisions: {len(decisions)}")
    for d in decisions:
        ss = d.superseded_by_id
        print(f"  [{d.id}] {d.decision[:55]:55s} | {d.status:12s} | {d.decision_type or '':10s} | {d.source_integration or '':15s} | superseded_by={ss} | conf={d.confidence_score}")
    
    ki = db.session.execute(text("SELECT COUNT(*) FROM knowledge_items WHERE workspace_id=384")).scalar()
    mn = db.session.execute(text("SELECT COUNT(*) FROM meeting_notes WHERE workspace_id=384")).scalar()
    tk = db.session.execute(text("SELECT COUNT(*) FROM tasks WHERE workspace_id=384")).scalar()
    pr = db.session.execute(text("SELECT COUNT(*) FROM raw_events WHERE processed_at IS NOT NULL")).scalar()
    print(f"\nKnowledge: {ki} | Meetings: {mn} | Tasks: {tk} | Processed RawEvents: {pr}")
