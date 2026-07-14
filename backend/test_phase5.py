import os
import sys
import jwt
from datetime import datetime, timedelta

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import app
from config.database import db
from models.user import User
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from models.recurring_workflow import RecurringWorkflow


def make_token(user):
    return jwt.encode({
        "user_id": user.id,
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=1)
    }, app.config['SECRET_KEY'], algorithm="HS256")


def run_tests():
    print("====================================================")
    print("Running FounDesk Phase 5 Verification Suite")
    print("====================================================\n")

    with app.test_client() as client:
        with app.app_context():
            db.create_all()

            print("Seeding Phase 5 workspace...")
            founder = User.query.filter_by(email="p5_founder@foundesk.com").first()
            if not founder:
                founder = User(email="p5_founder@foundesk.com", name="P5 Founder", google_id="p5_mock_founder")
                db.session.add(founder)

            assignee = User.query.filter_by(email="p5_assignee@foundesk.com").first()
            if not assignee:
                assignee = User(email="p5_assignee@foundesk.com", name="P5 Assignee", google_id="p5_mock_assignee")
                db.session.add(assignee)
            db.session.commit()

            workspace = Workspace.query.filter_by(name="Phase 5 Test Workspace").first()
            if not workspace:
                workspace = Workspace(name="Phase 5 Test Workspace", stage="Launch", creator_id=founder.id)
                db.session.add(workspace)
                db.session.commit()
            else:
                workspace.stage = "Seed"
                workspace.creator_id = founder.id
                db.session.commit()

            for user, role in [(founder, "founder"), (assignee, "member")]:
                member = WorkspaceMember.query.filter_by(workspace_id=workspace.id, user_id=user.id).first()
                if not member:
                    db.session.add(WorkspaceMember(
                        workspace_id=workspace.id,
                        user_id=user.id,
                        email=user.email,
                        role=role,
                        status="active"
                    ))
            db.session.commit()

            Task.query.filter_by(workspace_id=workspace.id).delete()
            Goal.query.filter_by(workspace_id=workspace.id).delete()
            DecisionLog.query.filter_by(workspace_id=workspace.id).delete()
            MeetingNotes.query.filter_by(workspace_id=workspace.id).delete()
            RecurringWorkflow.query.filter_by(workspace_id=workspace.id).delete()
            db.session.commit()

            headers = {
                "Authorization": f"Bearer {make_token(founder)}",
                "X-Workspace-Id": str(workspace.id)
            }

            print("Test 1: Phase 5 tables are queryable...")
            assert RecurringWorkflow.query.filter_by(workspace_id=workspace.id).count() == 0
            print("   PASS: recurring_workflows are available.")

            print("\nTest 2: Goal binding suggestions and existing task PUT binding...")
            investor_goal = Goal(
                title="Close investor seed round",
                description="Finalize pitch deck and investor follow-ups",
                goal_type="weekly",
                status="pending",
                user_id=founder.id,
                workspace_id=workspace.id
            )
            product_goal = Goal(
                title="Ship product polish",
                description="Improve onboarding and activation flows",
                goal_type="weekly",
                status="pending",
                user_id=founder.id,
                workspace_id=workspace.id
            )
            unlinked_task = Task(
                title="Send investor pitch deck follow-up",
                description="Share valuation and deck updates",
                status="Not Started",
                priority="P1",
                workspace_id=workspace.id,
                user_id=founder.id
            )
            db.session.add_all([investor_goal, product_goal, unlinked_task])
            db.session.commit()

            res = client.get("/api/ai/insights", headers=headers)
            assert res.status_code == 200
            data = res.get_json()
            suggestion = next(item for item in data["goal_binding"] if item["task_id"] == unlinked_task.id)
            assert suggestion["recommended_goal_id"] == investor_goal.id

            res = client.put(f"/api/tasks/{unlinked_task.id}", json={"goal_id": investor_goal.id}, headers=headers)
            assert res.status_code == 200
            assert Task.query.get(unlinked_task.id).goal_id == investor_goal.id
            print("   PASS: Goal recommendation and binding route work.")

            print("\nTest 3: Blocker prediction positive and negative cases...")
            risky_task = Task(
                title="Legal oauth investor agreement integration",
                description="Coordinate compliance review for investor safe contract and auth API migration",
                status="In Progress",
                priority="P0",
                assignee_id=assignee.id,
                workspace_id=workspace.id,
                user_id=founder.id
            )
            filler_tasks = [
                Task(title=f"Assignee active load {i}", status="Not Started", assignee_id=assignee.id, workspace_id=workspace.id, user_id=founder.id)
                for i in range(3)
            ]
            simple_task = Task(
                title="Write FAQ copy",
                description="Small copy edit",
                status="Not Started",
                priority="P3",
                workspace_id=workspace.id,
                user_id=founder.id
            )
            db.session.add(risky_task)
            db.session.add_all(filler_tasks)
            db.session.add(simple_task)
            db.session.commit()

            res = client.get("/api/ai/insights", headers=headers)
            blocker_items = res.get_json()["blocker_prediction"]
            assert any(item["task_id"] == risky_task.id for item in blocker_items)
            assert not any(item["task_id"] == simple_task.id for item in blocker_items)
            print("   PASS: High-risk task flagged while simple task stays quiet.")

            print("\nTest 4: Pattern detection uses updated_at for completed task timing...")
            same_created_at = datetime.utcnow() - timedelta(days=20)
            first_done = Task(
                title="Send investor update",
                status="Done",
                created_at=same_created_at,
                updated_at=datetime.utcnow() - timedelta(days=10),
                workspace_id=workspace.id,
                user_id=founder.id
            )
            second_done = Task(
                title="send investor update",
                status="Done",
                created_at=same_created_at,
                updated_at=datetime.utcnow() - timedelta(days=2),
                workspace_id=workspace.id,
                user_id=founder.id
            )
            db.session.add_all([first_done, second_done])
            db.session.commit()

            res = client.get("/api/ai/insights", headers=headers)
            patterns = res.get_json()["recurring_workflow"]
            assert any(item["title"].lower() == "send investor update" for item in patterns)
            print("   PASS: Recurring workflow suggestion uses completed-time proxy.")

            print("\nTest 5: Recurring workflow generation and per-workflow duplicate guard...")
            today_weekday = datetime.utcnow().date().weekday()
            res = client.post(
                "/api/ai/workflows/create",
                json={"title": "Weekly revenue review", "frequency": "weekly", "day_of_week": today_weekday},
                headers=headers
            )
            assert res.status_code == 201
            res = client.post(
                "/api/ai/workflows/create",
                json={"title": "Weekly customer review", "frequency": "weekly", "day_of_week": today_weekday},
                headers=headers
            )
            assert res.status_code == 201

            res = client.get("/api/ai/insights", headers=headers)
            assert len(res.get_json()["active_workflows"]) == 2

            res = client.post("/api/ai/workflows/trigger", headers=headers)
            assert res.status_code == 200
            assert res.get_json()["generated"] == 2
            generated_tasks = Task.query.filter(
                Task.workspace_id == workspace.id,
                Task.title.in_(["Weekly revenue review", "Weekly customer review"])
            ).all()
            assert len(generated_tasks) == 2

            res = client.post("/api/ai/workflows/trigger", headers=headers)
            assert res.status_code == 200
            assert res.get_json()["generated"] == 0
            generated_tasks = Task.query.filter(
                Task.workspace_id == workspace.id,
                Task.title.in_(["Weekly revenue review", "Weekly customer review"])
            ).all()
            assert len(generated_tasks) == 2
            print("   PASS: Two due workflows generate once each and do not duplicate.")

            print("\nTest 6: Inferred decisions draft, confirm, and recent-log suppression...")
            decision_task = Task(
                title="Select PostgreSQL for analytics store",
                status="Done",
                updated_at=datetime.utcnow(),
                workspace_id=workspace.id,
                user_id=founder.id
            )
            db.session.add(decision_task)
            db.session.commit()

            res = client.get("/api/ai/insights", headers=headers)
            assert res.status_code == 200
            drafts = res.get_json()["inferred_decision"]
            draft = next(item for item in drafts if "postgresql" in item["decision"].lower())

            res = client.post("/api/ai/decisions/confirm", json=draft, headers=headers)
            assert res.status_code == 201
            assert DecisionLog.query.filter(DecisionLog.workspace_id == workspace.id, DecisionLog.decision.ilike("%postgresql%")).count() >= 1

            res = client.get("/api/ai/insights", headers=headers)
            assert res.status_code == 200
            assert res.get_json()["inferred_decision"] == []
            print("   PASS: Decision drafts confirm and recent decision gate suppresses new drafts.")

            print("\nTest 7: Feedback validation loop hides rejected suggestions...")
            DecisionLog.query.filter_by(workspace_id=workspace.id).delete()
            RecurringWorkflow.query.filter_by(workspace_id=workspace.id).delete()
            db.session.commit()

            rejected_goal_task = Task(
                title="Investor deck cleanup rejected target",
                description="deck investor",
                status="Not Started",
                workspace_id=workspace.id,
                user_id=founder.id
            )
            rejected_blocker_task = Task(
                title="Legal oauth rejected target",
                description="investor contract auth api",
                status="In Progress",
                workspace_id=workspace.id,
                user_id=founder.id
            )
            rejected_pattern_a = Task(
                title="Rejected weekly ops",
                status="Done",
                updated_at=datetime.utcnow() - timedelta(days=9),
                workspace_id=workspace.id,
                user_id=founder.id
            )
            rejected_pattern_b = Task(
                title="rejected weekly ops",
                status="Done",
                updated_at=datetime.utcnow() - timedelta(days=1),
                workspace_id=workspace.id,
                user_id=founder.id
            )
            rejected_decision_task = Task(
                title="Choose billing provider rejected target",
                status="Done",
                updated_at=datetime.utcnow(),
                workspace_id=workspace.id,
                user_id=founder.id
            )
            db.session.add_all([
                rejected_goal_task,
                rejected_blocker_task,
                rejected_pattern_a,
                rejected_pattern_b,
                rejected_decision_task
            ])
            db.session.commit()

            decision_key = f"We decided to {rejected_decision_task.title.lower()}"[:100]
            feedback_payloads = [
                ("goal_binding", str(rejected_goal_task.id)),
                ("blocker_prediction", str(rejected_blocker_task.id)),
                ("recurring_workflow", "rejected weekly ops"),
                ("inferred_decision", decision_key)
            ]
            for suggestion_type, suggestion_key in feedback_payloads:
                res = client.post(
                    "/api/ai/feedback",
                    json={"suggestion_type": suggestion_type, "suggestion_key": suggestion_key, "action": "rejected"},
                    headers=headers
                )
                assert res.status_code == 201

            res = client.get("/api/ai/insights", headers=headers)
            data = res.get_json()
            assert not any(item["task_id"] == rejected_goal_task.id for item in data["goal_binding"])
            assert not any(item["task_id"] == rejected_blocker_task.id for item in data["blocker_prediction"])
            assert not any(item["title"].lower() == "rejected weekly ops" for item in data["recurring_workflow"])
            assert not any(item["decision"][:100] == decision_key for item in data["inferred_decision"])
            print("   PASS: Rejected suggestions are hidden across all insight types.")

            print("\nTest 8: Invalid feedback and workflow payloads return clear 400s...")
            res = client.post(
                "/api/ai/feedback",
                json={"suggestion_type": "nonsense", "suggestion_key": "1", "action": "rejected"},
                headers=headers
            )
            assert res.status_code == 400
            assert "Invalid suggestion_type" in res.get_json()["error"]

            res = client.post(
                "/api/ai/feedback",
                json={"suggestion_type": "goal_binding", "suggestion_key": "1", "action": "maybe"},
                headers=headers
            )
            assert res.status_code == 400
            assert "Invalid action" in res.get_json()["error"]

            res = client.post(
                "/api/ai/workflows/create",
                json={"title": "Bad workflow", "frequency": "yearly"},
                headers=headers
            )
            assert res.status_code == 400
            assert "Invalid frequency" in res.get_json()["error"]

            res = client.post(
                "/api/ai/workflows/create",
                json={"title": "Bad weekly", "frequency": "weekly", "day_of_week": 7},
                headers=headers
            )
            assert res.status_code == 400
            assert "day_of_week" in res.get_json()["error"]

            res = client.post(
                "/api/ai/workflows/create",
                json={"title": "Bad monthly", "frequency": "monthly", "day_of_month": 0},
                headers=headers
            )
            assert res.status_code == 400
            assert "day_of_month" in res.get_json()["error"]
            print("   PASS: Invalid payloads produce explicit validation errors.")

            print("\n====================================================")
            print("Phase 5 Automated Verification Completed Successfully!")
            print("====================================================")


if __name__ == "__main__":
    run_tests()
