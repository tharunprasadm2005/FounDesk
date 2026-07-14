import unittest
import os
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

# Set test environment
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['SECRET_KEY'] = 'test_secret_key'
os.environ['SLACK_CLIENT_ID'] = 'test_slack_client_id'
os.environ['SLACK_CLIENT_SECRET'] = 'test_slack_client_secret'
os.environ['SLACK_REDIRECT_URI'] = 'http://localhost:5000/auth/slack/callback'

from app import app, db
from models.user import User
from models.workspace import Workspace
from models.user_integration import UserIntegration
from models.activity_event import ActivityEvent
import jwt

class TestSlackIntegration(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()
        db.create_all()

        # Clear existing tables to avoid duplicate key conflicts in SQLite in-memory
        ActivityEvent.query.delete()
        UserIntegration.query.delete()
        Workspace.query.delete()
        User.query.delete()
        db.session.commit()

        # Seed test user & workspace
        self.user = User(google_id="test_google_id", email="founder@test.com", name="Test Founder")
        db.session.add(self.user)
        db.session.commit()

        self.workspace = Workspace(name="Test Workspace", creator_id=self.user.id, stage="GTM")
        db.session.add(self.workspace)
        db.session.commit()

        # Generate auth header
        self.token = jwt.encode({
            "user_id": self.user.id,
            "email": self.user.email,
            "exp": datetime.utcnow() + timedelta(days=1)
        }, app.config['SECRET_KEY'], algorithm="HS256")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "X-Workspace-Id": str(self.workspace.id)
        }

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_auth_slack_redirect_missing_user_id(self):
        response = self.app.get('/auth/slack')
        self.assertEqual(response.status_code, 400)
        self.assertIn("user_id is required", response.get_data(as_text=True))

    def test_auth_slack_redirect_success(self):
        response = self.app.get('/auth/slack?user_id=1')
        self.assertEqual(response.status_code, 302)
        self.assertIn("https://slack.com/oauth/v2/authorize", response.headers.get("Location"))

    @patch('requests.post')
    def test_auth_slack_callback_exchange_and_save(self, mock_post):
        # Mock successful Slack OAuth response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "ok": True,
            "access_token": "xoxb-test-access-token",
            "team": {"name": "Test Slack Team"}
        }
        mock_post.return_value = mock_response

        # Execute callback
        response = self.app.get('/auth/slack/callback?code=test_code&state=slack_user_1')
        self.assertEqual(response.status_code, 302)
        self.assertIn("http://localhost:5173/settings?status=slack_connected", response.headers.get("Location"))

        # Verify integration row was saved in DB
        integration = UserIntegration.query.filter_by(user_id=1, provider="slack").first()
        self.assertIsNotNone(integration)
        self.assertEqual(integration.access_token, "xoxb-test-access-token")
        self.assertEqual(integration.connected_email, "Test Slack Team")

    def test_get_oauth_url_api(self):
        response = self.app.post('/api/integrations/oauth/url', 
                                headers=self.headers,
                                data=json.dumps({"provider": "slack"}),
                                content_type='application/json')
        self.assertEqual(response.status_code, 200)
        res_data = json.loads(response.get_data(as_text=True))
        self.assertIn("https://slack.com/oauth/v2/authorize", res_data.get("url"))
        self.assertIn(f"slack_user_{self.user.id}", res_data.get("url"))

    @patch('services.slack_service.get_channels')
    @patch('services.slack_service.get_messages')
    @patch('services.slack_service.get_users')
    def test_activity_compiler_slack_live(self, mock_users, mock_messages, mock_channels):
        # Seed integration in DB (real mode, not starting with mock_)
        integration = UserIntegration(
            user_id=self.user.id,
            provider="slack",
            access_token="slack_token_123", # not starting with "mock_"
            connected_email="Test Slack Workspace"
        )
        db.session.add(integration)
        db.session.commit()

        # Mock Slack service responses
        mock_channels.return_value = [{"id": "C123", "name": "general"}]
        mock_users.return_value = [{"id": "U456", "name": "sarah", "real_name": "Sarah Designer"}]
        mock_messages.return_value = [{
            "user": "U456",
            "text": "Hello team, let's sync up on designs.",
            "ts": "1718610000.0001"
        }]

        # Run compiler
        from services.activity_compiler import compile_activity_feed
        compile_activity_feed(self.workspace.id)

        # Assert ActivityEvent was stored
        evt = ActivityEvent.query.filter_by(workspace_id=self.workspace.id, provider="slack").first()
        self.assertIsNotNone(evt)
        self.assertEqual(evt.actor, "Sarah Designer")
        self.assertEqual(evt.title, "New message in #general")
        self.assertEqual(evt.details, "Hello team, let's sync up on designs.")

    @patch('services.slack_service.get_channels')
    @patch('services.slack_service.get_messages')
    @patch('services.slack_service.get_users')
    def test_get_unified_feed_endpoint(self, mock_users, mock_messages, mock_channels):
        # Mock Slack service responses
        mock_channels.return_value = [{"id": "C123", "name": "general"}]
        mock_users.return_value = [{"id": "U456", "name": "sarah", "real_name": "Sarah Designer"}]
        mock_messages.return_value = [{
            "user": "U456",
            "text": "Task updates.",
            "ts": "1718610000.0001"
        }]

        # Seed integration in DB
        integration = UserIntegration(
            user_id=self.user.id,
            provider="slack",
            access_token="slack_token_123",
            connected_email="Test Slack Workspace"
        )
        db.session.add(integration)
        db.session.commit()

        # Fetch feed
        response = self.app.get('/api/feed', headers=self.headers)
        self.assertEqual(response.status_code, 200)

        res_data = json.loads(response.get_data(as_text=True))
        self.assertEqual(len(res_data), 1)
        self.assertEqual(res_data[0]["source"], "slack")
        self.assertEqual(res_data[0]["user"], "Sarah Designer")
        self.assertEqual(res_data[0]["content"], "Task updates.")

if __name__ == '__main__':
    unittest.main()
