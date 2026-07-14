from config.database import db
from datetime import datetime

class FollowUp(db.Model):
    __tablename__ = "follow_ups"

    id = db.Column(db.Integer, primary_key=True)
    person_name = db.Column(db.String(100), nullable=False)
    last_contact_date = db.Column(db.DateTime, nullable=True)
    followup_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), default='pending', nullable=False)  # 'pending', 'completed', 'dismissed', 'resolved'
    linked_meeting_id = db.Column(db.Integer, db.ForeignKey('meeting_notes.id', ondelete='SET NULL'), nullable=True)
    linked_task_id = db.Column(db.Integer, db.ForeignKey('tasks.id', ondelete='SET NULL'), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    context = db.Column(db.Text, nullable=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    source = db.Column(db.String(50), default='meeting', nullable=True)
    source_event_id = db.Column(db.String(255), nullable=True)
    priority = db.Column(db.String(20), default='normal', nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "person_name": self.person_name,
            "last_contact_date": self.last_contact_date.isoformat() if self.last_contact_date else None,
            "followup_date": self.followup_date.isoformat() if self.followup_date else None,
            "status": self.status,
            "linked_meeting_id": self.linked_meeting_id,
            "linked_task_id": self.linked_task_id,
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "source": self.source,
            "source_event_id": self.source_event_id,
            "priority": self.priority,
        }

    def __repr__(self):
        return f"<FollowUp {self.person_name}>"
