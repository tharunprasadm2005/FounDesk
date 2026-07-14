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
    from pattern_engine.models import RawEvent
    from config.database import db
    from sqlalchemy import text

    # Run contradiction detection
    print("=== Running decision reversal detection ===")
    from pattern_engine.pipeline import _detect_decision_reversal
    _detect_decision_reversal(384)
    print("Done")
    
    # Check decisions after reversal detection
    decisions = DecisionLog.query.filter_by(workspace_id=384).order_by(DecisionLog.id).all()
    print(f"\n=== ALL {len(decisions)} DECISIONS ===")
    for d in decisions:
        print(f"  [{d.id:4d}] status={d.status:12s} | type={str(d.decision_type or ''):10s} | source={str(d.source_integration or ''):15s} | superseded_by={str(d.superseded_by_id):4s} | conf={d.confidence_score} | {d.decision[:55]}")
    
    # Check for specific themes
    print("\n=== THEME SEARCH ===")
    themes = {
        "Teams/Microsoft integration": ["teams", "microsoft"],
        "SSO": ["sso", "single sign-on", "single sign on"],
        "Onboarding": ["onboard"],
        "Backend Engineer hiring": ["backend engineer", "hire"],
        "Enterprise/roadmap": ["enterprise", "roadmap"],
        "Calendly replacement": ["calendly", "replace"],
        "Investor/financial": ["investor", "arr", "financial"],
        "Acme Technologies": ["acme"],
    }
    for theme_name, keywords in themes.items():
        found = False
        for d in decisions:
            dl = d.decision.lower()
            if any(k in dl for k in keywords):
                print(f"  ✅ {theme_name}: [{d.id}] {d.decision[:60]} | source={d.source_integration}")
                found = True
        if not found:
            print(f"  ❌ {theme_name}: NOT FOUND")
    
    # Source check
    print("\n=== SOURCE DISTRIBUTION ===")
    sources = db.session.execute(text(
        "SELECT source_integration, COUNT(*) as cnt FROM decision_logs WHERE workspace_id=384 GROUP BY source_integration ORDER BY cnt DESC"
    )).fetchall()
    for s, c in sources:
        print(f"  {s}: {c}")
    
    # Check for disallowed sources
    disallowed = {"linear", "trello", "asana", "monday", "calendly", "mixpanel", "amplitude", "posthog"}
    for d in decisions:
        si = d.source_integration or ''
        if si.lower() in disallowed:
            print(f"  ❌ DISALLOWED SOURCE: [{d.id}] source={si}")
    
    print("\n=== CONTRADICTION CHECK ===")
    contradicted = [d for d in decisions if d.status in ("Reversed", "Superseded") or d.superseded_by_id is not None]
    if contradicted:
        for d in contradicted:
            print(f"  [{d.id}] {d.decision[:50]} | status={d.status} | superseded_by={d.superseded_by_id}")
    else:
        print("  No contradictions detected (expected - data doesn't contain conflicting decisions)")
    
    # Print raw events data for completeness
    print(f"\n=== DATA SUMMARY ===")
    pr = db.session.execute(text("SELECT COUNT(*) FROM raw_events WHERE processed_at IS NOT NULL")).scalar()
    un = db.session.execute(text("SELECT COUNT(*) FROM raw_events WHERE processed_at IS NULL")).scalar()
    ki = db.session.execute(text("SELECT COUNT(*) FROM knowledge_items WHERE workspace_id=384")).scalar()
    mn = db.session.execute(text("SELECT COUNT(*) FROM meeting_notes WHERE workspace_id=384")).scalar()
    tk = db.session.execute(text("SELECT COUNT(*) FROM tasks WHERE workspace_id=384")).scalar()
    fl = db.session.execute(text("SELECT COUNT(*) FROM follow_ups WHERE workspace_id=384")).scalar()
    print(f"  RawEvents: {pr} processed, {un} unprocessed")
    print(f"  Decisions: {len(decisions)}")
    print(f"  Knowledge: {ki}")
    print(f"  Meetings: {mn}")
    print(f"  Tasks: {tk}")
    print(f"  Follow-ups: {fl}")
