import pytest
from models.user import User
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember

class TestUserModel:
    def test_create_user(self, app, client):
        with app.app_context():
            from config.database import db
            user = User(name="Test", email="test@example.com")
            user.set_password("StrongPass1!")
            db.session.add(user)
            db.session.commit()
            assert user.id is not None
            assert user.check_password("StrongPass1!")
            assert not user.check_password("wrong")

    def test_hash_token(self, app):
        token = User.hash_token("test-token")
        assert token == User.hash_token("test-token")
        assert token != User.hash_token("different")

class TestWorkspaceModel:
    def test_create_workspace(self, app, client):
        with app.app_context():
            from config.database import db
            ws = Workspace(name="Test Workspace", stage="Build", creator_id=1)
            db.session.add(ws)
            db.session.commit()
            assert ws.id is not None
            assert ws.name == "Test Workspace"

class TestWorkspaceMember:
    def test_create_member(self, app, client):
        with app.app_context():
            from config.database import db
            member = WorkspaceMember(workspace_id=1, user_id=1, email="test@example.com", role="owner", status="active")
            db.session.add(member)
            db.session.commit()
            assert member.id is not None
