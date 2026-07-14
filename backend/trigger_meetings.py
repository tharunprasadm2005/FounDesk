"""Delete keyword-fallback notes and re-run with Qwen extraction."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
assert os.environ.get('DATABASE_URL'), "Set DATABASE_URL env var (e.g. via .env or export)"

from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from config.database import db, init_db

app = Flask(__name__)
init_db(app)
app.config['SECRET_KEY'] = os.getenv("SECRET_KEY")

from models.user import User
from models.follow_up import FollowUp
from models.phase_template import PhaseTemplate, PhaseTemplateGoal, PhaseTemplateTask
from pattern_engine.models import RawEvent, LLMUsageLog, PatternCorrection
from pattern_engine.pipeline import _infer_meetings
from models.meeting_notes import MeetingNotes
from models.task import Task
from models.decision_log import DecisionLog
from models.blocker import Blocker
from models.workspace import Workspace
from models.standup import Standup
from models.knowledge_item import KnowledgeItem
from models.chronicle_event import ChronicleEvent
from models.activity_event import ActivityEvent
from models.goal import Goal

with app.app_context():
    workspace_id = 372
    
    # Delete keyword-fallback notes (source_integration not google_calendar and not None)
    notes_to_delete = MeetingNotes.query.filter(
        MeetingNotes.workspace_id == workspace_id,
        MeetingNotes.source_integration != 'google_calendar',
        MeetingNotes.source_integration.isnot(None),
        MeetingNotes.meeting_type == 'other',  # keyword-created notes
        MeetingNotes.follow_up_needed == False,  # no structured data
    ).all()
    
    if not notes_to_delete:
        # Fallback: delete notes with source not google_calendar and created recently
        from datetime import datetime, timedelta
        notes_to_delete = MeetingNotes.query.filter(
            MeetingNotes.workspace_id == workspace_id,
            MeetingNotes.source_integration != 'google_calendar',
            MeetingNotes.source_integration.isnot(None),
            MeetingNotes.created_at >= datetime.utcnow() - timedelta(hours=1)
        ).all()
    
    print(f"Deleting {len(notes_to_delete)} keyword-fallback notes:")
    for n in notes_to_delete:
        print(f"  id={n.id} source={n.source_integration} title={n.title[:50]}")
        db.session.delete(n)
    
    if notes_to_delete:
        db.session.commit()
        print("Deleted.")
    
    # Count remaining
    remaining = MeetingNotes.query.filter_by(workspace_id=workspace_id).count()
    print(f"\nRemaining meeting notes: {remaining}")
    for n in MeetingNotes.query.filter_by(workspace_id=workspace_id).order_by(MeetingNotes.id).all():
        print(f"  id={n.id} source={n.source_integration} title={n.title[:50]}")
    
    # Now run with LLM enabled
    print("\n=== Running _infer_meetings with Qwen extraction ===")
    all_events = RawEvent.query.all()
    _infer_meetings(workspace_id, all_events)
    
    # Check results
    after = MeetingNotes.query.filter_by(workspace_id=workspace_id).count()
    print(f"\n=== RESULTS ===")
    print(f"After Qwen inference: {after} notes")
    
    from collections import Counter
    by_source = Counter(n.source_integration or 'None' for n in MeetingNotes.query.filter_by(workspace_id=workspace_id).all())
    print("By source_integration:", dict(by_source))
    
    new_notes = MeetingNotes.query.filter_by(workspace_id=workspace_id).order_by(MeetingNotes.id.desc()).limit(25).all()
    print("\nLatest notes (newest first):")
    for n in new_notes:
        print(f"  id={n.id} source={n.source_integration} title={n.title[:50]} status={n.status} type={n.meeting_type}")
        if n.linked_decisions:
            print(f"    Decisions linked: {len(n.linked_decisions)}")
        if n.linked_tasks:
            print(f"    Tasks linked: {len(n.linked_tasks)}")
        if n.follow_up_needed and n.follow_up_note:
            print(f"    Follow-up: {n.follow_up_note[:60]}")
