from config.database import db
from datetime import datetime

class AiFeedback(db.Model):
    __tablename__ = "ai_feedback"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    suggestion_type = db.Column(db.String(50), nullable=False)
    suggestion_key = db.Column(db.String(255), nullable=False)
    action = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "suggestion_type": self.suggestion_type,
            "suggestion_key": self.suggestion_key,
            "action": self.action,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
