from config.database import db
from datetime import datetime

goal_decisions = db.Table('goal_decisions',
    db.Column('goal_id', db.Integer, db.ForeignKey('goals.id', ondelete='CASCADE'), primary_key=True),
    db.Column('decision_log_id', db.Integer, db.ForeignKey('decision_logs.id', ondelete='CASCADE'), primary_key=True),
)

class Goal(db.Model):
    __tablename__ = "goals"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    goal_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(50), default='pending', nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('goals.id', ondelete='CASCADE'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True)
    date = db.Column(db.Date, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    source = db.Column(db.String(100), default='manual', nullable=True)
    source_ref = db.Column(db.String(255), nullable=True)
    source_integration = db.Column(db.String(100), nullable=True)
    source_event_id = db.Column(db.Integer, db.ForeignKey('raw_events.id', ondelete='SET NULL'), nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    source_signal = db.Column(db.String(50), nullable=True)
    ai_status = db.Column(db.String(50), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    dismissed_at = db.Column(db.DateTime, nullable=True)

    sub_goals = db.relationship('Goal', backref=db.backref('parent', remote_side=[id]), cascade='all, delete-orphan')
    linked_decisions = db.relationship('DecisionLog', secondary=goal_decisions, backref=db.backref('linked_goals', lazy='dynamic'), lazy='select')

    def to_dict(self):
        # Monthly goals compute progress from their weekly sub-goals
        if self.goal_type == 'monthly':
            sub_goals = self.sub_goals or []
            if sub_goals:
                progresses = [sg.to_dict()['progress'] for sg in sub_goals]
                progress = int(sum(progresses) / len(sub_goals))
            else:
                progress = 0
        else:
            linked_tasks = self.tasks or []
            done_tasks = sum(1 for t in linked_tasks if t.status == "Done")
            linked_decisions = self.linked_decisions or []
            confirmed_decisions = sum(1 for d in linked_decisions if d.status in ("Confirmed", "Implemented"))
            numerator = done_tasks + confirmed_decisions
            denominator = len(linked_tasks) + len(linked_decisions)
            if denominator > 0:
                progress = round((numerator / denominator) * 100)
            elif self.status == 'completed':
                progress = 100
            elif self.date and self.created_at:
                now = datetime.utcnow().date()
                total = (self.date - self.created_at.date()).days
                elapsed = (now - self.created_at.date()).days
                progress = min(round((elapsed / max(total, 1)) * 100), 99) if total > 0 else 0
            else:
                progress = 0
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "goal_type": self.goal_type,
            "status": self.status,
            "progress": progress,
            "parent_id": self.parent_id,
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "due_date": self.due_date.isoformat() if self.due_date else (self.date.isoformat() if self.date else None),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "source": self.source,
            "source_ref": self.source_ref,
            "source_integration": self.source_integration,
            "source_event_id": self.source_event_id,
            "confidence_score": self.confidence_score,
            "source_signal": self.source_signal,
            "ai_status": self.ai_status,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
            "dismissed_at": self.dismissed_at.isoformat() if self.dismissed_at else None,
            "linked_decision_ids": [d.id for d in self.linked_decisions] if self.linked_decisions else [],
            "linked_task_ids": [t.id for t in self.tasks] if self.tasks else [],
        }

    def __repr__(self):
        return f"<Goal {self.title} ({self.goal_type})>"
