from config.database import db
from datetime import datetime

task_links = db.Table('task_links',
    db.Column('task_id', db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), primary_key=True),
    db.Column('linked_task_id', db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), primary_key=True)
)

class Task(db.Model):
    __tablename__ = "tasks"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(50), default='P2', nullable=False)
    status = db.Column(db.String(50), default='Not Started', nullable=False)
    deadline = db.Column(db.DateTime, nullable=True)
    assignee_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    goal_id = db.Column(db.Integer, db.ForeignKey('goals.id', ondelete='SET NULL'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    blocked_at = db.Column(db.DateTime, nullable=True)
    estimated_hours = db.Column(db.Integer, nullable=True)
    started_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    phase_tag = db.Column(db.String(100), nullable=True)
    is_seen = db.Column(db.Boolean, default=False, nullable=False)
    blocker_description = db.Column(db.Text, nullable=True)

    linked_decision_id = db.Column(db.Integer, db.ForeignKey('decision_logs.id', ondelete='SET NULL'), nullable=True)
    linked_meeting_id = db.Column(db.Integer, db.ForeignKey('meeting_notes.id', ondelete='SET NULL'), nullable=True)

    source = db.Column(db.String(100), default='manual', nullable=True)
    source_category = db.Column(db.String(100), nullable=True)
    source_ref = db.Column(db.String(255), nullable=True)
    source_integration = db.Column(db.String(100), nullable=True)
    source_event_id = db.Column(db.Integer, db.ForeignKey('raw_events.id', ondelete='SET NULL'), nullable=True)
    confidence_score = db.Column(db.Float, nullable=True)
    source_signal = db.Column(db.String(50), nullable=True)
    progress_percentage = db.Column(db.Integer, nullable=True)
    risk_level = db.Column(db.String(20), nullable=True)
    ai_status = db.Column(db.String(50), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    dismissed_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    parent_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True)
    sub_tasks = db.relationship('Task', backref=db.backref('parent', remote_side=[id]), cascade='all, delete-orphan')

    related_tasks = db.relationship(
        'Task', secondary=task_links,
        primaryjoin="Task.id == task_links.c.task_id",
        secondaryjoin="Task.id == task_links.c.linked_task_id",
        lazy='select'
    )

    goal = db.relationship('Goal', backref=db.backref('tasks', lazy=True))

    def to_dict(self):
        active_blocker_ids = [b.id for b in self.blockers if b.status == "open"] if self.blockers else []
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "assignee_id": self.assignee_id,
            "goal_id": self.goal_id,
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "parent_id": self.parent_id,
            "is_blocked": self.blocked_at is not None or len(active_blocker_ids) > 0,
            "blocked_at": self.blocked_at.isoformat() if self.blocked_at else None,
            "blocker_description": self.blocker_description,
            "active_blocker_ids": active_blocker_ids,
            "active_blockers": [{"id": b.id, "title": b.title, "severity": b.severity} for b in (self.blockers or []) if b.status == "open"],
            "blocker_count": len(active_blocker_ids),
            "estimated_hours": self.estimated_hours,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "phase_tag": self.phase_tag,
            "is_seen": self.is_seen,
            "linked_decision_id": self.linked_decision_id,
            "linked_meeting_id": self.linked_meeting_id,
            "progress_percentage": self.progress_percentage,
            "risk_level": self.risk_level,
            "linked_task_ids": [t.id for t in self.related_tasks] if self.related_tasks else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "sub_tasks": [st.to_dict() for st in self.sub_tasks] if self.sub_tasks else [],
            "source": self.source,
            "source_category": self.source_category,
            "source_ref": self.source_ref,
            "source_integration": self.source_integration,
            "source_event_id": self.source_event_id,
            "confidence_score": self.confidence_score,
            "source_signal": self.source_signal,
            "ai_status": self.ai_status,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
            "dismissed_at": self.dismissed_at.isoformat() if self.dismissed_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }

    def __repr__(self):
        return f"<Task {self.title}>"
