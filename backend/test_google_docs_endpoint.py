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

def test_google_docs_routes():
    print("====================================================")
    print("Verifying Google Docs routes:")
    print("GET /api/google-docs/recent")
    print("GET /api/google-docs/document/<document_id>")
    print("====================================================")
    
    with app.test_client() as client:
        with app.app_context():
            # Seed test user
            user = User.query.filter_by(email="google_docs_test_user@foundesk.com").first()
            if not user:
                user = User(email="google_docs_test_user@foundesk.com", name="Google Docs Test User", google_id="gdocs_mock_test_123")
                db.session.add(user)
                db.session.commit()
                
            token = make_token(user)
            headers = {"Authorization": f"Bearer {token}"}
            
            # Clean up existing Google integration for user
            UserIntegration.query.filter_by(user_id=user.id, provider="google").delete()
            db.session.commit()
            
            # 1. Test when Google Docs is not connected -> Expect 400 Bad Request
            print("Test 1: Requesting Google Docs data when integration is missing...")
            res_recent = client.get("/api/google-docs/recent", headers=headers)
            assert res_recent.status_code == 400
            data_recent = res_recent.get_json()
            assert data_recent["error"] == "Google account not connected"
            print("   👉 PASS: /api/google-docs/recent returned 400 with 'Google account not connected'.")
            
            res_doc = client.get("/api/google-docs/document/some_doc_id", headers=headers)
            assert res_doc.status_code == 400
            data_doc = res_doc.get_json()
            assert data_doc["error"] == "Google account not connected"
            print("   👉 PASS: /api/google-docs/document/some_doc_id returned 400 with 'Google account not connected'.")
            
            # 2. Test when mock Google is connected -> Expect mock/sandbox data
            print("\nTest 2: Seeding mock Google integration and requesting data...")
            integration = UserIntegration(
                user_id=user.id,
                provider="google",
                access_token="mock_access_token_google",
                connected_email="google-sandbox-dev@test.com"
            )
            db.session.add(integration)
            db.session.commit()
            
            # Test /api/google-docs/recent
            res_recent_mock = client.get("/api/google-docs/recent", headers=headers)
            assert res_recent_mock.status_code == 200
            docs_data = res_recent_mock.get_json()
            assert "documents" in docs_data
            docs = docs_data["documents"]
            assert len(docs) == 2
            assert docs[0]["title"] == "FounDesk Product Roadmap"
            assert docs[1]["title"] == "Seed Round Pitch Deck Outline"
            print("   👉 PASS: /api/google-docs/recent returned sandbox docs.")
            
            # Test /api/google-docs/document/mock_doc_1
            res_doc1 = client.get("/api/google-docs/document/mock_doc_1", headers=headers)
            assert res_doc1.status_code == 200
            doc1 = res_doc1.get_json()
            assert doc1["title"] == "FounDesk Product Roadmap"
            assert "Finish Monday integration." in doc1["content"]
            print("   👉 PASS: /api/google-docs/document/mock_doc_1 returned valid content.")
            
            # Test /api/google-docs/document/other_doc_id
            res_doc_other = client.get("/api/google-docs/document/other_doc_id", headers=headers)
            assert res_doc_other.status_code == 200
            doc_other = res_doc_other.get_json()
            assert doc_other["title"] == "Sandbox Document"
            assert "sandbox/mock document text content." in doc_other["content"]
            print("   👉 PASS: /api/google-docs/document/other_doc_id returned fallback sandbox content.")
            
            # Cleanup seeded data
            UserIntegration.query.filter_by(user_id=user.id, provider="google").delete()
            User.query.filter_by(email="google_docs_test_user@foundesk.com").delete()
            db.session.commit()
            
            print("\n====================================================")
            print("All Google Docs route verification tests passed! [SUCCESS]")
            print("====================================================")

if __name__ == "__main__":
    test_google_docs_routes()
