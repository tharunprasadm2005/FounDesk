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

def test_github_route():
    print("====================================================")
    print("Verifying GitHub route: GET /api/github/data")
    print("====================================================")
    
    with app.test_client() as client:
        with app.app_context():
            # Seed test user
            user = User.query.filter_by(email="github_test_user@foundesk.com").first()
            if not user:
                user = User(email="github_test_user@foundesk.com", name="GitHub Test User", google_id="github_mock_test_123")
                db.session.add(user)
                db.session.commit()
                
            token = make_token(user)
            headers = {"Authorization": f"Bearer {token}"}
            
            # Clean up existing GitHub integration for user
            UserIntegration.query.filter_by(user_id=user.id, provider="github").delete()
            db.session.commit()
            
            # 1. Test when GitHub is not connected -> Expect 400 Bad Request
            print("Test 1: Requesting GitHub data when integration is missing...")
            res1 = client.get("/api/github/data", headers=headers)
            assert res1.status_code == 400
            data1 = res1.get_json()
            assert data1["error"] == "GitHub not connected"
            print("   👉 PASS: Correctly returned 400 and error message.")
            
            # 2. Test when mock GitHub is connected -> Expect mock repositories data
            print("\nTest 2: Seeding mock GitHub integration and requesting data...")
            integration = UserIntegration(
                user_id=user.id,
                provider="github",
                access_token="mock_access_token_github",
                connected_email="founder-sandbox-dev"
            )
            db.session.add(integration)
            db.session.commit()
            
            res2 = client.get("/api/github/data", headers=headers)
            assert res2.status_code == 200
            data2 = res2.get_json()
            assert "repositories" in data2
            repos = data2["repositories"]
            assert len(repos) == 2
            assert repos[0]["name"] == "foundesk-backend"
            assert repos[0]["language"] == "Python"
            assert repos[1]["name"] == "foundesk-frontend"
            assert repos[1]["language"] == "JavaScript"
            print("   👉 PASS: Correctly returned mock repositories lists for sandbox connection.")
            
            # Cleanup seeded data
            UserIntegration.query.filter_by(user_id=user.id, provider="github").delete()
            User.query.filter_by(email="github_test_user@foundesk.com").delete()
            db.session.commit()
            
            print("\n====================================================")
            print("All GitHub route verification tests passed! [SUCCESS]")
            print("====================================================")

if __name__ == "__main__":
    test_github_route()
