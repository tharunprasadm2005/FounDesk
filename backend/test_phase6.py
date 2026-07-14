import os
import sys
import jwt
from datetime import datetime, timedelta

# Add current directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import app
from config.database import db
from models.user import User
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.chronicle_event import ChronicleEvent
from models.dismissed_calendar_alert import DismissedCalendarAlert
from models.meeting_notes import MeetingNotes
from models.user_integration import UserIntegration

def make_token(user):
    return jwt.encode({
        "user_id": user.id,
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=1)
    }, app.config['SECRET_KEY'], algorithm="HS256")

def run_tests():
    print("====================================================")
    print("Running FounDesk Phase 6 (Deferred Features) Verification Suite")
    print("====================================================\n")

    with app.test_client() as client:
        with app.app_context():
            # Seed test user
            founder = User.query.filter_by(email="p6_founder@foundesk.com").first()
            if not founder:
                founder = User(email="p6_founder@foundesk.com", name="P6 Founder", google_id="p6_mock_founder")
                db.session.add(founder)
                db.session.commit()

            # Generate headers
            headers = {
                "Authorization": f"Bearer {make_token(founder)}"
            }

            # ------------------------------------------------------------------
            # Test 1: Workspace creation triggers a founder 'team_joined' chronicle event
            # ------------------------------------------------------------------
            print("Test 1: Workspace creation triggers founder 'team_joined' chronicle event...")
            # Create a workspace via the API
            ws_res = client.post(
                "/api/workspaces",
                json={"name": "Phase 6 Chronicle Test Workspace", "stage": "Launch"},
                headers=headers
            )
            assert ws_res.status_code == 201
            ws_data = ws_res.get_json()
            workspace_id = ws_data["id"]

            # Query chronicle events
            events = ChronicleEvent.query.filter_by(workspace_id=workspace_id).all()
            assert len(events) == 1
            assert events[0].event_type == "team_joined"
            assert "Founder Joined Workspace" in events[0].title
            assert "created the workspace as Founder" in events[0].description
            print("   PASS: Founder join chronicle event created.")

            # Create member to accept invites
            member_user = User.query.filter_by(email="p6_member@foundesk.com").first()
            if not member_user:
                member_user = User(email="p6_member@foundesk.com", name="P6 Member", google_id="p6_mock_member")
                db.session.add(member_user)
                db.session.commit()

            # ------------------------------------------------------------------
            # Test 2: Inviting and accepting member triggers a 'team_joined' chronicle event
            # ------------------------------------------------------------------
            print("\nTest 2: Accepting member triggers 'team_joined' chronicle event...")
            # Invite the user
            ws_headers = {
                "Authorization": f"Bearer {make_token(founder)}",
                "X-Workspace-Id": str(workspace_id)
            }
            invite_res = client.post(
                f"/api/workspaces/{workspace_id}/invite",
                json={"email": "p6_member@foundesk.com", "role": "member"},
                headers=ws_headers
            )
            assert invite_res.status_code == 201
            invite_data = invite_res.get_json()
            member_id = invite_data["id"]

            # Accept invite
            member_headers = {
                "Authorization": f"Bearer {make_token(member_user)}"
            }
            accept_res = client.post(
                f"/api/workspaces/invites/{member_id}/accept",
                headers=member_headers
            )
            assert accept_res.status_code == 200

            # Verify chronicle has team_joined for member
            te_join = ChronicleEvent.query.filter_by(workspace_id=workspace_id, event_type="team_joined").all()
            assert len(te_join) == 2 # Founder and Member
            member_evt = next(e for e in te_join if "Team Member Joined" in e.title)
            assert "joined the workspace as member" in member_evt.description
            print("   PASS: Team member join chronicle event created.")

            # ------------------------------------------------------------------
            # Test 3: Removing member triggers a 'team_left' chronicle event
            # ------------------------------------------------------------------
            print("\nTest 3: Removing member triggers 'team_left' chronicle event...")
            remove_res = client.delete(
                f"/api/workspaces/{workspace_id}/members/{member_id}",
                headers=ws_headers
            )
            assert remove_res.status_code == 200

            # Verify chronicle has team_left
            te_left = ChronicleEvent.query.filter_by(workspace_id=workspace_id, event_type="team_left").all()
            assert len(te_left) == 1
            assert "Team Member Departed" in te_left[0].title
            assert "left the workspace" in te_left[0].description
            print("   PASS: Team member departure chronicle event created.")

            # Verify GET /api/chronicle returns these formatted correctly
            chron_res = client.get(
                "/api/chronicle",
                headers=ws_headers
            )
            assert chron_res.status_code == 200
            chron_data = chron_res.get_json()
            events_timeline = chron_data["events"]
            assert len(events_timeline) >= 3 # Founder join, member join, member leave
            team_evts = [e for e in events_timeline if e["type"] == "team"]
            assert len(team_evts) == 3
            print("   PASS: GET /api/chronicle returns team events.")

            # ------------------------------------------------------------------
            # Test 4: Ended mock calendar events trigger an alert prompt
            # ------------------------------------------------------------------
            print("\nTest 4: Ended mock calendar events trigger alert prompt within 4h window...")
            # We clear any existing Integrations for Google to use mock calendar events
            UserIntegration.query.filter_by(user_id=founder.id, provider="google").delete()
            db.session.commit()

            notif_res = client.get(
                "/api/notifications",
                headers=ws_headers
            )
            assert notif_res.status_code == 200
            alerts = notif_res.get_json()
            
            # The mock events ended 1h and 45m ago, so they should both show up as alerts
            ended_alerts = [a for a in alerts if a["type"] == "calendar_event_ended"]
            assert len(ended_alerts) == 2
            assert any("Customer Demo" in a["message"] for a in ended_alerts)
            assert any("Weekly Team Standup" in a["message"] for a in ended_alerts)
            print("   PASS: Ended mock events correctly surfaced as alerts.")

            # ------------------------------------------------------------------
            # Test 5: Alert prompt is NOT triggered if a meeting note already exists
            # ------------------------------------------------------------------
            print("\nTest 5: Alert is suppressed if meeting notes exist for that event title + date...")
            # Create a meeting note matching the Customer Demo title and date (which is today)
            demo_notes = MeetingNotes(
                title="🚀 Customer Demo (Stripe Integration)",
                summary="Customer demo notes",
                date=datetime.utcnow() - timedelta(hours=1),
                created_by=founder.id,
                workspace_id=workspace_id
            )
            db.session.add(demo_notes)
            db.session.commit()

            notif_res = client.get(
                "/api/notifications",
                headers=ws_headers
            )
            assert notif_res.status_code == 200
            alerts = notif_res.get_json()
            ended_alerts = [a for a in alerts if a["type"] == "calendar_event_ended"]
            # Only the Standup alert should remain
            assert len(ended_alerts) == 1
            assert "Weekly Team Standup" in ended_alerts[0]["message"]
            print("   PASS: Note existence suppresses event-end prompt.")

            # ------------------------------------------------------------------
            # Test 6: Dismissing a prompt removes it and is idempotent
            # ------------------------------------------------------------------
            print("\nTest 6: Dismissing an alert removes it from notifications and is idempotent...")
            standup_alert = ended_alerts[0]
            dismiss_payload = {
                "event_title": standup_alert["event_title"],
                "event_end_time": standup_alert["event_end_time"]
            }
            # Dismiss once
            dis_res1 = client.post(
                "/api/notifications/dismiss-calendar-alert",
                json=dismiss_payload,
                headers=ws_headers
            )
            assert dis_res1.status_code == 200

            # Dismiss twice (idempotency check)
            dis_res2 = client.post(
                "/api/notifications/dismiss-calendar-alert",
                json=dismiss_payload,
                headers=ws_headers
            )
            assert dis_res2.status_code == 200
            print("   PASS: Dismissal is idempotent.")

            # Re-query notifications
            notif_res = client.get(
                "/api/notifications",
                headers=ws_headers
            )
            assert notif_res.status_code == 200
            alerts = notif_res.get_json()
            ended_alerts = [a for a in alerts if a["type"] == "calendar_event_ended"]
            assert len(ended_alerts) == 0
            print("   PASS: Dismissed alerts are hidden from notification list.")

            # Clean up
            # Delete workspace and related objects
            ChronicleEvent.query.filter_by(workspace_id=workspace_id).delete()
            DismissedCalendarAlert.query.filter_by(workspace_id=workspace_id).delete()
            MeetingNotes.query.filter_by(workspace_id=workspace_id).delete()
            WorkspaceMember.query.filter_by(workspace_id=workspace_id).delete()
            Workspace.query.filter_by(id=workspace_id).delete()
            User.query.filter_by(email="p6_founder@foundesk.com").delete()
            User.query.filter_by(email="p6_member@foundesk.com").delete()
            db.session.commit()
            print("\n====================================================")
            print("Phase 6 Automated Verification Completed Successfully!")
            print("====================================================")

if __name__ == "__main__":
    run_tests()
