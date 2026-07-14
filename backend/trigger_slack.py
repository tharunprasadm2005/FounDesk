"""Quick re-run with keyword-only to re-create slack note with improved title."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
assert os.environ.get('DATABASE_URL'), "Set DATABASE_URL env var (e.g. via .env or export)"
os.environ['LLM_DAILY_LIMIT'] = '0'

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
from pattern_engine.models import RawEvent
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
    ws = 372
    before = MeetingNotes.query.filter_by(workspace_id=ws).count()
    all_events = RawEvent.query.all()
    _infer_meetings(ws, all_events)
    after = MeetingNotes.query.filter_by(workspace_id=ws).count()
    print(f"Created: {after - before}")
    
    from collections import Counter
    by_source = Counter(n.source_integration or 'None' for n in MeetingNotes.query.filter_by(workspace_id=ws).all())
    print("By source:", dict(by_source))
    
    for n in MeetingNotes.query.filter_by(workspace_id=ws, source_integration='slack').all():
        print(f"Slack: id={n.id} title={n.title[:50]} type={n.meeting_type}")
