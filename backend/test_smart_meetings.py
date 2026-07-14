import unittest
from datetime import datetime
from unittest.mock import patch
from app import app, db
from models.user import User
from models.workspace import Workspace
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from services.google_service import (
    extract_meet_link,
    classify_event,
    detect_priority,
    get_normalized_calendar_events
)
from services.activity_compiler import compile_activity_feed

class TestSmartMeetings(unittest.TestCase):
    def setUp(self):
        self.app_context = app.app_context()
        self.app_context.push()
        
        # Clear database
        ActivityEvent.query.delete()
        UserIntegration.query.delete()
        Workspace.query.delete()
        User.query.delete()
        db.session.commit()
        
        # Seed user & workspace
        self.user = User(email="meet_founder@foundesk.com", name="Meet Founder", google_id="meet_mock_founder")
        db.session.add(self.user)
        db.session.commit()
        
        self.workspace = Workspace(name="Meet Test Workspace", creator_id=self.user.id)
        db.session.add(self.workspace)
        db.session.commit()

    def tearDown(self):
        ActivityEvent.query.delete()
        UserIntegration.query.delete()
        Workspace.query.delete()
        User.query.delete()
        db.session.commit()
        self.app_context.pop()

    def test_extract_meet_link(self):
        # Case 1: Meet link via conferenceData
        event_conf = {
            "conferenceData": {
                "entryPoints": [
                    {"entryPointType": "video", "uri": "https://meet.google.com/abc-defg-hij"}
                ]
            }
        }
        self.assertEqual(extract_meet_link(event_conf), "https://meet.google.com/abc-defg-hij")
        
        # Case 2: Meet link via hangoutLink
        event_hangout = {
            "hangoutLink": "https://meet.google.com/xyz-pdq-rst"
        }
        self.assertEqual(extract_meet_link(event_hangout), "https://meet.google.com/xyz-pdq-rst")
        
        # Case 3: No meeting link
        event_none = {
            "description": "Just a normal lunch sync"
        }
        self.assertIsNone(extract_meet_link(event_none))

    def test_classify_event(self):
        event_meeting = {
            "hangoutLink": "https://meet.google.com/xyz-pdq-rst"
        }
        event_cal = {
            "description": "Lunch with cofounder"
        }
        self.assertEqual(classify_event(event_meeting), "meeting")
        self.assertEqual(classify_event(event_cal), "calendar_event")

    def test_detect_priority(self):
        high_cases = [
            {"summary": "Urgent investor review"},
            {"summary": "client feedback sync"},
            {"summary": "Seed Demo prep"},
            {"summary": "Meet with prospective investors"}
        ]
        normal_cases = [
            {"summary": "Weekly team standup"},
            {"summary": "Lunch break"},
            {"summary": "Internal code cleanup"}
        ]
        
        for case in high_cases:
            self.assertEqual(detect_priority(case), "high", f"Expected high for: {case['summary']}")
            
        for case in normal_cases:
            self.assertEqual(detect_priority(case), "normal", f"Expected normal for: {case['summary']}")

    @patch("services.google_service.requests.get")
    def test_get_normalized_calendar_events(self, mock_get):
        # Mock successful Google Calendar response
        mock_response = unittest.mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "items": [
                {
                    "id": "evt1",
                    "summary": "Urgent Client Demo",
                    "description": "Discussing production build errors.",
                    "status": "confirmed",
                    "start": {"dateTime": "2026-06-17T15:00:00Z"},
                    "attendees": [{"email": "client@company.com"}, {"email": "meet_founder@foundesk.com", "self": True}],
                    "hangoutLink": "https://meet.google.com/abc-defg-hij"
                },
                {
                    "id": "evt2",
                    "summary": "Focus Block",
                    "description": "No meetings",
                    "status": "confirmed",
                    "start": {"date": "2026-06-18"},
                    "attendees": []
                }
            ]
        }
        mock_get.return_value = mock_response
        
        events = get_normalized_calendar_events("fake_token")
        self.assertEqual(len(events), 2)
        
        # Check first event (Meeting & High priority)
        e1 = events[0]
        self.assertEqual(e1["type"], "meeting")
        self.assertEqual(e1["priority"], "high")
        self.assertEqual(e1["actor"], "client@company.com")
        self.assertEqual(e1["content"], "https://meet.google.com/abc-defg-hij")
        
        # Check second event (Calendar Event & Normal priority)
        e2 = events[1]
        self.assertEqual(e2["type"], "calendar_event")
        self.assertEqual(e2["priority"], "normal")
        self.assertEqual(e2["actor"], "Solo")
        self.assertEqual(e2["content"], "No meetings")

    @patch("services.google_service.get_normalized_calendar_events")
    def test_compile_activity_feed_smart_meetings(self, mock_get_normalized):
        # Create Google Workspace integration
        integration = UserIntegration(
            user_id=self.user.id,
            provider="google",
            access_token="real_google_access_token_abc"
        )
        db.session.add(integration)
        db.session.commit()
        
        # Mock normalized events
        mock_get_normalized.return_value = [
            {
                "type": "meeting",
                "source": "google_calendar",
                "actor": "investor@sequoiacap.com",
                "title": "Investor Pitch Sync",
                "content": "https://meet.google.com/investor-meet",
                "timestamp": "2026-06-17T18:00:00Z",
                "priority": "high",
                "status": "confirmed",
                "raw_ref": "google_meet_pitch_1"
            },
            {
                "type": "calendar_event",
                "source": "google_calendar",
                "actor": "Solo",
                "title": "Review pricing options",
                "content": "Write docs.",
                "timestamp": "2026-06-18T10:00:00Z",
                "priority": "normal",
                "status": "confirmed",
                "raw_ref": "google_cal_pricing_2"
            }
        ]
        
        # Run compile
        compiled = compile_activity_feed(self.workspace.id)
        self.assertEqual(len(compiled), 2)
        
        # Verify stored records in database
        db_events = ActivityEvent.query.filter_by(workspace_id=self.workspace.id, provider="google_calendar").all()
        self.assertEqual(len(db_events), 2)
        
        pitch_evt = next(e for e in db_events if e.raw_ref == "google_meet_pitch_1")
        self.assertEqual(pitch_evt.activity_type, "meeting")
        self.assertEqual(pitch_evt.priority, "high")
        self.assertEqual(pitch_evt.details, "https://meet.google.com/investor-meet")
        self.assertEqual(pitch_evt.actor, "investor@sequoiacap.com")
        
        pricing_evt = next(e for e in db_events if e.raw_ref == "google_cal_pricing_2")
        self.assertEqual(pricing_evt.activity_type, "calendar_event")
        self.assertEqual(pricing_evt.priority, "normal")
        self.assertEqual(pricing_evt.details, "Write docs.")

if __name__ == "__main__":
    unittest.main()
