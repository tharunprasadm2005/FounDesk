from config.database import db
from datetime import datetime

class WorkspaceMember(db.Model):
    __tablename__ = "workspace_members"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=True)
    email = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='member', nullable=False)
    status = db.Column(db.String(50), default='pending', nullable=False)
    title = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    workspace = db.relationship('Workspace', backref=db.backref('memberships', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('workspace_memberships', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "user_id": self.user_id,
            "email": self.email,
            "role": self.role,
            "status": self.status,
            "title": self.title,
            "created_at": (self.created_at.isoformat() + "Z") if self.created_at else None,
            "user_name": self.user.name if self.user else None
        }

    def __repr__(self):
        return f"<WorkspaceMember {self.email} in WS {self.workspace_id}>"
