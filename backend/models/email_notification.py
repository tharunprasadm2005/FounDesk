from config.database import db
from datetime import datetime

class EmailNotification(db.Model):
    __tablename__ = "email_notifications"
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True)
    notification_type = db.Column(db.String(100), nullable=False)
    recipient_email = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(500), nullable=False)
    body_text = db.Column(db.Text, nullable=True)
    body_html = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='pending', nullable=False)  # pending, sent, failed
    error_message = db.Column(db.Text, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    user = db.relationship('User', backref=db.backref('email_notifications', lazy=True))
    
    def to_dict(self):
        return {
            "id": self.id,
            "notification_type": self.notification_type,
            "recipient_email": self.recipient_email,
            "subject": self.subject,
            "status": self.status,
            "error_message": self.error_message,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def __repr__(self):
        return f"<EmailNotification {self.notification_type} to {self.recipient_email}>"
