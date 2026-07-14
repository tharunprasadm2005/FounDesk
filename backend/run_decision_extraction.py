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
    from pattern_engine.models import RawEvent, PipelineLock
    from config.database import db
    from sqlalchemy import text
    
    # Reset ALL events to unprocessed
    conn = db.session.connection()
    conn.execute(text("UPDATE raw_events SET processed_at = NULL, pipeline_name = NULL, processing_status = 'pending', retry_count = 0, last_error = NULL"))
    PipelineLock.query.delete()
    db.session.commit()
    
    total = db.session.execute(text("SELECT COUNT(*) FROM raw_events")).scalar()
    print(f"Reset {total} events")

    # Test a single decision LLM call first
    from pattern_engine.llm_client import call_llm
    from pattern_engine.extraction import DECISION_SCHEMA
    
    # Single quick test
    test_msg = [{"role": "system", "content": "You extract business decisions from event content. Respond with the structured schema."},
                {"role": "user", "content": "Event: 'Sprint Planning Meeting. Agenda: Assign engineering tasks for Teams integration and SSO implementation. Decision: Allocate developers to Teams integration and SSO.'"}]
    
    print("Testing single decision extraction via Ollama...")
    result = call_llm(test_msg, DECISION_SCHEMA)
    print(f"Test result: {result}")
    print("Ollama works! Running full pipeline...")
    
    # Now run the full pipeline
    from pattern_engine.pipeline import _llm_infer_decisions
    events = RawEvent.query.filter(RawEvent.processed_at.is_(None)).all()
    print(f"Running decision inference on {len(events)} events...")
    stats = {'created': 0, 'skipped': 0, 'routed': 0, 'processed': 0, 'errors': 0, 'updated': 0}
    _llm_infer_decisions(384, events)
    print("Decision inference done")
    
    # Check results
    from models.decision_log import DecisionLog
    decisions = DecisionLog.query.filter_by(workspace_id=384).all()
    print(f"\nDecisions created: {len(decisions)}")
    for d in decisions:
        print(f"  [{d.id}] {d.decision[:70]} | status={d.status} | type={d.decision_type} | source={d.source_integration} | confidence={d.confidence_score}")
