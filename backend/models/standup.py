from config.database import db
from datetime import datetime
import json

class Standup(db.Model):
    __tablename__ = "standups"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    date = db.Column(db.String(10), nullable=False)  # Local date YYYY-MM-DD
    q1_yesterday = db.Column(db.Text, nullable=False)
    q2_today = db.Column(db.Text, nullable=False)
    q3_blockers = db.Column(db.Text, nullable=True)
    compiled_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', backref=db.backref('standups', lazy=True, cascade='all, delete-orphan'))
    workspace = db.relationship('Workspace', backref=db.backref('standups', lazy=True, cascade='all, delete-orphan'))

    def get_compiled(self):
        if self.compiled_json:
            try:
                return json.loads(self.compiled_json)
            except (json.JSONDecodeError, TypeError):
                return None
        return None

    def to_dict(self):
        d = {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else "Unknown Member",
            "workspace_id": self.workspace_id,
            "date": self.date,
            "q1_yesterday": self.q1_yesterday,
            "q2_today": self.q2_today,
            "q3_blockers": self.q3_blockers,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        compiled = self.get_compiled()
        if compiled:
            d["compiled"] = compiled
        return d

    def __repr__(self):
        return f"<Standup User {self.user_id} on {self.date}>"
