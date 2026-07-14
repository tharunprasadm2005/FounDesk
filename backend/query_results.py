from app import app
with app.app_context():
    from models.decision_log import DecisionLog
    from pattern_engine.models import RawEvent
    from config.database import db
    from sqlalchemy import text
    
    # Decision Log
    decisions = DecisionLog.query.order_by(DecisionLog.created_at.desc()).all()
    print(f'=== DECISIONS: {len(decisions)} total ===')
    for d in decisions:
        print(f'  [{d.id}] {d.decision[:60]} | status={d.status} | type={d.decision_type} | source_integration={d.source_integration} | confidence={d.confidence_score} | superseded_by={d.superseded_by_id}')
    print()
    
    # Raw events processed
    processed = db.session.execute(text("SELECT COUNT(*) FROM raw_events WHERE processed_at IS NOT NULL")).scalar()
    unprocessed = db.session.execute(text("SELECT COUNT(*) FROM raw_events WHERE processed_at IS NULL")).scalar()
    print(f'RawEvents: processed={processed} unprocessed={unprocessed}')
    
    # Knowledge items
    ki = db.session.execute(text("SELECT COUNT(*) FROM knowledge_items WHERE workspace_id=384")).scalar()
    print(f'Knowledge items: {ki}')
    
    # Meeting notes
    mn = db.session.execute(text("SELECT COUNT(*) FROM meeting_notes WHERE workspace_id=384")).scalar()
    print(f'Meeting notes: {mn}')
    
    # Tasks
    tasks = db.session.execute(text("SELECT COUNT(*) FROM tasks WHERE workspace_id=384")).scalar()
    print(f'Tasks: {tasks}')
