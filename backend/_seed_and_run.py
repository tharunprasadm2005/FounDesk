"""Insert test RawEvents and run pipeline using the actual app context."""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))

# Activate the actual Flask app
os.environ["APP_ENV"] = "development"
os.environ["SKIP_SCHEDULER"] = "1"
from app import app
from config.database import db
from pattern_engine.models import RawEvent
from pattern_engine.pipeline import (
    _process_task_tool_events,
    _llm_infer_decisions,
    _infer_meetings,
    _infer_knowledge,
    _auto_align_goals,
    _process_blocker_events,
    _compute_active_phase,
)
from datetime import datetime, timedelta
from sqlalchemy import text

WS_ID = 372
NOW = datetime.utcnow()

def make_raw(source, sid, ref, title, details, actor="", status=""):
    return RawEvent(
        source=source, source_id=sid, source_ref=ref,
        event_type="generic", occurred_at=NOW,
        raw_payload={"title": title, "details": details, "actor": actor, "status": status},
        is_mock=False, processing_status="pending", created_at=NOW,
    )

def seed():
    with app.app_context():
        # Clear old derived data
        for t in ["follow_ups", "blockers", "knowledge_items", "meeting_notes", "decision_logs", "tasks", "standups", "goals", "raw_events"]:
            db.session.execute(text(f"DELETE FROM {t}"))
        db.session.commit()

        raw_events = []

        # === Task-tool sources (8 events) ===
        raw_events.append(make_raw("linear","l1","linear_1","Implement Teams notification webhook","Build webhook endpoint for Teams outgoing notifications. POST /api/teams/webhook. Estimate: 3 days.","alice"))
        raw_events.append(make_raw("linear","l2","linear_2","Fix database connection pool exhaustion","Increase pool size, add retry logic, add monitoring alert.","bob","Done"))
        raw_events.append(make_raw("trello","t1","trello_1","Design new onboarding flow mockups","Figma mockups for 3-step onboarding. Remove credit card requirement.","tharu"))
        raw_events.append(make_raw("trello","t2","trello_2","Write API documentation for v2","Document REST endpoints, WebSocket events, GraphQL schema via OpenAPI 3.0.","dave"))
        raw_events.append(make_raw("asana","a1","asana_1","Set up CI/CD pipeline for mobile app","Configure GitHub Actions for iOS/Android builds. Auto release.","alice"))
        raw_events.append(make_raw("asana","a2","asana_2","Conduct security audit of payment flow","Third-party security review: Stripe integration, PCI compliance, data encryption.","bob"))
        raw_events.append(make_raw("monday","m1","monday_1","Prepare investor data room","Compile Series A due diligence: financial models, cap table, IP portfolio.","tharu"))
        raw_events.append(make_raw("monday","m2","monday_2","Set up SOC2 compliance tracking","Create compliance checklist, assign owners, monitor via Vanta. 45 controls.","dave"))

        # === CRM sources (6 events) ===
        raw_events.append(make_raw("hubspot","h1","hubspot_1","HubSpot Deal: Acme Corp Enterprise","Amount: $120000 | Stage: negotiations | Contact: Sarah Chen. Decision: offer volume discount?","Acme Corp"))
        raw_events.append(make_raw("hubspot","h2","hubspot_2","HubSpot Deal: Startup.io Growth Plan","Amount: $24000 | Stage: contractsent | Annual plan sent for signature.","Startup.io"))
        raw_events.append(make_raw("hubspot","h3","hubspot_3","HubSpot Deal: DataCorp Partnership","Amount: $60000 | Stage: closedwon | Won! Integration partnership. Launch Sept.","DataCorp"))
        raw_events.append(make_raw("pipedrive","p1","pipedrive_1","Pipedrive Deal: Omega Corp Consulting","Value: $45000 | Status: Open | Contact: Jane Smith. Need custom reporting.","Omega Corp"))
        raw_events.append(make_raw("pipedrive","p2","pipedrive_2","Pipedrive Deal: Nova Systems License","Value: $85000 | Status: Won | Closed! 200 seats at $425/seat/year.","Nova Systems"))
        raw_events.append(make_raw("pipedrive","p3","pipedrive_3","Pipedrive Deal: BluePeak Ventures","Value: $30000 | Status: Lost | Lost to competitor: faster time-to-market.","BluePeak"))

        # === Communication/knowledge sources (10 events) ===
        raw_events.append(make_raw("gmail","g1","gmail_1","Q3 Budget Review","Key changes: increased engineering spend 15%, reduced marketing 5%. Review and approve by Friday.","tharu@foundesk.com"))
        raw_events.append(make_raw("gmail","g2","gmail_2","Partnership Agreement Draft","Revenue share 70/30, minimum commitment 12 months, IP remains with both parties.","sarah@acme.com"))
        raw_events.append(make_raw("gmail","g3","gmail_3","Deploy v2.3 to production?","All tests pass. 40% faster queries. Decision: deploy today or wait for security audit?","eng@foundesk.com"))
        raw_events.append(make_raw("slack","s1","slack_1","Blocked on API rate limiting","Stripe API returning 429 errors. Decision: exponential backoff or request higher tier?","alice"))
        raw_events.append(make_raw("slack","s2","slack_2","Customer demo went great","Acme Corp loved the dashboard. Asked for PoC by end of month. $50k ARR potential.","bob"))
        raw_events.append(make_raw("slack","s3","slack_3","Server costs increasing 30%","AWS bill jumped 30% due to ML inference instances. Options: optimize or switch to spot.","dave"))
        raw_events.append(make_raw("notion","n1","notion_1","Product Strategy Q3 2026","Initiatives: Enterprise SSO, Mobile app, API marketplace. Budget $250k. Decision: SSO or mobile first?","tharu"))
        raw_events.append(make_raw("notion","n2","notion_2","Architecture Decision Record","Chose Postgres with partitioning over DynamoDB. Simpler ops, saves ~$800/month.","tharu"))
        raw_events.append(make_raw("google_docs","gd1","gdoc_1","Investor Update July 2026","Revenue grew 22% MoM, 3 new enterprise customers, churn 2.1%.","tharu"))
        raw_events.append(make_raw("google_docs","gd2","gdoc_2","Feature Spec: Teams Integration","Phase 1: notifications (2w), Phase 2: reply/create tasks (4w), Phase 3: sync (6w).","alice"))

        # === Meeting sources (5 events) ===
        raw_events.append(make_raw("google_meet","gm1","gmeet_1","Sprint Planning Week 28","Sprint goal: complete Teams integration API. Capacity: 45 points. Blockers: awaiting design review.","tharu"))
        raw_events.append(make_raw("google_meet","gm2","gmeet_2","Customer Call: Acme Corp PoC Review","Decision: proceed to paid pilot $5k/month. Follow-up: send security questionnaire.","tharu"))
        raw_events.append(make_raw("google_calendar","gc1","gcal_1","Board Meeting Q2 Review","Agenda: Q2 financial review, Q3 strategy, hiring update, cap table.","tharu"))
        raw_events.append(make_raw("google_calendar","gc2","gcal_2","Vendor Negotiation: Cloud Infrastructure","Target: 30% discount on 1-year AWS commit. Current spend $45k/month.","tharu"))
        raw_events.append(make_raw("calendly","c1","cal_1","Calendly: Product Demo Acme Corp","Prospect: Acme Corp, 500 employees, Series C. Interest: enterprise SSO features.","lead@acme.com"))

        # === Analytics (3 events, should be noise-gated) ===
        raw_events.append(make_raw("mixpanel","mp1","mixpanel_1","Dashboard Viewed","User viewed /dashboard. Duration: 45s.","system"))
        raw_events.append(make_raw("amplitude","am1","amplitude_1","User Signed In","User logged in from Chrome on Windows.","system"))
        raw_events.append(make_raw("posthog","ph1","posthog_1","Feature Flag Evaluated","Flag 'new_onboarding' evaluated for user 42. Result: true.","system"))

        for ev in raw_events:
            db.session.add(ev)
        db.session.commit()
        print(f"Seeded {len(raw_events)} RawEvents")

        result = db.session.execute(text("SELECT source, COUNT(*) FROM raw_events GROUP BY source ORDER BY source"))
        print("\n=== RawEvents by source ===")
        for r in result:
            print(f"  {r[0]}: {r[1]}")

        # Run pipeline steps
        print("\n=== Running pipeline ===")
        all_events = RawEvent.query.all()

        # 1. Task tools
        _process_task_tool_events(WS_ID, all_events)
        db.session.commit()
        print("[TASK-TOOLS] done")

        # 2. Decisions (LLM-dependent — may skip if quota exhausted)
        try:
            _llm_infer_decisions(WS_ID, all_events)
            db.session.commit()
        except Exception as e:
            print(f"[DECISIONS] skipped: {e}")
        print("[DECISIONS] done")

        # 3. Meetings (LLM-dependent)
        try:
            _infer_meetings(WS_ID, all_events)
            db.session.commit()
        except Exception as e:
            print(f"[MEETINGS] skipped: {e}")
        print("[MEETINGS] done")

        # 4. Knowledge (LLM-dependent)
        try:
            _infer_knowledge(WS_ID, all_events)
            db.session.commit()
        except Exception as e:
            print(f"[KNOWLEDGE] skipped: {e}")
        print("[KNOWLEDGE] done")

        # 5. Goals (uses existing tasks/decisions)
        try:
            _auto_align_goals(WS_ID)
            db.session.commit()
        except Exception as e:
            print(f"[GOALS] skipped: {e}")
        print("[GOALS] done")

        # 6. Blockers (LLM-dependent + stalled-task rule)
        try:
            _process_blocker_events(WS_ID, all_events)
            db.session.commit()
        except Exception as e:
            print(f"[BLOCKERS] skipped: {e}")
        print("[BLOCKERS] done")

        # 7. Active phase (arithmetic — LLM-free)
        try:
            _compute_active_phase(WS_ID)
            db.session.commit()
        except Exception as e:
            print(f"[PHASE] skipped: {e}")
        print("[PHASE] done")

        print("\n=== Pipeline complete ===")

        # DIAGNOSTIC
        print("\n=== DERIVED RECORDS ===")
        for t in ["raw_events","decision_logs","meeting_notes","knowledge_items","tasks","goals","blockers","follow_ups","standups"]:
            c = db.session.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            print(f"  {t}: {c}")

        print("\n=== TASKS by source ===")
        for r in db.session.execute(text("SELECT source, COUNT(*) FROM tasks WHERE source IS NOT NULL GROUP BY source ORDER BY source")):
            print(f"  {r[0]}: {r[1]}")

        print("\n=== DECISIONS by source (if LLM was available) ===")
        for r in db.session.execute(text("SELECT source, COUNT(*) FROM decision_logs GROUP BY source ORDER BY COUNT(*) DESC")):
            print(f"  {r[0]}: {r[1]}")

        print("\n=== GOALS by type ===")
        for r in db.session.execute(text("SELECT goal_type, COUNT(*) FROM goals GROUP BY goal_type")):
            print(f"  {r[0]}: {r[1]}")

        print("\n=== BLOCKERS ===")
        for r in db.session.execute(text("SELECT title, severity, source FROM blockers LIMIT 10")):
            print(f"  '{r[0][:50]}' | severity={r[1]} | source={r[2]}")

        print("\n=== FOLLOW-UPS ===")
        c = db.session.execute(text("SELECT COUNT(*) FROM follow_ups")).scalar()
        print(f"  Total: {c}")
        if c:
            for r in db.session.execute(text("SELECT title, status FROM follow_ups LIMIT 3")):
                print(f"  '{r[0][:50]}' | status={r[1]}")

        print("\n=== STANDUPS ===")
        for r in db.session.execute(text("SELECT id, title, summary IS NOT NULL AS has_summary, sentiment FROM standups ORDER BY id DESC LIMIT 3")):
            print(f"  id={r[0]} title='{r[1] or 'N/A'}' | has_summary={r[2]} | sentiment={r[3]}")

        print("\n=== ACTIVE PHASE ===")
        for r in db.session.execute(text("SELECT id, name, active_phase FROM workspaces WHERE id=:ws"), {"ws": WS_ID}):
            print(f"  ws={r[0]} '{r[1]}': phase={r[2]}")

        print("\n=== RAW EVENTS status ===")
        for r in db.session.execute(text("SELECT processing_status, COUNT(*) FROM raw_events GROUP BY processing_status ORDER BY processing_status")):
            print(f"  {r[0]}: {r[1]}")

        # Reconciliation
        total_raw = len(raw_events)
        total_derived = sum(
            db.session.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            for t in ["decision_logs","meeting_notes","knowledge_items","tasks","goals","blockers","follow_ups","standups"]
        )
        print(f"\n=== RECONCILIATION ===")
        print(f"  Raw events: {total_raw}")
        print(f"  Total derived: {total_derived}")

if __name__ == "__main__":
    seed()
