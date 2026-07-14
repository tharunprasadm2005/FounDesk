import os, sys
sys.path.insert(0, os.path.abspath('.'))
from app import app
from config.database import db
from datetime import datetime, timedelta
from models.meeting_notes import MeetingNotes

with app.app_context():
    ws_id = 372
    owner_user_id = 635  # workspace creator
    conn = db.engine.connect()

    # Delete old test records (raw_ref prefixed with test_ or meet_test_ etc)
    print("Clearing old test activity_events...")
    conn.execute(db.text("""
        DELETE FROM activity_events 
        WHERE workspace_id = :ws 
        AND raw_ref IN ('meet_test_weekly_review', 'calendly_test_product_demo', 'notion_test_eng_sync', 
                        'docs_test_sprint_planning', 'slack_test_meeting_recap')
    """), {"ws": ws_id})
    conn.commit()
    print("  Done")

    # Also clear any meeting_notes that were created from these test events
    test_titles = [
        "Meet: Weekly Product Review",
        "Calendly: Product Demo", 
        "Engineering Sync — June 27",
        "Doc: Sprint Planning Meeting — Week 26",
        "New message in #meeting-notes"
    ]
    for title in test_titles:
        notes = MeetingNotes.query.filter_by(title=title).all()
        for n in notes:
            # Delete linked decisions and tasks
            for d in n.linked_decisions:
                db.session.delete(d)
            for t in n.linked_tasks:
                db.session.delete(t)
            db.session.delete(n)
    db.session.commit()
    print("Cleared old meeting notes and linked records")

    # Now insert fresh test records
    print("\nInserting test records...")
    now = datetime.utcnow()

    tests = [
        {
            "provider": "google_meet",
            "category": "calendar",
            "actor": "Tharun Prasad",
            "title": "Meet: Weekly Product Review",
            "activity_type": "meeting",
            "status": "confirmed",
            "ts": now - timedelta(hours=4),
            "details": "Agenda:\n- Review Q2 metrics\n- Discuss roadmap for Q3\n- Assign action items\n\nDecisions:\n1. Ship the authentication module by July 15\n2. Push back the dashboard redesign to August\n\nAction Items:\n- Alice: Draft the migration plan\n- Bob: Set up the test environment\n\nAttendees: Tharun Prasad, Alice Wang, Bob Chen",
            "raw_ref": "meet_test_weekly_review",
        },
        {
            "provider": "calendly",
            "category": "calendar",
            "actor": "tharunprasadm2005@gmail.com",
            "title": "Calendly: Product Demo",
            "activity_type": "event",
            "status": "Scheduled",
            "ts": now - timedelta(hours=2),
            "details": "Product demo for Acme Corp\n\nAgenda:\n1. Overview of the FounDesk platform\n2. Show the Memory module features\n3. Discuss integration options\n\nKey topics: ai_extraction, meeting_notes, integrations\nNext steps: Send follow-up email with pricing",
            "raw_ref": "calendly_test_product_demo",
        },
        {
            "provider": "notion",
            "category": "docs_tasks_wikis",
            "actor": "Tharun Prasad",
            "title": "Engineering Sync — June 27",
            "activity_type": "page",
            "status": "published",
            "ts": now - timedelta(hours=6),
            "details": "Attendees: Tharun, Alice, Bob\n\nAgenda:\n- Database optimization status: 70% complete\n- API rate limiting: Design approved\n- Frontend bundle size: Need to reduce by 40%\n\nAction Items:\n- Bob: Run migration script by Monday\n- Alice: Set up monitoring dashboards\n\nFollow-up: Schedule follow-up on Friday",
            "raw_ref": "notion_test_eng_sync",
        },
        {
            "provider": "google_docs",
            "category": "docs_tasks_wikis",
            "actor": "Tharun Prasad",
            "title": "Doc: Sprint Planning Meeting — Week 26",
            "activity_type": "document_edit",
            "status": "Active",
            "ts": now - timedelta(hours=8),
            "details": "Sprint Planning — Week 26\n\nSprint Goal: Ship the Memory module V2\n\nStories:\n- Implement cross-module linking (8 pts)\n- Add follow-up note display (3 pts)\n- Fix content gates for all sources (5 pts)\n\nDecisions made:\n1. Use Qwen for extraction instead of keyword matching\n2. Adopt GitHub Actions for CI/CD\n\nRetro items from last sprint:\n- Improve test coverage\n- Add more logging",
            "raw_ref": "docs_test_sprint_planning",
        },
        {
            "provider": "slack",
            "category": "communication",
            "actor": "Tharun Prasad",
            "title": "New message in #meeting-notes",
            "activity_type": "message",
            "status": "unread",
            "ts": now - timedelta(hours=1),
            "details": "Meeting recap: Sprint Retro\n\nWhat went well:\n- Cross-module linking works end-to-end\n- Content gate reduces noise by 80%\n\nWhat to improve:\n- Need more test data from Notion and Google Docs\n- Qwen cold start is slow\n\nAction items:\n- Set up automated testing for pipeline\n- Document the source gate logic",
            "raw_ref": "slack_test_meeting_recap",
        }
    ]

    for t in tests:
        # Use raw SQL via connection
        result = conn.execute(db.text("""
            INSERT INTO activity_events 
                (workspace_id, provider, category, actor, title, activity_type, status, external_timestamp, details, raw_ref, is_mock, fetched_at, priority)
            VALUES 
                (:ws, :provider, :category, :actor, :title, :activity_type, :status, :ts, :details, :raw_ref, :mock, :fetched, :priority)
            ON CONFLICT ON CONSTRAINT uq_workspace_provider_raw_ref DO NOTHING
            RETURNING id
        """), {
            "ws": ws_id,
            "provider": t["provider"],
            "category": t["category"],
            "actor": t["actor"],
            "title": t["title"],
            "activity_type": t["activity_type"],
            "status": t["status"],
            "ts": t["ts"],
            "details": t["details"],
            "raw_ref": t["raw_ref"],
            "mock": True,
            "fetched": now,
            "priority": "normal"
        })
        row = result.fetchone()
        if row:
            print(f"  Inserted {t['provider']}: ID={row[0]}")
        else:
            print(f"  Skipped {t['provider']} (already exists)")

    conn.commit()
    print("\nTest records inserted. Now running compile + pipeline...")

    # Run compile activity feed (only for ws 372)
    from services.activity_compiler import compile_activity_feed
    print("\n--- Compiling activity feed for ws 372 ---")
    compile_activity_feed(ws_id)

    # Convert activity_events to raw_events for our target sources
    print("\n--- Converting to raw_events ---")
    from pattern_engine.pipeline import _fetch_raw_events
    target_providers = ['google_meet', 'calendly', 'notion', 'google_docs', 'slack']
    raw_events = _fetch_raw_events(target_providers, ws_id)
    print(f"Created {len(raw_events)} new raw_events for target sources")

    # Also fetch any existing unprocessed raw_events for these sources
    from pattern_engine.models import RawEvent
    all_events = list(raw_events)
    unprocessed = RawEvent.query.filter(
        RawEvent.source.in_(target_providers),
        RawEvent.processed_at.is_(None),
        ~RawEvent.id.in_([r.id for r in raw_events]),
    ).all()
    all_events.extend(unprocessed)
    print(f"Total raw_events for target sources: {len(all_events)}")

    print("\n--- Running meeting inference ---")
    from pattern_engine.pipeline import _infer_meetings
    _infer_meetings(ws_id, all_events)
    print(f"\nPipeline result: {result}")

    # Check what was created
    print("\n=== NEW MEETING NOTES ===")
    cutoff = now - timedelta(minutes=10)
    notes = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == ws_id,
        MeetingNotes.date >= cutoff
    ).all()
    for n in notes:
        linked_decisions = len(n.linked_decisions) if n.linked_decisions else 0
        linked_tasks = len(n.linked_tasks) if n.linked_tasks else 0
        print(f"  ID={n.id} \"{n.title[:60]}\" source={n.source_integration} status={n.status} type={n.meeting_type} decisions={linked_decisions} tasks={linked_tasks}")

    conn.close()
