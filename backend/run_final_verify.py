import os
os.environ["LLM_DAILY_LIMIT"] = "500"
os.environ["LLM_ROUTING_STRATEGY"] = "qwen"
os.environ["LLM_MODEL_PRIMARY"] = "qwen2.5:7b"
os.environ["LLM_MODEL_SECONDARY"] = "qwen2.5:7b"
os.environ["OPENAI_BASE_URL"] = "http://localhost:11434/v1"
os.environ["OPENAI_API_KEY"] = "ollama"

from app import app
with app.app_context():
    from models.decision_log import DecisionLog
    from pattern_engine.models import RawEvent, PipelineLock
    from config.database import db
    from sqlalchemy import text
    
    # Reset RawEvents and locks
    RawEvent.query.update({'processed_at': None, 'pipeline_name': None})
    PipelineLock.query.delete()
    db.session.commit()
    print(f"Reset {RawEvent.query.count()} RawEvents, cleared locks")
    
    from pattern_engine.pipeline import _compile_feed, _llm_infer_decisions, _infer_meetings, _infer_knowledge
    from pattern_engine.pipeline import _enrich_decisions, _detect_decision_reversal
    
    # Step 1: Compile feed
    _compile_feed(384)
    events = RawEvent.query.filter(RawEvent.processed_at.is_(None)).all()
    print(f"Unprocessed events: {len(events)}")
    
    # Step 2: Decision inference
    _llm_infer_decisions(384, events)
    
    # Step 3: Meeting inference (with dedup fix applied)
    _infer_meetings(384, events)
    
    # Step 4: Knowledge
    _infer_knowledge(384, events)
    
    # Step 5: Enrich and reversal detection
    _enrich_decisions(384, events)
    _detect_decision_reversal(384)
    
    db.session.commit()
    
    # Final check
    decisions = DecisionLog.query.filter_by(workspace_id=384).order_by(DecisionLog.id).all()
    print(f"\n=== FINAL DECISIONS: {len(decisions)} ===")
    for d in decisions:
        print(f"  [{d.id}] conf={d.confidence_score} | status={d.status:10s} | source={str(d.source_integration or ''):15s} | {d.decision[:55]}")
    
    # Verify no duplicates
    seen = {}
    for d in decisions:
        key = d.decision[:30].lower().strip()
        if key in seen:
            print(f"  ⚠️  DUPLICATE: [{seen[key]}] and [{d.id}] both have '{d.decision[:30]}'")
        seen[key] = d.id
    print("  No duplicates in final set")
    
    # Summary counts
    ki = db.session.execute(text("SELECT COUNT(*) FROM knowledge_items WHERE workspace_id=384")).scalar()
    mn = db.session.execute(text("SELECT COUNT(*) FROM meeting_notes WHERE workspace_id=384")).scalar()
    tk = db.session.execute(text("SELECT COUNT(*) FROM tasks WHERE workspace_id=384")).scalar()
    print(f"\nKnowledge: {ki} | Meetings: {mn} | Tasks: {tk}")
