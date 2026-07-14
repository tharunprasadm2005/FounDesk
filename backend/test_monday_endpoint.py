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

def make_token(user):
    return jwt.encode({
        "user_id": user.id,
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=1)
    }, app.config['SECRET_KEY'], algorithm="HS256")

def test_monday_routes():
    print("====================================================")
    print("Verifying Monday.com routes:")
    print("GET /api/monday/profile")
    print("GET /api/monday/boards")
    print("GET /api/monday/items")
    print("GET /api/monday/updates")
    print("====================================================")
    
    with app.test_client() as client:
        with app.app_context():
            # Seed test user
            user = User.query.filter_by(email="monday_test_user@foundesk.com").first()
            if not user:
                user = User(email="monday_test_user@foundesk.com", name="Monday Test User", google_id="monday_mock_test_123")
                db.session.add(user)
                db.session.commit()
                
            token = make_token(user)
            headers = {"Authorization": f"Bearer {token}"}
            
            # Clean up existing Monday integration for user
            UserIntegration.query.filter_by(user_id=user.id, provider="monday").delete()
            db.session.commit()
            
            # 1. Test when Monday is not connected -> Expect 400 Bad Request
            print("Test 1: Requesting Monday data when integration is missing...")
            for endpoint in ["profile", "boards", "items", "updates"]:
                res = client.get(f"/api/monday/{endpoint}", headers=headers)
                assert res.status_code == 400
                data = res.get_json()
                assert data["error"] == "Monday.com not connected"
                print(f"   👉 PASS: /api/monday/{endpoint} returned 400 with 'Monday.com not connected'.")
            
            # 2. Test when mock Monday is connected -> Expect mock/sandbox data
            print("\nTest 2: Seeding mock Monday integration and requesting data...")
            integration = UserIntegration(
                user_id=user.id,
                provider="monday",
                access_token="mock_access_token_monday",
                connected_email="monday-sandbox-dev@test.com"
            )
            db.session.add(integration)
            db.session.commit()
            
            # Test /api/monday/profile
            res_profile = client.get("/api/monday/profile", headers=headers)
            assert res_profile.status_code == 200
            profile = res_profile.get_json()
            assert profile["id"] == "12345"
            assert profile["name"] == "Tharun Prasad"
            assert profile["email"] == "monday-sandbox-dev@test.com"
            print("   👉 PASS: /api/monday/profile returned valid sandbox user details.")
            
            # Test /api/monday/boards
            res_boards = client.get("/api/monday/boards", headers=headers)
            assert res_boards.status_code == 200
            boards = res_boards.get_json()
            assert len(boards) == 2
            assert boards[0]["name"] == "FounDesk Product Sprint"
            assert boards[1]["name"] == "Seed Round Marketing Pitch"
            print("   👉 PASS: /api/monday/boards returned sandbox boards.")
            
            # Test /api/monday/items
            res_items = client.get("/api/monday/items", headers=headers)
            assert res_items.status_code == 200
            items = res_items.get_json()
            assert len(items) == 2
            assert items[0]["name"] == "Design glassmorphism layouts"
            assert items[1]["name"] == "Setup PostgreSQL migrations"
            print("   👉 PASS: /api/monday/items returned sandbox tasks.")
            
            # Test /api/monday/updates
            res_updates = client.get("/api/monday/updates", headers=headers)
            assert res_updates.status_code == 200
            updates = res_updates.get_json()
            assert len(updates) == 1
            assert "Ready for test run" in updates[0]["body"]
            print("   👉 PASS: /api/monday/updates returned sandbox updates.")
            
            # Cleanup seeded data
            UserIntegration.query.filter_by(user_id=user.id, provider="monday").delete()
            User.query.filter_by(email="monday_test_user@foundesk.com").delete()
            db.session.commit()
            
            print("\n====================================================")
            print("All Monday route verification tests passed! [SUCCESS]")
            print("====================================================")

if __name__ == "__main__":
    test_monday_routes()
