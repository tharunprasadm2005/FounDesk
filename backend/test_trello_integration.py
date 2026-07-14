import os
import sys
import jwt
from datetime import datetime, timedelta

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from app import app
from config.database import db
from models.user import User
from models.user_integration import UserIntegration
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember

def make_token(user):
    return jwt.encode({
        "user_id": user.id,
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=1)
    }, app.config['SECRET_KEY'], algorithm="HS256")

def test_trello_integration():
    print("====================================================")
    print("Verifying Trello Integration & Route Endpoints:")
    print("====================================================")
    
    with app.test_client() as client:
        with app.app_context():
            # 1. Seed user & workspace
            user = User.query.filter_by(email="trello_test_user@foundesk.com").first()
            if not user:
                user = User(email="trello_test_user@foundesk.com", name="Trello Test User", google_id="trello_mock_test_123")
                db.session.add(user)
                db.session.commit()

            workspace = Workspace.query.filter_by(name="Trello Test Workspace").first()
            if not workspace:
                workspace = Workspace(name="Trello Test Workspace", creator_id=user.id)
                db.session.add(workspace)
                db.session.commit()

            member = WorkspaceMember.query.filter_by(workspace_id=workspace.id, user_id=user.id).first()
            if not member:
                member = WorkspaceMember(
                    workspace_id=workspace.id,
                    user_id=user.id,
                    email=user.email,
                    role="founder",
                    status="active"
                )
                db.session.add(member)
                db.session.commit()

            token = make_token(user)
            headers = {"Authorization": f"Bearer {token}"}

            # Cleanup old connections
            UserIntegration.query.filter_by(user_id=user.id, provider="trello").delete()
            db.session.commit()

            # 2. Test without integration connected -> Expect 400
            print("Test 1: Querying endpoints when Trello is disconnected...")
            for endpoint in ["/api/trello/me", "/api/trello/boards", "/api/trello/summary"]:
                res = client.get(endpoint, headers=headers)
                assert res.status_code == 400
                assert "Trello not connected" in res.get_json()["error"]
            print("   👉 PASS: Blocked queries correctly with 400 when not connected.")

            # 3. Create mock trello connection
            integration = UserIntegration(
                user_id=user.id,
                provider="trello",
                access_token="mock_access_token_trello",
                connected_email="trello_sandbox_user"
            )
            db.session.add(integration)
            db.session.commit()

            # 4. Test GET /api/trello/me
            print("Test 2: GET /api/trello/me...")
            res = client.get("/api/trello/me", headers=headers)
            assert res.status_code == 200
            me_data = res.get_json()
            assert me_data["username"] == "trello_sandbox_user"
            print("   👉 PASS: Retrieved profile details successfully.")

            # 5. Test GET /api/trello/boards
            print("Test 3: GET /api/trello/boards...")
            res = client.get("/api/trello/boards", headers=headers)
            assert res.status_code == 200
            boards = res.get_json()
            assert len(boards) == 2
            assert boards[0]["name"] == "Product Backlog"
            print("   👉 PASS: Retrieved active boards successfully.")

            # 6. Test GET /api/trello/boards/<id>/lists
            print("Test 4: GET /api/trello/boards/<board_id>/lists...")
            res = client.get("/api/trello/boards/board_1/lists", headers=headers)
            assert res.status_code == 200
            lists = res.get_json()
            assert len(lists) == 3
            assert lists[2]["name"] == "Done"
            print("   👉 PASS: Retrieved lists inside board successfully.")

            # 7. Test GET /api/trello/boards/<id>/cards
            print("Test 5: GET /api/trello/boards/<board_id>/cards...")
            res = client.get("/api/trello/boards/board_1/cards", headers=headers)
            assert res.status_code == 200
            cards = res.get_json()
            assert len(cards) == 3
            print("   👉 PASS: Retrieved cards inside board successfully.")

            # 8. Test GET /api/trello/summary
            print("Test 6: GET /api/trello/summary (Calculated Metrics)...")
            res = client.get("/api/trello/summary", headers=headers)
            assert res.status_code == 200
            summary = res.get_json()
            # Under mock calculations, we have 2 boards, 3 cards on the first board, 1 complete card, and 1 due today.
            assert summary["totalBoards"] == 2
            assert summary["totalCards"] == 3
            assert summary["completedCards"] == 1
            assert summary["dueTodayCards"] == 1
            print("   👉 PASS: Verified board/card summary calculations and date filtering.")

            # Cleanup seeded data
            UserIntegration.query.filter_by(user_id=user.id, provider="trello").delete()
            WorkspaceMember.query.filter_by(workspace_id=workspace.id, user_id=user.id).delete()
            Workspace.query.filter_by(id=workspace.id).delete()
            User.query.filter_by(id=user.id).delete()
            db.session.commit()

            print("\n====================================================")
            print("All Trello route verification tests passed! [SUCCESS]")
            print("====================================================")

if __name__ == "__main__":
    test_trello_integration()
