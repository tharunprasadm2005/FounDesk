from config.database import db
from datetime import datetime

class Blocker(db.Model):
    __tablename__ = "blockers"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(50), default='medium', nullable=False)
    status = db.Column(db.String(50), default='open', nullable=False)
    source_provider = db.Column(db.String(100), nullable=True)
    source_ref = db.Column(db.String(255), nullable=True)
    task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    resolved_at = db.Column(db.DateTime, nullable=True)
    source_integration = db.Column(db.String(100), nullable=True)
    source_event_id = db.Column(db.Integer, db.ForeignKey('raw_events.id', ondelete='SET NULL'), nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    source_signal = db.Column(db.String(50), nullable=True)
    ai_status = db.Column(db.String(50), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    dismissed_at = db.Column(db.DateTime, nullable=True)

    task = db.relationship('Task', backref=db.backref('blockers', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "status": self.status,
            "source_provider": self.source_provider,
            "source_ref": self.source_ref,
            "task_id": self.task_id,
            "assigned_to": self.assigned_to,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "source_integration": self.source_integration,
            "source_event_id": self.source_event_id,
            "confidence_score": self.confidence_score,
            "source_signal": self.source_signal,
            "ai_status": self.ai_status,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
            "dismissed_at": self.dismissed_at.isoformat() if self.dismissed_at else None
        }

    def __repr__(self):
        return f"<Blocker {self.title} ({self.status})>"
