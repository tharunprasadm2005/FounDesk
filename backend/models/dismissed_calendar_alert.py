from config.database import db
from datetime import datetime

class DismissedCalendarAlert(db.Model):
    __tablename__ = "dismissed_calendar_alerts"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    event_title = db.Column(db.String(255), nullable=False)
    event_end_time = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "event_title": self.event_title,
            "event_end_time": self.event_end_time.isoformat() if self.event_end_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<DismissedCalendarAlert {self.event_title} ended at {self.event_end_time} in WS {self.workspace_id}>"
