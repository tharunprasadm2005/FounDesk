from flask import request
from config.database import db
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.user import User

def get_current_workspace_id(user_id):
    # Retrieve X-Workspace-Id header
    workspace_id_str = None
    try:
        workspace_id_str = request.headers.get('X-Workspace-Id')
    except RuntimeError:
        # Outside request context (e.g. CLI testing scripts)
        pass
    
    if workspace_id_str:
        try:
            workspace_id = int(workspace_id_str)
            # Verify user is an active member of this workspace
            member = WorkspaceMember.query.filter_by(
                workspace_id=workspace_id,
                user_id=user_id,
                status='active'
            ).first()
            if member:
                return workspace_id
        except ValueError:
            pass
            
    # Default: Try to find any active workspace membership for user
    member = WorkspaceMember.query.filter_by(user_id=user_id, status='active').first()
    if member:
        return member.workspace_id
        
    # If no membership exists, auto-create a default workspace for user
    user = User.query.get(user_id)
    if user:
        # Create default workspace
        name = f"{user.name.split(' ')[0]}'s Workspace"
        default_ws = Workspace(
            name=name,
            stage="Build",
            creator_id=user_id
        )
        db.session.add(default_ws)
        db.session.commit()
        
        # Create active founder membership
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
