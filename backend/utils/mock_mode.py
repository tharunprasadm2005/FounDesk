from sqlalchemy import true
from config.database import db


def _user_has_mock_integration(user_id):
    if not user_id:
        return False
    from models.user_integration import UserIntegration
    for integration in UserIntegration.query.filter_by(user_id=user_id).all():
        token = integration.access_token
        if token and token.startswith("mock_"):
            return True
    return False


def user_in_mock_mode(user_id):
    """True if the user owns any mock-token integration (sandbox account)."""
    return _user_has_mock_integration(user_id)


def workspace_in_mock_mode(workspace_id):
    """True if the workspace's creator owns any mock-token integration (sandbox workspace)."""
    if not workspace_id:
        return False
    from models.workspace import Workspace
    ws = Workspace.query.get(workspace_id)
    if not ws or not ws.creator_id:
        return False
    return _user_has_mock_integration(ws.creator_id)


def mock_visibility_clause(workspace_id):
    """SQLAlchemy predicate for ActivityEvent reads.

    Real (non-mock) events are always visible. Mock events are only visible in
    sandbox workspaces whose creator has mock-token integrations, so isolated
    test/demo accounts can see fake data while real accounts never do.
    """
    from models.activity_event import ActivityEvent
    if workspace_in_mock_mode(workspace_id):
        return true()
    return ActivityEvent.is_mock == False