import os, sys
sys.path.insert(0, os.path.abspath('.'))
from app import app
from config.database import db
from datetime import datetime, timedelta
import json

with app.app_context():
    conn = db.engine.connect()
    ws_id = 372
    now = datetime.utcnow()

    tests = []

    # 1. google_meet — meeting with transcript-like content
    tests.append({
        "provider": "google_meet",
        "category": "calendar",
        "actor": "Tharun Prasad",
        "title": "Meet: Weekly Product Review",
        "activity_type": "meeting",
        "status": "confirmed",
        "external_timestamp": now - timedelta(hours=4),
        "details": "📹 Google Meet: https://meet.google.com/abc-defg-hij\n\nAgenda:\n- Review Q2 metrics\n- Discuss roadmap for Q3\n- Assign action items\n\nDecisions:\n1. Ship the authentication module by July 15\n2. Push back the dashboard redesign to August\n\nAction Items:\n- Alice: Draft the migration plan\n- Bob: Set up the test environment\n\nAttendees: Tharun Prasad, Alice Wang, Bob Chen",
        "raw_ref": "meet_test_weekly_review",
        "is_mock": True,
        "workspace_id": ws_id
    })

    # 2. calendly — with meeting agenda content (not just URL)
    tests.append({
        "provider": "calendly",
        "category": "calendar",
        "actor": "tharunprasadm2005@gmail.com",
        "title": "Calendly: Product Demo",
        "activity_type": "event",
        "status": "Scheduled",
        "external_timestamp": now - timedelta(hours=2),
        "details": "Product demo for Acme Corp\n\nAgenda:\n1. Overview of the FounDesk platform\n2. Show the Memory module features\n3. Discuss integration options\n\nKey topics: ai_extraction, meeting_notes, integrations\nNext steps: Send follow-up email with pricing",
        "raw_ref": "calendly_test_product_demo",
        "is_mock": True,
        "workspace_id": ws_id
    })

    # 3. notion — meeting notes page with keywords
    tests.append({
        "provider": "notion",
        "category": "docs_tasks_wikis",
        "actor": "Tharun Prasad",
        "title": "Engineering Sync — June 27",
        "activity_type": "page",
        "status": "published",
        "external_timestamp": now - timedelta(hours=6),
        "details": "Attendees: Tharun, Alice, Bob\n\nAgenda:\n- Database optimization status: 70% complete\n- API rate limiting: Design approved\n- Frontend bundle size: Need to reduce by 40%\n\nAction Items:\n- Bob: Run migration script by Monday\n- Alice: Set up monitoring dashboards\n\nFollow-up: Schedule follow-up on Friday",
        "raw_ref": "notion_test_eng_sync",
        "is_mock": True,
        "workspace_id": ws_id
    })

    # 4. google_docs — meeting notes doc with keywords
    tests.append({
        "provider": "google_docs",
        "category": "docs_tasks_wikis",
        "actor": "Tharun Prasad",
        "title": "Doc: Sprint Planning Meeting — Week 26",
        "activity_type": "document_edit",
        "status": "Active",
        "external_timestamp": now - timedelta(hours=8),
        "details": "Sprint Planning — Week 26\n\nSprint Goal: Ship the Memory module V2\n\nStories:\n- Implement cross-module linking (8 pts)\n- Add follow-up note display (3 pts)\n- Fix content gates for all sources (5 pts)\n\nDecisions made:\n1. Use Qwen for extraction instead of keyword matching\n2. Adopt GitHub Actions for CI/CD\n\nRetro items from last sprint:\n- Improve test coverage\n- Add more logging",
        "raw_ref": "docs_test_sprint_planning",
        "is_mock": True,
        "workspace_id": ws_id
    })

    # 5. slack — message in a meeting-recap channel
    tests.append({
        "provider": "slack",
        "category": "communication",
        "actor": "Tharun Prasad",
        "title": "New message in #meeting-notes",
        "activity_type": "message",
        "status": "unread",
        "external_timestamp": now - timedelta(hours=1),
        "details": "Meeting recap: Sprint Retro\n\nWhat went well:\n- Cross-module linking works end-to-end\n- Content gate reduces noise by 80%\n\nWhat to improve:\n- Need more test data from Notion and Google Docs\n- Qwen cold start is slow\n\nAction items:\n- Set up automated testing for pipeline\n- Document the source gate logic",
        "raw_ref": "slack_test_meeting_recap",
        "is_mock": True,
        "workspace_id": ws_id
    })

    # Insert test records into activity_events
    inserted_count = 0
    for t in tests:
        ts = t["external_timestamp"]
        result = conn.execute(db.text("""
            INSERT INTO activity_events 
                (workspace_id, provider, category, actor, title, activity_type, status, external_timestamp, details, raw_ref, is_mock, fetched_at, priority)
            VALUES 
                (:ws, :provider, :category, :actor, :title, :activity_type, :status, :ts, :details, :raw_ref, :mock, :fetched, :priority)
            ON CONFLICT ON CONSTRAINT uq_workspace_provider_raw_ref DO NOTHING
            RETURNING id
        """), {
            "ws": t["workspace_id"],
            "provider": t["provider"],
            "category": t["category"],
            "actor": t["actor"],
            "title": t["title"],
            "activity_type": t["activity_type"],
            "status": t["status"],
            "ts": ts,
            "details": t["details"],
            "raw_ref": t["raw_ref"],
            "mock": t["is_mock"],
            "fetched": now,
            "priority": "normal"
        })
        # Check if row was inserted
        row = result.fetchone()
        if row:
            inserted_count += 1
            print(f"  Inserted {t['provider']}: ID={row[0]}")
        else:
            print(f"  Skipped {t['provider']} (already exists)")

    conn.commit()
    print(f"\nInserted {inserted_count} test records")

    # Now run the pipeline
    print("\n=== RUNNING PIPELINE ===")
    from pattern_engine.pipeline import run_for_workspace
    result = run_for_workspace(1, ws_id)
    print(f"Pipeline result: {result}")

    # Check what was created
    print("\n=== NEW MEETING NOTES ===")
    from models.meeting_notes import MeetingNotes
    notes = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == ws_id,
        MeetingNotes.created_at >= now - timedelta(minutes=5)
    ).all()
    for n in notes:
        print(f"  ID={n.id} title=\"{n.title}\" source={n.source_integration} status={n.status} meeting_type={n.meeting_type}")
        if n.linked_decisions:
            print(f"    Decisions linked: {len(n.linked_decisions)}")
        if n.linked_tasks:
            print(f"    Tasks linked: {len(n.linked_tasks)}")

    conn.close()
