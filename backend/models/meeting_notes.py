from config.database import db
from datetime import datetime

class MeetingNotes(db.Model):
    __tablename__ = "meeting_notes"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text, nullable=True)
    attendees = db.Column(db.Text, nullable=True)
    date = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True)
    follow_up_at = db.Column(db.DateTime, nullable=True)
    duration = db.Column(db.Integer, nullable=True)

    # Phase 5 upgrades
    meeting_type = db.Column(db.String(100), nullable=True)
    tags = db.Column(db.Text, nullable=True)
    agenda = db.Column(db.Text, nullable=True)
    recording_url = db.Column(db.String(500), nullable=True)
    calendar_event_id = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), default='Draft', nullable=False)

    # Phase 6 — meeting intelligence fields
    source_integration = db.Column(db.String(100), nullable=True)
    source_event_id = db.Column(db.String(255), nullable=True)
    key_topics = db.Column(db.JSON, nullable=True)
    decisions_made = db.Column(db.JSON, nullable=True)
    action_items = db.Column(db.JSON, nullable=True)
    follow_up_needed = db.Column(db.Boolean, default=False, nullable=True)
    follow_up_note = db.Column(db.Text, nullable=True)

    # AI status tracking
    ai_status = db.Column(db.String(50), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    dismissed_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    linked_tasks = db.relationship('Task', foreign_keys='Task.linked_meeting_id', backref=db.backref('linked_meeting_ref', lazy=True), lazy='select')
    linked_decisions = db.relationship('DecisionLog', foreign_keys='DecisionLog.linked_meeting_id', backref=db.backref('linked_meeting_ref', lazy=True), lazy='select')

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "summary": self.summary,
            "attendees": self.attendees,
            "date": self.date.isoformat() if self.date else None,
            "created_by": self.created_by,
            "workspace_id": self.workspace_id,
            "follow_up_at": self.follow_up_at.isoformat() if self.follow_up_at else None,
            "duration": self.duration,
            "meeting_type": self.meeting_type,
            "tags": self.tags,
            "agenda": self.agenda,
            "recording_url": self.recording_url,
            "calendar_event_id": self.calendar_event_id,
            "status": self.status or "Draft",
            "source_integration": self.source_integration,
            "source_event_id": self.source_event_id,
            "key_topics": self.key_topics or [],
            "decisions_made": self.decisions_made or [],
            "action_items": self.action_items or [],
            "follow_up_needed": self.follow_up_needed or False,
            "follow_up_note": self.follow_up_note or "",
            "ai_status": self.ai_status,
            "confirmed_at": self.confirmed_at.isoformat() if self.confirmed_at else None,
            "dismissed_at": self.dismissed_at.isoformat() if self.dismissed_at else None,
            "linked_decision_ids": [d.id for d in self.linked_decisions] if self.linked_decisions else [],
            "linked_task_ids": [t.id for t in self.linked_tasks] if self.linked_tasks else []
        }

    def __repr__(self):
        return f"<MeetingNotes {self.title}>"
