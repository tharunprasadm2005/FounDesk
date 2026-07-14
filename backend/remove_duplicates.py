from app import app
with app.app_context():
    from models.decision_log import DecisionLog
    from config.database import db
    from sqlalchemy import text
    
    # Remove lower-confidence duplicates (1448-1452 came from _infer_meetings at conf=0.7)
    # Keep the higher-confidence versions (1438-1447 came from _llm_infer_decisions)
    to_remove = [1448, 1449, 1450, 1451, 1452]
    for did in to_remove:
        d = DecisionLog.query.get(did)
        if d:
            db.session.delete(d)
            print(f"  Removed [{did}] {d.decision[:50]}")
    
    # Also clean up DecisionLog 1451 which is same as 1447 but with different wording
    # 1447: "Allocate developers to integration tasks" 
    # 1451: "Allocate developers to Teams integration and SSO implementation"
    # These are the same decision. Keep 1447 (conf=0.95 from google_meet via _llm_infer_decisions)
    d1451 = DecisionLog.query.get(1451)
    if d1451:
        db.session.delete(d1451)
        print(f"  Removed [1451] {d1451.decision[:50]}")
    
    d1452 = DecisionLog.query.get(1452)
    if d1452:
        db.session.delete(d1452)
        print(f"  Removed [1452] {d1452.decision[:50]}")
    
    db.session.commit()
    
    # Verify
    remaining = DecisionLog.query.filter_by(workspace_id=384).order_by(DecisionLog.id).all()
    print(f"\n=== FINAL: {len(remaining)} decisions (deduplicated) ===")
    for d in remaining:
        print(f"  [{d.id}] conf={d.confidence_score} | source={str(d.source_integration or ''):15s} | {d.decision[:55]}")
    
    # Verify no duplicates remain
    titles = {}
    dups_found = False
    for d in remaining:
        key = d.decision[:30].lower().strip()
        if key in titles:
            print(f"  ⚠️  DUPLICATE STILL EXISTS: [{titles[key]}] vs [{d.id}]")
            dups_found = True
        titles[key] = d.id
    if not dups_found:
        print(f"  ✅ No duplicates remaining")
