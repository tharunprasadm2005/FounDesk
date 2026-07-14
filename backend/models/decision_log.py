from config.database import db
from datetime import datetime

class DecisionLog(db.Model):
    __tablename__ = "decision_logs"

    id = db.Column(db.Integer, primary_key=True)
    decision = db.Column(db.Text, nullable=False)
    context = db.Column(db.Text, nullable=True)
    alternatives = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    attendees = db.Column(db.Text, nullable=True)
    startup_stage = db.Column(db.String(100), nullable=True)
    linked_meeting_id = db.Column(db.Integer, db.ForeignKey('meeting_notes.id', ondelete='SET NULL'), nullable=True)

    status = db.Column(db.String(50), default='Proposed', nullable=False)
    consequences = db.Column(db.Text, nullable=True)
    superseded_by_id = db.Column(db.Integer, db.ForeignKey('decision_logs.id', ondelete='SET NULL'), nullable=True)

    superseded_by = db.relationship('DecisionLog', remote_side=[id], backref=db.backref('supersedes', lazy='dynamic'), foreign_keys=[superseded_by_id])

    source = db.Column(db.String(100), default='manual', nullable=True)
    source_ref = db.Column(db.String(255), nullable=True)
    source_integration = db.Column(db.String(100), nullable=True)
    source_event_id = db.Column(db.Integer, db.ForeignKey('raw_events.id', ondelete='SET NULL'), nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    decision_type = db.Column(db.String(50), nullable=True)
    source_signal = db.Column(db.String(50), nullable=True)
    ai_status = db.Column(db.String(50), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    dismissed_at = db.Column(db.DateTime, nullable=True)

    linked_tasks = db.relationship('Task', foreign_keys='Task.linked_decision_id', backref=db.backref('linked_decision_ref', lazy=True), lazy='select')

    def to_dict(self):
        linked_goal_ids = []
        try:
            if self.linked_goals:
                linked_goal_ids = [g.id for g in self.linked_goals]
        except Exception:
            pass
        return {
            "id": self.id,
            "decision": self.decision,
            "context": self.context,
            "alternatives": self.alternatives,
            "created_by": self.created_by,
            "workspace_id": self.workspace_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "attendees": self.attendees,
            "startup_stage": self.startup_stage,
            "linked_meeting_id": self.linked_meeting_id,
            "linked_task_ids": [t.id for t in self.linked_tasks] if self.linked_tasks else [],
            "linked_goal_ids": linked_goal_ids,
            "status": self.status or "Proposed",
            "consequences": self.consequences,
            "superseded_by_id": self.superseded_by_id,
            "source": self.source,
            "source_ref": self.source_ref,
            "source_integration": self.source_integration,
            "source_event_id": self.source_event_id,
            "confidence_score": self.confidence_score,
            "decision_type": self.decision_type,
            "source_signal": self.source_signal,
            "ai_status": self.ai_status,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
            "dismissed_at": self.dismissed_at.isoformat() if self.dismissed_at else None
        }

    def __repr__(self):
        return f"<DecisionLog {self.id} {self.decision[:20]}...>"
