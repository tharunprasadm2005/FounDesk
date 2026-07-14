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
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
from services.activity_compiler import compile_activity_feed

def make_token(user):
    return jwt.encode({
        "user_id": user.id,
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(days=1)
    }, app.config['SECRET_KEY'], algorithm="HS256")

def test_google_analytics_integration():
    print("====================================================")
    print("Verifying Google Analytics Integration & Feeds:")
    print("====================================================")
    
    with app.test_client() as client:
        with app.app_context():
            # 1. Seed user & workspace
            user = User.query.filter_by(email="ga_test_user@foundesk.com").first()
            if not user:
                user = User(email="ga_test_user@foundesk.com", name="GA Test User", google_id="ga_mock_test_123")
                db.session.add(user)
                db.session.commit()

            workspace = Workspace.query.filter_by(name="GA Test Workspace").first()
            if not workspace:
                workspace = Workspace(name="GA Test Workspace", creator_id=user.id)
                db.session.add(workspace)
                db.session.commit()

            # Ensure workspace member connection
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

            # Clean up old integrations
            UserIntegration.query.filter(UserIntegration.user_id == user.id, UserIntegration.provider.in_(["google", "google_analytics"])).delete()
            ActivityEvent.query.filter_by(workspace_id=workspace.id, provider="google_analytics").delete()
            db.session.commit()

            # 2. Test without integration connected -> Expect no GA compiled feed items
            print("Test 1: Compiling feed without Google Analytics connected...")
            compile_activity_feed(workspace.id)
            ga_events = ActivityEvent.query.filter_by(workspace_id=workspace.id, provider="google_analytics").all()
            assert len(ga_events) == 0
            print("   👉 PASS: No events created when integration is absent.")

            # 3. Connect mock google integration
            integration = UserIntegration(
                user_id=user.id,
                provider="google",
                access_token="mock_access_token_google",
                connected_email="ga-sandbox-dev@test.com"
            )
            db.session.add(integration)
            
            ga_integration = UserIntegration(
                user_id=user.id,
                provider="google_analytics",
                access_token="property_id_placeholder",
                property_id="mock_up"
            )
            db.session.add(ga_integration)
            db.session.commit()

            # 4. Compile with mock_up -> Expect traffic increase event
            print("Test 2: Compiling feed with mock_up (traffic increase)...")
            compile_activity_feed(workspace.id)
            ga_events = ActivityEvent.query.filter_by(workspace_id=workspace.id, provider="google_analytics").all()
            assert len(ga_events) == 1
            event = ga_events[0]
            assert "Traffic increased to 120" in event.title
            assert event.priority == "medium"
            print("   👉 PASS: Compiled increase alert correctly.")

            # 5. Compile with mock_down -> Expect traffic decrease event
            print("Test 3: Compiling feed with mock_down (traffic decrease)...")
            ActivityEvent.query.filter_by(workspace_id=workspace.id, provider="google_analytics").delete()
            ga_int_record = UserIntegration.query.filter_by(user_id=user.id, provider="google_analytics").first()
            ga_int_record.property_id = "mock_down"
            db.session.commit()
            compile_activity_feed(workspace.id)
            
            ga_events = ActivityEvent.query.filter_by(workspace_id=workspace.id, provider="google_analytics").all()
            assert len(ga_events) == 1
            event = ga_events[0]
            assert "Traffic dropped to 80" in event.title
            assert event.priority == "high"
            print("   👉 PASS: Compiled decrease alert correctly.")

            # 6. Test GET /api/unified-feed endpoint
            print("Test 4: Requesting GET /api/unified-feed endpoint...")
            res = client.get("/api/unified-feed", headers=headers)
            assert res.status_code == 200
            res_data = res.get_json()
            assert "feed" in res_data
            feed = res_data["feed"]
            
            # Find the analytics metric item in feed
            analytics_item = next((item for item in feed if item["source"] == "analytics"), None)
            assert analytics_item is not None
            assert analytics_item["type"] == "metric"
            assert "Traffic dropped to 80" in analytics_item["title"]
            assert analytics_item["priority"] == "high"
            print("   👉 PASS: Unified feed routes return mapped analytics item.")

            # Cleanup seeded data
            UserIntegration.query.filter(UserIntegration.user_id == user.id, UserIntegration.provider.in_(["google", "google_analytics"])).delete()
            WorkspaceMember.query.filter_by(workspace_id=workspace.id, user_id=user.id).delete()
            Workspace.query.filter_by(id=workspace.id).delete()
            User.query.filter_by(id=user.id).delete()
            db.session.commit()

            print("\n====================================================")
            print("All Google Analytics route verification tests passed! [SUCCESS]")
            print("====================================================")

if __name__ == "__main__":
    test_google_analytics_integration()
