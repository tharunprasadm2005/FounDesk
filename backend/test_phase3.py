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
from models.task import Task
from models.goal import Goal
from models.follow_up import FollowUp
from models.user_integration import UserIntegration
from models.phase_template import PhaseTemplate

def run_tests():
    print("====================================================")
    print("🚀 Running FounDesk Phase 3 Verification Suite")
    print("====================================================\n")

    with app.test_client() as client:
        with app.app_context():
            print("🌱 Seeding test users and workspace...")
            
            # Create unique test users
            founder_user = User.query.filter_by(email="p3_founder@foundesk.com").first()
            if not founder_user:
                founder_user = User(email="p3_founder@foundesk.com", name="P3 Founder", google_id="p3_mock_g_founder")
                db.session.add(founder_user)
            
            db.session.commit()

            # Create test workspace
            workspace = Workspace.query.filter_by(name="Phase 3 Test Workspace").first()
            if not workspace:
                workspace = Workspace(
                    name="Phase 3 Test Workspace", 
                    stage="Launch", 
                    creator_id=founder_user.id,
                    active_phase=None,
                    calendar_rules={"start_hour": 9, "end_hour": 18}
                )
                db.session.add(workspace)
                db.session.commit()
            else:
                workspace.active_phase = None
                workspace.calendar_rules = {"start_hour": 9, "end_hour": 18}
                db.session.commit()

            # Add workspace memberships
            founder_member = WorkspaceMember.query.filter_by(workspace_id=workspace.id, user_id=founder_user.id).first()
            if not founder_member:
                founder_member = WorkspaceMember(
                    workspace_id=workspace.id,
                    user_id=founder_user.id,
                    email=founder_user.email,
                    role="founder",
                    status="active"
                )
                db.session.add(founder_member)
                
            db.session.commit()

            # Create integration for calendar defense tests
            google_integ = UserIntegration.query.filter_by(user_id=founder_user.id, provider="google").first()
            if not google_integ:
                google_integ = UserIntegration(
                    user_id=founder_user.id,
                    provider="google",
                    access_token="mock_access_token_p3",
                    refresh_token="mock_refresh_token_p3",
                    expires_at=datetime.utcnow() + timedelta(days=1)
                )
                db.session.add(google_integ)
                db.session.commit()

            # Generate tokens
            secret_key = app.config['SECRET_KEY']
            founder_token = jwt.encode({
                "user_id": founder_user.id,
                "email": founder_user.email,
                "exp": datetime.utcnow() + timedelta(days=1)
            }, secret_key, algorithm="HS256")

            # Clean up tables
            Task.query.filter_by(workspace_id=workspace.id).delete()
            Goal.query.filter_by(workspace_id=workspace.id).delete()
            FollowUp.query.filter_by(workspace_id=workspace.id).delete()
            db.session.commit()

            founder_headers = {
                "Authorization": f"Bearer {founder_token}",
                "X-Workspace-Id": str(workspace.id)
            }

            print("✅ Seeding completed. Starting test executions...\n")

            # ------------------------------------------------------------------
            # Test 1: Goal Cascade Progress & Auto-Transition Calculations
            # ------------------------------------------------------------------
            print("🧪 Test 1: Goal Cascade & Auto-Transition...")
            monthly_g = Goal(
                title="Launch PH Campaign",
                goal_type="monthly",
                status="pending",
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add(monthly_g)
            db.session.commit()

            weekly_g = Goal(
                title="Record PH Demo Video",
                goal_type="weekly",
                status="pending",
                parent_id=monthly_g.id,
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add(weekly_g)
            db.session.commit()

            t1 = Task(
                title="Write Demo Script",
                status="Done",
                priority="P2",
                goal_id=weekly_g.id,
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            t2 = Task(
                title="Record Dashboard walkthrough",
                status="Not Started",
                priority="P2",
                goal_id=weekly_g.id,
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add_all([t1, t2])
            db.session.commit()

            # Query goals: progress should be 50% for weekly, 50% for monthly (average of subgoals)
            res = client.get("/api/goals", headers=founder_headers)
            assert res.status_code == 200, f"Expected 200, got {res.status_code}"
            goals_list = res.get_json()

            w_goal_resp = next((g for g in goals_list if g["id"] == weekly_g.id), None)
            m_goal_resp = next((g for g in goals_list if g["id"] == monthly_g.id), None)
            
            assert w_goal_resp is not None
            assert m_goal_resp is not None
            assert w_goal_resp["progress"] == 50
            assert w_goal_resp["status"] == "in_progress", f"Expected in_progress, got {w_goal_resp['status']}"
            assert m_goal_resp["progress"] == 50

            # Complete remaining task
            t2.status = "Done"
            db.session.commit()

            # Re-query: weekly should hit 100% and auto-transition to completed
            res = client.get("/api/goals", headers=founder_headers)
            goals_list = res.get_json()
            w_goal_resp = next((g for g in goals_list if g["id"] == weekly_g.id), None)
            m_goal_resp = next((g for g in goals_list if g["id"] == monthly_g.id), None)
            
            assert w_goal_resp["progress"] == 100
            assert w_goal_resp["status"] == "completed", f"Expected completed, got {w_goal_resp['status']}"
            assert m_goal_resp["progress"] == 100
            print("   👉 PASS: Goal cascades progress & auto-transition calculated correctly.")

            # ------------------------------------------------------------------
            # Test 2 & 3: Calendar Defense Suggestions & Booking
            # ------------------------------------------------------------------
            print("\n🧪 Test 2: Calendar Defense suggestions...")
            res = client.get("/api/calendar/defense", headers=founder_headers)
            assert res.status_code == 200
            data = res.get_json()
            assert "suggestions" in data
            assert len(data["suggestions"]) > 0
            
            rules = data["calendar_rules"]
            assert rules["start_hour"] == 9
            assert rules["end_hour"] == 18
            print("   👉 PASS: Calendar free blocks suggestions generated.")

            print("🧪 Test 3: Auto-Booking Focus Block...")
            slot = data["suggestions"][0]
            book_payload = {
                "start_time": slot["start"],
                "end_time": slot["end"]
            }
            res = client.post("/api/calendar/book", json=book_payload, headers=founder_headers)
            assert res.status_code == 201
            resp_data = res.get_json()
            assert "🔒 Deep Work: Focus Block" in resp_data["event"]["summary"]
            print("   👉 PASS: Focus block auto-booked on calendar.")

            # ------------------------------------------------------------------
            # Test 4: Phase Templates Seeding & Bootstrapping
            # ------------------------------------------------------------------
            print("\n🧪 Test 4: Phase Templates & Bootstrapping...")
            res = client.get("/api/templates", headers=founder_headers)
            assert res.status_code == 200
            templates = res.get_json()
            assert len(templates) >= 4, f"Expected 4 templates, got {len(templates)}"
            
            fundraising = next((t for t in templates if t["name"] == "fundraising_sprint"), None)
            assert fundraising is not None
            assert fundraising["is_active"] is False

            # Apply fundraising sprint preset
            res = client.post("/api/workspaces/apply-template", json={"template_name": "fundraising_sprint"}, headers=founder_headers)
            assert res.status_code == 200
            
            # Verify workspace active_phase is updated
            ws = Workspace.query.get(workspace.id)
            assert ws.active_phase == "fundraising_sprint"

            # Check that fundraising goals were created
            res = client.get("/api/goals", headers=founder_headers)
            goals = res.get_json()
            fundraising_goals = [g for g in goals if g["title"] == "Close Seed Round of $1.5M"]
            assert len(fundraising_goals) > 0
            print("   👉 PASS: Phase templates loaded and bootstrapped additively.")

            # ------------------------------------------------------------------
            # Test 5: Smart Follow-ups Manual Logging & Dismissals
            # ------------------------------------------------------------------
            print("\n🧪 Test 5: Smart Follow-ups logging & dismissals...")
            log_payload = {
                "person_name": "Marc Andreessen",
                "last_contact_date": (datetime.utcnow() - timedelta(days=4)).isoformat(),
                "followup_date": (datetime.utcnow() - timedelta(days=1)).isoformat()
            }
            res = client.post("/api/follow-ups", json=log_payload, headers=founder_headers)
            assert res.status_code == 201
            fu_log = res.get_json()
            assert fu_log["status"] == "pending"

            # Get pending follow-ups
            res = client.get("/api/follow-ups?status=pending", headers=founder_headers)
            pending_list = res.get_json()
            assert len(pending_list) > 0
            
            # Dismiss it
            res = client.put(f"/api/follow-ups/{fu_log['id']}", json={"status": "dismissed"}, headers=founder_headers)
            assert res.status_code == 200
            
            # Verify no longer pending
            res = client.get("/api/follow-ups?status=pending", headers=founder_headers)
            pending_list = res.get_json()
            assert not any(f["id"] == fu_log["id"] for f in pending_list)
            print("   👉 PASS: Follow-ups logging, status filtering, and dismissals verified.")

            # ------------------------------------------------------------------
            # Test 6: Live alerts for Overdue followups and Unlinked Tasks
            # ------------------------------------------------------------------
            print("\n🧪 Test 6: Overdue Followups & Unlinked tasks alerts...")
            # Create overdue follow up
            overdue_fu = FollowUp(
                person_name="Ron Conway",
                last_contact_date=datetime.utcnow() - timedelta(days=5),
                followup_date=datetime.utcnow() - timedelta(days=2),
                status="pending",
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add(overdue_fu)

            # Create unlinked active task
            unlinked_task = Task(
                title="Fix production cookie leaks",
                status="Not Started",
                priority="P2",
                goal_id=None, # Unlinked
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add(unlinked_task)
            db.session.commit()

            # Query notifications
            res = client.get("/api/notifications", headers=founder_headers)
            assert res.status_code == 200
            alerts = res.get_json()
            
            fu_alert = next((a for a in alerts if a["type"] == "follow_up_overdue"), None)
            unlink_alert = next((a for a in alerts if a["type"] == "unlinked_task"), None)
            
            assert fu_alert is not None, "Overdue follow up alert not triggered."
            assert unlink_alert is not None, "Unlinked task warning not triggered."
            assert "Ron Conway" in fu_alert["message"]
            assert "Fix production cookie leaks" in unlink_alert["message"]
            print("   👉 PASS: Overdue followups and unlinked tasks warnings surfaced live.")

            print("\n====================================================")
            print("🎉 Phase 3 Automated Verification Completed Successfully!")
            print("====================================================")

if __name__ == "__main__":
    run_tests()
