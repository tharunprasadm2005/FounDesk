import os
import sys
import jwt
import json
from datetime import datetime, timedelta

# Add current directory to python path
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

def run_tests():
    print("====================================================")
    print("Running FounDesk Phase 4 Verification Suite")
    print("====================================================\n")

    with app.test_client() as client:
        with app.app_context():
            print("Seeding test users and workspace...")
            
            # Create test founder, developer, and designer
            founder = User.query.filter_by(email="p4_founder@foundesk.com").first()
            if not founder:
                founder = User(email="p4_founder@foundesk.com", name="P4 Founder", google_id="p4_mock_g_founder")
                db.session.add(founder)
            
            developer = User.query.filter_by(email="p4_dev@foundesk.com").first()
            if not developer:
                developer = User(email="p4_dev@foundesk.com", name="P4 Developer", google_id="p4_mock_g_dev")
                db.session.add(developer)
                
            designer = User.query.filter_by(email="p4_designer@foundesk.com").first()
            if not designer:
                designer = User(email="p4_designer@foundesk.com", name="P4 Designer", google_id="p4_mock_g_designer")
                db.session.add(designer)

            db.session.commit()

            # Create test workspace
            workspace = Workspace.query.filter_by(name="Phase 4 Test Workspace").first()
            if not workspace:
                workspace = Workspace(
                    name="Phase 4 Test Workspace", 
                    stage="Launch", 
                    creator_id=founder.id
                )
                db.session.add(workspace)
                db.session.commit()

            # Add memberships
            for user, role in [(founder, "founder"), (developer, "developer"), (designer, "designer")]:
                member = WorkspaceMember.query.filter_by(workspace_id=workspace.id, user_id=user.id).first()
                if not member:
                    member = WorkspaceMember(
                        workspace_id=workspace.id,
                        user_id=user.id,
                        email=user.email,
                        role=role,
                        status="active"
                    )
                    db.session.add(member)
            db.session.commit()

            # Generate tokens
            secret_key = app.config['SECRET_KEY']
            founder_token = jwt.encode({
                "user_id": founder.id,
                "email": founder.email,
                "exp": datetime.utcnow() + timedelta(days=1)
            }, secret_key, algorithm="HS256")

            # Clean up tables
            Task.query.filter_by(workspace_id=workspace.id).delete()
            Goal.query.filter_by(workspace_id=workspace.id).delete()
            DecisionLog.query.filter_by(workspace_id=workspace.id).delete()
            MeetingNotes.query.filter_by(workspace_id=workspace.id).delete()
            db.session.commit()

            founder_headers = {
                "Authorization": f"Bearer {founder_token}",
                "X-Workspace-Id": str(workspace.id)
            }

            print("Seeding completed. Starting test executions...\n")

            # ------------------------------------------------------------------
            # Test 1: Database Migration Columns & Relationships
            # ------------------------------------------------------------------
            print("Test 1: Database Columns & Relations...")
            # Create a meeting note first
            meeting = MeetingNotes(
                title="Weekly Review Meeting",
                attendees="P4 Founder, P4 Developer",
                duration=45,
                workspace_id=workspace.id,
                created_by=founder.id
            )
            db.session.add(meeting)
            db.session.commit()

            # Create decision linked to it
            decision = DecisionLog(
                decision="Adopt selectinload for FounDesk",
                context="To prevent the N+1 query problem",
                alternatives="Lazy load queries (ruled out due to N+1)",
                attendees="P4 Founder, P4 Developer",
                startup_stage="Launch",
                linked_meeting_id=meeting.id,
                workspace_id=workspace.id,
                created_by=founder.id
            )
            db.session.add(decision)
            db.session.commit()

            # Create a task linked to both
            task = Task(
                title="Configure selectinload routes",
                status="Not Started",
                priority="P1",
                linked_decision_id=decision.id,
                linked_meeting_id=meeting.id,
                workspace_id=workspace.id,
                user_id=founder.id
            )
            db.session.add(task)
            db.session.commit()

            # Verify query and to_dict has relations
            res = client.get("/api/decisions", headers=founder_headers)
            assert res.status_code == 200
            decisions_list = res.get_json()
            assert len(decisions_list) > 0
            assert decisions_list[0]["linked_meeting_id"] == meeting.id
            assert task.id in decisions_list[0]["linked_task_ids"]
            assert decisions_list[0]["attendees"] == "P4 Founder, P4 Developer"
            assert decisions_list[0]["startup_stage"] == "Launch"

            res = client.get("/api/notes", headers=founder_headers)
            assert res.status_code == 200
            notes_list = res.get_json()
            assert len(notes_list) > 0
            assert notes_list[0]["duration"] == 45
            assert decision.id in notes_list[0]["linked_decision_ids"]
            assert task.id in notes_list[0]["linked_task_ids"]
            print("   PASS: Schema columns added and eager loaded correctly.")

            # ------------------------------------------------------------------
            # Test 2: Post-Meeting AI / Regex Processing
            # ------------------------------------------------------------------
            print("\nTest 2: Meeting Notes Processing & Extractor Fallback...")
            raw_transcript = (
                "Kickoff meeting summary\n"
                "We discussed the GTM strategy.\n"
                "- todo: Write draft copy for landing page\n"
                "Marc agreed to sponsor the next seed event.\n"
                "We decided to focus pricing on enterprise SaaS tiers.\n"
                "agreed to launch on Product Hunt next week."
            )
            
            # Create a fresh meeting note for processing
            m2 = MeetingNotes(
                title="GTM Launch Prep Sync",
                attendees="P4 Founder, P4 Developer",
                workspace_id=workspace.id,
                created_by=founder.id
            )
            db.session.add(m2)
            db.session.commit()

            # Process the note transcript
            res = client.post(
                f"/api/notes/{m2.id}/process",
                json={"transcript": raw_transcript},
                headers=founder_headers
            )
            assert res.status_code == 200
            process_data = res.get_json()
            
            # Assert updated note summary
            assert len(process_data["note"]["summary"]) > 0
            
            # Assert created tasks
            tasks_created = process_data["tasks"]
            assert len(tasks_created) > 0
            # Matches "- todo: Write draft copy..."
            t_written = next((t for t in tasks_created if "Write draft copy" in t["title"]), None)
            assert t_written is not None
            assert t_written["linked_meeting_id"] == m2.id

            # Assert created decisions
            decisions_created = process_data["decisions"]
            assert len(decisions_created) > 0
            d_pricing = next((d for d in decisions_created if "focus pricing on enterprise" in d["decision"].lower()), None)
            assert d_pricing is not None
            assert d_pricing["linked_meeting_id"] == m2.id
            assert d_pricing["context"] == "Extracted from meeting notes"
            assert d_pricing["alternatives"] is None
            assert d_pricing["startup_stage"] == "Launch"
            print("   PASS: Regex fallback extraction successfully processed and committed.")

            # ------------------------------------------------------------------
            # Test 3: Context Search & Relevance Ranking
            # ------------------------------------------------------------------
            print("\nTest 3: Context Search Relevance & Caps...")
            # Create some unique tasks and decisions with specific terms
            special_task = Task(
                title="Prepare investor seed deck",
                description="Finalize financial slides for seed pitching cap.",
                priority="P0",
                workspace_id=workspace.id,
                user_id=founder.id
            )
            db.session.add(special_task)
            db.session.commit()

            res = client.get("/api/memory/search?q=investor+seed+deck", headers=founder_headers)
            assert res.status_code == 200
            search_list = res.get_json()
            
            # Prepare deck task should be at the top or highly relevant
            assert len(search_list) > 0
            top_match = search_list[0]
            assert top_match["type"] == "task"
            assert "Prepare investor seed deck" in top_match["data"]["title"]
            assert top_match["score"] > 0
            print("   PASS: Relevance scoring sorted search results correctly.")

            # ------------------------------------------------------------------
            # Test 4: Handoff Onboarding Personalization
            # ------------------------------------------------------------------
            print("\nTest 4: Personalized Onboarding Packets...")
            # Assign task to Developer only
            dev_task = Task(
                title="Write landing page code",
                status="In Progress",
                assignee_id=developer.id,
                workspace_id=workspace.id,
                user_id=founder.id
            )
            designer_task = Task(
                title="Design mockup slides",
                status="Not Started",
                assignee_id=designer.id,
                workspace_id=workspace.id,
                user_id=founder.id
            )
            db.session.add_all([dev_task, designer_task])
            db.session.commit()

            # Request onboarding for Developer
            res = client.post(
                "/api/handoff/onboard",
                json={"new_user_id": developer.id},
                headers=founder_headers
            )
            assert res.status_code == 200
            onboard_data = res.get_json()
            markdown_content = onboard_data["markdown"]
            
            # Verify developer task is present, designer task is not
            assert "Write landing page code" in markdown_content
            assert "Design mockup slides" not in markdown_content
            print("   PASS: Onboarding packet generated with user-specific personalization.")

            # ------------------------------------------------------------------
            # Test 5: Offboarding Knowledge & Reassignment
            # ------------------------------------------------------------------
            print("\nTest 5: Offboarding Handoffs & Knowledge Scan...")
            # Generate exit packet for Developer, reassigning their tasks to Designer
            res = client.post(
                "/api/handoff/offboard",
                json={
                    "departing_user_id": developer.id,
                    "reassign_to_user_id": designer.id
                },
                headers=founder_headers
            )
            assert res.status_code == 200
            offboard_data = res.get_json()
            
            # Assert task was reassigned in database
            assert offboard_data["reassigned_count"] == 1
            updated_task = Task.query.get(dev_task.id)
            assert updated_task.assignee_id == designer.id
            
            # Verify exit narrative shows the knowledge scan (Developer attended Weekly Review Meeting)
            exit_markdown = offboard_data["markdown"]
            assert "Weekly Review Meeting" in exit_markdown
            print("   PASS: Departing member tasks reassigned and knowledge swept.")

            # ------------------------------------------------------------------
            # Test 6: Startup Chronicle & Pagination
            # ------------------------------------------------------------------
            print("\nTest 6: Startup Chronicle & Pagination...")
            # Query chronicle with limit 1
            res = client.get("/api/chronicle?limit=1&offset=0", headers=founder_headers)
            assert res.status_code == 200
            chronicle_data = res.get_json()
            
            # Verify pagination has_more is true
            assert len(chronicle_data["events"]) == 1
            assert chronicle_data["has_more"] is True
            assert chronicle_data["total"] > 1

            # Query chronicle with high limit
            res = client.get(f"/api/chronicle?limit=100&offset=0", headers=founder_headers)
            chronicle_data_full = res.get_json()
            assert chronicle_data_full["has_more"] is False
            print("   PASS: Chronicle timeline compiled and paginated properly.")

            print("\n====================================================")
            print("Phase 4 Automated Verification Completed Successfully!")
            print("====================================================")

if __name__ == "__main__":
    run_tests()
