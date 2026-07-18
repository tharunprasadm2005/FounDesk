from flask import request
from config.database import db
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.user import User


def get_current_workspace_id(user_id, allow_auto_create=None):
    workspace_id_str = None
    try:
        workspace_id_str = request.headers.get('X-Workspace-Id')
    except RuntimeError:
        pass

    if workspace_id_str:
        try:
            workspace_id = int(workspace_id_str)
            member = WorkspaceMember.query.filter_by(
                workspace_id=workspace_id,
                user_id=user_id,
                status='active'
            ).first()
            if member:
                return workspace_id
        except ValueError:
            pass

    member = WorkspaceMember.query.filter_by(user_id=user_id, status='active').first()
    if member:
        return member.workspace_id

    if allow_auto_create is None:
        try:
            allow_auto_create = request.method in ('POST', 'PUT', 'DELETE', 'PATCH')
        except RuntimeError:
            allow_auto_create = False

    if not allow_auto_create:
        return None

    user = User.query.get(user_id)
    if user:
        name = f"{user.name.split(' ')[0]}'s Workspace"
        default_ws = Workspace(
            name=name,
            stage="Build",
            creator_id=user_id
        )
        db.session.add(default_ws)
        db.session.commit()

        member = WorkspaceMember(
            workspace_id=default_ws.id,
            user_id=user_id,
            email=user.email,
            role="founder",
            status="active"
        )
        db.session.add(member)
        db.session.commit()

        return default_ws.id

    return None
