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
from models.standup import Standup
from models.goal import Goal

def run_tests():
    print("====================================================")
    print("🚀 Running FounDesk Phase 2 Verification Suite")
    print("====================================================\n")

    with app.test_client() as client:
        # We wrap in app context to access db and models
        with app.app_context():
            # Create test seed data
            print("🌱 Seeding test users and workspace...")
            
            # 1. Create unique test users
            founder_user = User.query.filter_by(email="test_founder@foundesk.com").first()
            if not founder_user:
                founder_user = User(email="test_founder@foundesk.com", name="Test Founder", google_id="mock_g_founder")
                db.session.add(founder_user)
            
            member_user = User.query.filter_by(email="test_member@foundesk.com").first()
            if not member_user:
                member_user = User(email="test_member@foundesk.com", name="Test Member", google_id="mock_g_member")
                db.session.add(member_user)
                
            db.session.commit()

            # 2. Create test workspace
            workspace = Workspace.query.filter_by(name="Phase 2 Test Workspace").first()
            if not workspace:
                workspace = Workspace(name="Phase 2 Test Workspace", stage="Launch", creator_id=founder_user.id)
                db.session.add(workspace)
                db.session.commit()

            # 3. Add workspace memberships
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

            member_member = WorkspaceMember.query.filter_by(workspace_id=workspace.id, user_id=member_user.id).first()
            if not member_member:
                member_member = WorkspaceMember(
                    workspace_id=workspace.id,
                    user_id=member_user.id,
                    email=member_user.email,
                    role="member",
                    status="active"
                )
                db.session.add(member_member)
                
            db.session.commit()

            # Generate tokens
            secret_key = app.config['SECRET_KEY']
            founder_token = jwt.encode({
                "user_id": founder_user.id,
                "email": founder_user.email,
                "exp": datetime.utcnow() + timedelta(days=1)
            }, secret_key, algorithm="HS256")

            member_token = jwt.encode({
                "user_id": member_user.id,
                "email": member_user.email,
                "exp": datetime.utcnow() + timedelta(days=1)
            }, secret_key, algorithm="HS256")

            # Clean up any existing tasks / standups / goals in this test workspace to avoid pollution
            Task.query.filter_by(workspace_id=workspace.id).delete()
            Standup.query.filter_by(workspace_id=workspace.id).delete()
            Goal.query.filter_by(workspace_id=workspace.id).delete()
            db.session.commit()

            # Setup default headers with token and workspace context
            founder_headers = {
                "Authorization": f"Bearer {founder_token}",
                "X-Workspace-Id": str(workspace.id)
            }
            member_headers = {
                "Authorization": f"Bearer {member_token}",
                "X-Workspace-Id": str(workspace.id)
            }

            print("✅ Seeding completed. Starting test executions...\n")

            # ------------------------------------------------------------------
            # Test 1: 24h Blocker Rule
            # ------------------------------------------------------------------
            print("🧪 Test 1: Testing 24h Blocker escalation...")
            blocked_task = Task(
                title="CORS Authentication Error",
                description="Dev server throws CORS when connecting Gmail.",
                priority="P2",
                status="Blocked",
                blocked_at=datetime.utcnow() - timedelta(hours=25), # Blocked for > 24 hours
                blocker_description="Blocked by third party Google Redirect settings",
                is_seen=False,
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add(blocked_task)
            db.session.commit()

            res = client.get("/api/notifications", headers=founder_headers)
            assert res.status_code == 200, f"Expected 200, got {res.status_code}"
            alerts = res.get_json()
            
            blocker_alert = next((a for a in alerts if a["type"] == "blocker_24h"), None)
            assert blocker_alert is not None, "24h Blocker alert was not surfaced."
            assert blocker_alert["task_id"] == blocked_task.id
            assert "CORS Authentication Error" in blocker_alert["message"]
            assert "Blocked by third party Google Redirect settings" in blocker_alert["message"]
            print("   👉 PASS: 24h Blocker alert verified successfully.")

            # ------------------------------------------------------------------
            # Test 2: P0 Stale 12h Rule
            # ------------------------------------------------------------------
            print("\n🧪 Test 2: Testing P0 Stale 12h rule...")
            stale_task = Task(
                title="Critical Production Memory Leak",
                description="Fixing connection leaks in Postgres pool.",
                priority="P0",
                status="Not Started",
                updated_at=datetime.utcnow() - timedelta(hours=13), # No update for 13 hours
                is_seen=False,
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add(stale_task)
            db.session.commit()

            res = client.get("/api/notifications", headers=founder_headers)
            alerts = res.get_json()
            stale_alert = next((a for a in alerts if a["type"] == "p0_stale_12h"), None)
            assert stale_alert is not None, "Stale P0 12h alert was not surfaced."
            assert stale_alert["task_id"] == stale_task.id
            assert "Critical Production Memory Leak" in stale_alert["message"]
            print("   👉 PASS: P0 Stale 12h alert verified successfully.")

            # ------------------------------------------------------------------
            # Test 3: 3x Estimated Duration Bottleneck
            # ------------------------------------------------------------------
            print("\n🧪 Test 3: Testing 3x Duration bottleneck rule...")
            # Est: 2 hours. Math: 3 * 2 = 6 hours threshold. Set started_at to 7 hours ago.
            long_task = Task(
                title="Build Stripe Invoicing",
                description="Setup customer invoices",
                priority="P1",
                status="In Progress",
                estimated_hours=2,
                started_at=datetime.utcnow() - timedelta(hours=7), # Started 7 hours ago (> 6 hours limit)
                is_seen=False,
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add(long_task)
            db.session.commit()

            res = client.get("/api/notifications", headers=founder_headers)
            alerts = res.get_json()
            duration_alert = next((a for a in alerts if a["type"] == "duration_3x"), None)
            assert duration_alert is not None, "3x Duration alert was not surfaced."
            assert duration_alert["task_id"] == long_task.id
            assert "Build Stripe Invoicing" in duration_alert["message"]
            assert "over 3x the estimate of 2h" in duration_alert["message"]
            print("   👉 PASS: 3x Duration math verified successfully (7 hours > 3 * 2 hours).")

            # ------------------------------------------------------------------
            # Test 4: Standup Blocker reported today
            # ------------------------------------------------------------------
            print("\n🧪 Test 4: Testing Standup Blocker alerts...")
            today_str = datetime.utcnow().strftime('%Y-%m-%d')
            standup_sub = Standup(
                user_id=member_user.id,
                workspace_id=workspace.id,
                date=today_str,
                q1_yesterday="Refactored front-end Execute board.",
                q2_today="Testing backend verification pipelines.",
                q3_blockers="Stripe developer keys are missing!" # Blockers flagged
            )
            db.session.add(standup_sub)
            db.session.commit()

            res = client.get("/api/notifications", headers=founder_headers)
            alerts = res.get_json()
            standup_alert = next((a for a in alerts if a["type"] == "standup_blocker"), None)
            assert standup_alert is not None, "Standup blocker alert was not surfaced."
            assert standup_alert["user_name"] == "Test Member"
            assert "Stripe developer keys are missing!" in standup_alert["message"]
            print("   👉 PASS: Standup blocker alert verified successfully.")

            # ------------------------------------------------------------------
            # Test 5: Standups Non-Responder List
            # ------------------------------------------------------------------
            print("\n🧪 Test 5: Testing Standups non-responder list mapping...")
            # Today's date has standup submission from Test Member, but NOT Test Founder.
            res = client.get(f"/api/standups?date={today_str}", headers=founder_headers)
            assert res.status_code == 200
            standups_res = res.get_json()
            
            # Verify submission list includes member
            submissions = standups_res["submissions"]
            assert len(submissions) == 1
            assert submissions[0]["user_id"] == member_user.id
            
            # Verify non-responder list includes founder
            non_responders = standups_res["non_responders"]
            assert len(non_responders) == 1
            assert non_responders[0]["user_id"] == founder_user.id
            assert non_responders[0]["user_name"] == "Test Founder"
            print("   👉 PASS: Standup responder and non-responder lists verified successfully.")

            # ------------------------------------------------------------------
            # Test 6: Member assigned unseen tasks
            # ------------------------------------------------------------------
            print("\n🧪 Test 6: Testing Member notifications (Unseen assigned tasks)...")
            # Create a task assigned to Member, unseen
            assigned_task = Task(
                title="Write verification scripts",
                description="Write unit tests for execution workspace.",
                priority="P2",
                status="Not Started",
                assignee_id=member_user.id,
                is_seen=False,
                user_id=founder_user.id,
                workspace_id=workspace.id
            )
            db.session.add(assigned_task)
            db.session.commit()

            # 1. Verify Member gets the alert
            res = client.get("/api/notifications", headers=member_headers)
            alerts = res.get_json()
            member_alert = next((a for a in alerts if a["type"] == "task_assigned"), None)
            assert member_alert is not None, "Member unseen task alert not surfaced."
            assert member_alert["task_id"] == assigned_task.id
            print("   👉 Member alert successfully surfaced.")

            # 2. Verify Founder does NOT get this alert (role separation)
            res = client.get("/api/notifications", headers=founder_headers)
            alerts = res.get_json()
            founder_gets_assigned_alert = any(a["type"] == "task_assigned" for a in alerts)
            assert not founder_gets_assigned_alert, "Founder received task_assigned notification (unauthorized role separation check fail)."
            print("   👉 Founder role separation check passed.")

            # 3. Mark task as seen via API and verify notification disappears
            res = client.put(f"/api/tasks/{assigned_task.id}", headers=member_headers, json={"is_seen": True})
            assert res.status_code == 200
            
            res = client.get("/api/notifications", headers=member_headers)
            alerts = res.get_json()
            member_alert = next((a for a in alerts if a["type"] == "task_assigned"), None)
            assert member_alert is None, "Marked task as seen, but notification still persisted."
            print("   👉 Verification of clearing notification via 'is_seen' successful.")

            # ------------------------------------------------------------------
            # Clean Up Test Data
            # ------------------------------------------------------------------
            print("\n🧹 Cleaning up test database data...")
            Task.query.filter_by(workspace_id=workspace.id).delete()
            Standup.query.filter_by(workspace_id=workspace.id).delete()
            Goal.query.filter_by(workspace_id=workspace.id).delete()
            WorkspaceMember.query.filter_by(workspace_id=workspace.id).delete()
            Workspace.query.filter_by(id=workspace.id).delete()
            User.query.filter_by(email="test_founder@foundesk.com").delete()
            User.query.filter_by(email="test_member@foundesk.com").delete()
            db.session.commit()
            print("🧹 DB Cleaned up.")

    print("\n====================================================")
    print("🏆 ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("====================================================\n")

if __name__ == "__main__":
    run_tests()
