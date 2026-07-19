from config.database import db
from datetime import datetime

class ActivityEvent(db.Model):
    __tablename__ = "activity_events"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    provider = db.Column(db.String(100), nullable=False)  # 'gmail', 'google_calendar', 'github'
    category = db.Column(db.String(100), nullable=False)  # 'communication', 'calendar', 'dev'
    actor = db.Column(db.String(255), nullable=True)
    title = db.Column(db.Text, nullable=False)
    activity_type = db.Column(db.String(100), nullable=False)  # 'email', 'event', 'pull_request', 'issue'
    status = db.Column(db.String(100), nullable=True)
    external_timestamp = db.Column(db.DateTime, nullable=False)
    details = db.Column(db.Text, nullable=True)
    raw_ref = db.Column(db.String(255), nullable=False)
    is_mock = db.Column(db.Boolean, default=False, nullable=False)
    priority = db.Column(db.String(50), default='normal', nullable=False)
    fetched_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    meet_link = db.Column(db.Text, nullable=True)
    url = db.Column(db.Text, nullable=True)

    __table_args__ = (
        db.UniqueConstraint('workspace_id', 'provider', 'raw_ref', name='uq_workspace_provider_raw_ref'),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "provider": self.provider,
            "category": self.category,
            "actor": self.actor,
            "title": self.title,
            "activity_type": self.activity_type,
            "status": self.status,
            "external_timestamp": self.external_timestamp.isoformat() if self.external_timestamp else None,
            "details": self.details,
            "raw_ref": self.raw_ref,
            "is_mock": self.is_mock,
            "priority": self.priority,
            "fetched_at": self.fetched_at.isoformat() if self.fetched_at else None,
            "meet_link": self.meet_link,
            "url": self.url
        }

    def __repr__(self):
        return f"<ActivityEvent {self.provider} - {self.activity_type}: {self.title[:30]}>"
