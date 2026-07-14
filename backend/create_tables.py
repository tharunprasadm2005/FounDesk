import os
import sys

# Add the backend directory to path if needed
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import app
from config.database import db
from models.user import User
from models.goal import Goal
from models.task import Task
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from models.follow_up import FollowUp
from models.waitlist import Waitlist
from models.notification_preference import NotificationPreference, InAppNotification

def create():
    with app.app_context():
        print("Creating PostgreSQL tables for FounDesk...")
        try:
            db.create_all()
            print("Successfully created all tables!")
        except Exception as e:
            print(f"Error creating tables: {e}")

if __name__ == "__main__":
    create()
