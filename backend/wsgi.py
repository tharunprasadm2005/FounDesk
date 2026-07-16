from app import app
from config.database import db

# Import all models so db.create_all() knows about them
from models.user import User
from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from models.follow_up import FollowUp
from models.knowledge_item import KnowledgeItem
from models.blocker import Blocker
from models.standup import Standup
from models.chronicle_event import ChronicleEvent
from models.activity_event import ActivityEvent
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.user_integration import UserIntegration
from models.api_key import ApiKey
from models.notification_preference import NotificationPreference, InAppNotification
from models.error_log import ErrorLog
from pattern_engine.models import RawEvent, LLMUsageLog, ProviderUsage, PipelineLock, PatternCorrection

with app.app_context():
    try:
        db.create_all()
        print("Tables created/verified successfully")
    except Exception as e:
        print(f"Table creation skipped: {e}")

if __name__ == "__main__":
    app.run()
