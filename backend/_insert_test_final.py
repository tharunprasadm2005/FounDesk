"""Insert test raw_events and run meeting inference without triggering app scheduler."""
import os, sys, json
sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv; load_dotenv()
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

ws_id = 372
now = datetime.utcnow()

# Delete old test raw_events via raw engine
with engine.connect() as conn:
    conn.execute(text("DELETE FROM raw_events WHERE source_id LIKE 'test_%'"))
    conn.commit()

# Import ALL models in correct order
from flask import Flask
from config.database import db, init_db
from models.goal import Goal
from models.task import Task
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from models.workspace import Workspace
from models.user import User

tmp_app = Flask(__name__)
init_db(tmp_app)

with tmp_app.app_context():
    # Clean up old meeting notes
    test_notes = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == ws_id,
        MeetingNotes.source_event_id.like('test_%')
    ).all()
    for n in test_notes:
        for d in n.linked_decisions:
            db.session.delete(d)
        for t in n.linked_tasks:
            db.session.delete(t)
        db.session.delete(n)
    db.session.commit()

# Insert test data
with engine.connect() as conn:
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
    print("Test raw_events inserted!")

# Now run meeting inference
with tmp_app.app_context():
    from pattern_engine.models import RawEvent
    import pattern_engine.pipeline as pipe

    all_events = RawEvent.query.filter(
        RawEvent.source.in_(['google_meet', 'calendly', 'notion', 'google_docs', 'slack']),
        RawEvent.source_id.like('test_%'),
    ).all()
    print(f"Found {len(all_events)} test raw_events")

    for ev in all_events:
        p = ev.raw_payload
        if isinstance(p, str):
            try:
                p = json.loads(p)
            except:
                pass
        if isinstance(p, dict):
            print(f"  RawEvent ID={ev.id} src={ev.source} title=\"{p.get('title','N/A')[:60]}\" details_len={len(str(p.get('details','')))}")

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
            print(f"  ID={n.id} source={n.source_integration:15s} title=\"{n.title[:50]}\" status={n.status} type={n.meeting_type:15s} decisions={decisions} tasks={tasks}")

        if not notes:
            print("  No meeting notes created. Checking gates...")
            for ev in all_events:
                p = ev.raw_payload
                if isinstance(p, str):
                    try: p = json.loads(p)
                    except: pass
                if isinstance(p, dict):
                    title = p.get('title', '')
                    details = p.get('details', '')
                    src = ev.source
                    title_lower = title.lower()
                    print(f"\n  {src}: title=\"{title[:60]}\"")
                    print(f"    In MEETING_VALID_SOURCES? {src in pipe.MEETING_VALID_SOURCES}")
                    if src in ('notion', 'google_docs'):
                        kw_match = any(kw in title_lower for kw in pipe.MEETING_KEYWORDS_FOR_NOTION_DOCS)
                        print(f"    Keyword match? {kw_match} (keywords: {[k for k in pipe.MEETING_KEYWORDS_FOR_NOTION_DOCS if k in title_lower]})")
                    print(f"    len(details)>=80? {len(details) >= 80} (actual: {len(details)})")
                    skip_match = [pat for pat in pipe.MEETING_SKIP_TITLE_PATTERNS if pat in title_lower]
                    print(f"    Skip patterns matched? {skip_match if skip_match else 'none'}")
                    if src == 'calendly':
                        print(f"    Calendly URL-only? {'calendly.com' in details}")
                    if src == 'slack':
                        channel = title.replace('New message in #','').lower()
                        recap_ch = any(pat in channel for pat in ['meeting','recap','standup','sync','call-notes','daily'])
                        recap_msg = details.lower().startswith('meeting recap:') or details.lower().startswith('standup:') or details.lower().startswith('call summary:')
                        print(f"    Slack recap channel? {recap_ch} (channel: {channel})")
                        print(f"    Slack recap message? {recap_msg}")
    else:
        print("No test raw_events found!")

    print("\nDone!")
