from app import app
with app.app_context():
    from pattern_engine.dedup import is_duplicate_similar
    from models.decision_log import DecisionLog
    from config.database import db
    
    # Test: check if 'Enterprise roadmap approved' would be caught as duplicate
    result = is_duplicate_similar(db.session, DecisionLog, 384, 'Enterprise roadmap approved')
    print(f'is_duplicate_similar result: {result}')
    
    # Test: check if 'Teams integration priority' is found
    result2 = is_duplicate_similar(db.session, DecisionLog, 384, 'Teams integration priority')
    print(f'is_duplicate_similar result 2: {result2}')
    
    # Test: a similar but different title
    result3 = is_duplicate_similar(db.session, DecisionLog, 384, 'Enterprise roadmap has been approved')
    print(f'is_duplicate_similar result 3: {result3}')
    
    # Check if the _process_ai path correctly uses is_duplicate_similar
    import inspect
    from pattern_engine.pipeline import _process_ai
    source = inspect.getsource(_process_ai)
    if 'is_duplicate_similar' in source:
        print('_process_ai uses is_duplicate_similar - good')
