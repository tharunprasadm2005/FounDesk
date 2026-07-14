"""Minimal script to insert test data and run meeting inference."""
import os, sys, json
from dotenv import load_dotenv
load_dotenv()
sys.path.insert(0, os.path.abspath('.'))
from datetime import datetime, timedelta

DATABASE_URL = os.environ["DATABASE_URL"]

# === STEP 1: Raw DB operations (no Flask needed) ===
from sqlalchemy import create_engine, text
engine = create_engine(DATABASE_URL)
ws_id = 372
now = datetime.utcnow()

with engine.connect() as conn:
    conn.execute(text("DELETE FROM raw_events WHERE source_id LIKE 'test_%'"))
    conn.commit()

    test_records = [
        {
            "source": "google_meet",
            "source_id": "test_meet_001", "source_ref": "meet_ref_001",
            "event_type": "meeting",
            "occurred_at": now - timedelta(hours=4),
            "raw_payload": json.dumps({
                "title": "Meet: Weekly Product Review",
                "details": "Agenda:\n- Review Q2 metrics\n- Discuss roadmap for Q3\n- Assign action items\n\nDecisions:\n1. Ship the authentication module by July 15\n2. Push back the dashboard redesign to August\n\nAction Items:\n- Alice: Draft the migration plan\n- Bob: Set up the test environment\n\nAttendees: Tharun Prasad, Alice Wang, Bob Chen",
                "actor": "Tharun Prasad"
            }),
            "is_mock": True
        },
        {
            "source": "calendly",
            "source_id": "test_calendly_001", "source_ref": "calendly_ref_001",
            "event_type": "event",
            "occurred_at": now - timedelta(hours=2),
            "raw_payload": json.dumps({
                "title": "Calendly: Product Demo",
                "details": "Product demo for Acme Corp\n\nAgenda:\n1. Overview of the FounDesk platform\n2. Show the Memory module features\n3. Discuss integration options\n\nKey topics: ai_extraction, meeting_notes, integrations\nNext steps: Send follow-up email with pricing",
                "actor": "tharunprasadm2005@gmail.com"
            }),
            "is_mock": True
        },
        {
            "source": "notion",
            "source_id": "test_notion_001", "source_ref": "notion_ref_001",
            "event_type": "page",
            "occurred_at": now - timedelta(hours=6),
            "raw_payload": json.dumps({
                "title": "Engineering Sync — June 27",
                "details": "Attendees: Tharun, Alice, Bob\n\nAgenda:\n- Database optimization status: 70% complete\n- API rate limiting: Design approved\n- Frontend bundle size: Need to reduce by 40%\n\nAction Items:\n- Bob: Run migration script by Monday\n- Alice: Set up monitoring dashboards\n\nFollow-up: Schedule follow-up on Friday",
                "actor": "Tharun Prasad"
            }),
            "is_mock": True
        },
        {
            "source": "google_docs",
            "source_id": "test_doc_001", "source_ref": "doc_ref_001",
            "event_type": "document_edit",
            "occurred_at": now - timedelta(hours=8),
            "raw_payload": json.dumps({
                "title": "Doc: Sprint Planning Meeting — Week 26",
                "details": "Sprint Planning — Week 26\n\nSprint Goal: Ship the Memory module V2\n\nStories:\n- Implement cross-module linking (8 pts)\n- Add follow-up note display (3 pts)\n- Fix content gates for all sources (5 pts)\n\nDecisions made:\n1. Use Qwen for extraction instead of keyword matching\n2. Adopt GitHub Actions for CI/CD\n\nRetro items from last sprint:\n- Improve test coverage\n- Add more logging",
                "actor": "Tharun Prasad"
            }),
            "is_mock": True
        },
        {
            "source": "slack",
            "source_id": "test_slack_001", "source_ref": "slack_ref_001",
            "event_type": "message",
            "occurred_at": now - timedelta(hours=1),
            "raw_payload": json.dumps({
                "title": "New message in #meeting-notes",
                "details": "Meeting recap: Sprint Retro\n\nWhat went well:\n- Cross-module linking works end-to-end\n- Content gate reduces noise by 80%\n\nWhat to improve:\n- Need more test data from Notion and Google Docs\n- Qwen cold start is slow\n\nAction items:\n- Set up automated testing for pipeline\n- Document the source gate logic",
                "actor": "Tharun Prasad"
            }),
            "is_mock": True
        }
    ]

    for rec in test_records:
        conn.execute(text("""
            INSERT INTO raw_events (source, source_id, source_ref, event_type, occurred_at, raw_payload, is_mock, created_at)
            VALUES (:src, :sid, :sref, :etype, :occ, :payload, :mock, :now)
        """), {
            "src": rec["source"],
            "sid": rec["source_id"],
            "sref": rec["source_ref"],
            "etype": rec["event_type"],
            "occ": rec["occurred_at"],
            "payload": rec["raw_payload"],
            "mock": rec["is_mock"],
            "now": now
        })
    conn.commit()
    print(f"Inserted {len(test_records)} test raw_events")

# === STEP 2: Set up Flask + SQLAlchemy properly ===
from flask import Flask
tmp_app = Flask(__name__)
tmp_app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
tmp_app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Must configure db BEFORE importing any models
import config.database as db_mod
db_mod.db.init_app(tmp_app)

# Import ALL models to resolve relationships
import models.goal, models.task, models.decision_log, models.meeting_notes
import models.workspace, models.user

from models.meeting_notes import MeetingNotes

with tmp_app.app_context():
    # Clean old test meeting notes
    test_notes = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == ws_id,
        MeetingNotes.source_event_id.like('test_%')
    ).all()
    for n in test_notes:
        for d in n.linked_decisions:
            db_mod.db.session.delete(d)
        for t in n.linked_tasks:
            db_mod.db.session.delete(t)
        db_mod.db.session.delete(n)
    db_mod.db.session.commit()
    print(f"Cleaned {len(test_notes)} old test meeting notes")

    # Now import pipeline and run inference
    from pattern_engine.models import RawEvent
    import pattern_engine.pipeline as pipe
    
    all_events = RawEvent.query.filter(
        RawEvent.source.in_(['google_meet', 'calendly', 'notion', 'google_docs', 'slack']),
        RawEvent.source_id.like('test_%'),
    ).all()
    print(f"Found {len(all_events)} test raw_events for inference")
    
    if all_events:
        pipe._infer_meetings(ws_id, all_events)
        print("\n=== NEW MEETING NOTES ===")
        cutoff = now - timedelta(minutes=10)
        notes = MeetingNotes.query.filter(
            MeetingNotes.workspace_id == ws_id,
            MeetingNotes.date >= cutoff,
            MeetingNotes.source_integration.in_(['google_meet', 'calendly', 'notion', 'google_docs', 'slack'])
        ).all()
        
        for n in notes:
            decisions = len(n.linked_decisions) if n.linked_decisions else 0
            tasks = len(n.linked_tasks) if n.linked_tasks else 0
            print(f"  ID={n.id:4d} source={n.source_integration:15s} title=\"{n.title[:50]}\" status={n.status:9s} type={n.meeting_type:15s} decisions={decisions} tasks={tasks}")
        
        if not notes:
            print("No meeting notes created. Debugging gates...")
            for ev in all_events:
                payload = ev.raw_payload
                if isinstance(payload, str):
                    try: payload = json.loads(payload)
                    except: continue
                title = payload.get('title', '')
                details = payload.get('details', '')
                src = ev.source
                tl = title.lower()
                print(f"\n[{src}] title=\"{title[:50]}\"")
                print(f"  In MEETING_VALID_SOURCES: {src in pipe.MEETING_VALID_SOURCES}")
                if src in ('notion', 'google_docs'):
                    matched = [k for k in pipe.MEETING_KEYWORDS_FOR_NOTION_DOCS if k in tl]
                    print(f"  Keyword matched: {matched}")
                print(f"  details len={len(details)} >=80? {len(details)>=80}")
                matched_skip = [k for k in pipe.MEETING_SKIP_TITLE_PATTERNS if k in tl]
                print(f"  skip patterns: {matched_skip}")
                if src == 'calendly':
                    print(f"  URL-only? {'calendly.com' in details}")
                if src == 'slack':
                    ch = title.replace('New message in #','').lower()
                    print(f"  channel='{ch}' recap_channel={any(p in ch for p in ['meeting','recap','standup','sync','call-notes','daily'])}")
                    print(f"  recap_message={details.lower().startswith('meeting recap:')}")
    else:
        print("No test raw_events found!")

print("\nDone!")
