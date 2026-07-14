from config.database import db
from datetime import datetime

class NotificationPreference(db.Model):
    __tablename__ = "notification_preferences"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    rule_key = db.Column(db.String(100), nullable=False)
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    delivery_method = db.Column(db.String(20), default="in_app", nullable=False)
    sound_enabled = db.Column(db.Boolean, default=True, nullable=False)
    quiet_hours_start = db.Column(db.String(5), nullable=True)
    quiet_hours_end = db.Column(db.String(5), nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'workspace_id', 'rule_key', name='uq_user_ws_notification_rule'),
    )

    user = db.relationship('User', backref=db.backref('notification_preferences', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "rule_key": self.rule_key,
            "enabled": self.enabled,
            "delivery_method": self.delivery_method,
            "sound_enabled": self.sound_enabled,
            "quiet_hours_start": self.quiet_hours_start,
            "quiet_hours_end": self.quiet_hours_end,
            "updated_at": (self.updated_at.isoformat() + "Z") if self.updated_at else None
        }

    def __repr__(self):
        return f"<NotificationPreference {self.rule_key}={self.enabled} for User {self.user_id} in WS {self.workspace_id}>"


class InAppNotification(db.Model):
    __tablename__ = "in_app_notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=True)
    notification_type = db.Column(db.String(100), nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('in_app_notifications', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "workspace_id": self.workspace_id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "is_read": self.is_read,
            "created_at": (self.created_at.isoformat() + "Z") if self.created_at else None
        }

    def __repr__(self):
        return f"<InAppNotification {self.notification_type}: {self.title[:30]}>"
