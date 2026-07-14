from config.database import db
from datetime import datetime

class SubTeam(db.Model):
    __tablename__ = "sub_teams"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    workspace = db.relationship('Workspace', backref=db.backref('sub_teams', lazy=True, cascade='all, delete-orphan'))
    creator = db.relationship('User', backref=db.backref('created_teams', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "name": self.name,
            "description": self.description,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "member_count": len(self.members) if self.members else 0
        }

    def __repr__(self):
        return f"<SubTeam {self.name} in WS {self.workspace_id}>"


class SubTeamMember(db.Model):
    __tablename__ = "sub_team_members"

    id = db.Column(db.Integer, primary_key=True)
    sub_team_id = db.Column(db.Integer, db.ForeignKey('sub_teams.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    role = db.Column(db.String(50), default='member', nullable=False)

    sub_team = db.relationship('SubTeam', backref=db.backref('members', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('team_memberships', lazy=True))

    __table_args__ = (
        db.UniqueConstraint('sub_team_id', 'user_id', name='uq_sub_team_user'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "sub_team_id": self.sub_team_id,
            "user_id": self.user_id,
            "role": self.role,
            "user_name": self.user.name if self.user else None,
            "user_email": self.user.email if self.user else None
        }

    def __repr__(self):
        return f"<SubTeamMember User {self.user_id} in Team {self.sub_team_id}>"
