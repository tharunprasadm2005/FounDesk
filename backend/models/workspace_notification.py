from config.database import db
from datetime import datetime

class WorkspaceNotification(db.Model):
    __tablename__ = "workspace_notifications"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    notification_type = db.Column(db.String(100), nullable=False)
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    channel = db.Column(db.String(50), default='all', nullable=False)
    frequency = db.Column(db.String(50), default='immediate', nullable=False)
    priority = db.Column(db.String(50), default='normal', nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    workspace = db.relationship('Workspace', backref=db.backref('notification_prefs', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('workspace_notification_prefs', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "user_id": self.user_id,
            "notification_type": self.notification_type,
            "enabled": self.enabled,
            "channel": self.channel,
            "frequency": self.frequency,
            "priority": self.priority,
        }

    def __repr__(self):
        return f"<WorkspaceNotification {self.notification_type} for WS {self.workspace_id}>"
