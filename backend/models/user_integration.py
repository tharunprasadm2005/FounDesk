from config.database import db
from datetime import datetime

class UserIntegration(db.Model):
    __tablename__ = "user_integrations"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    provider = db.Column(db.String(50), nullable=False)  # 'google', 'slack', 'github'
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    connected_email = db.Column(db.String(120), nullable=True)
    property_id = db.Column(db.String(255), nullable=True)
    workspace_ids = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', backref=db.backref('integrations', lazy=True, cascade='all, delete-orphan'))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "provider": self.provider,
            "connected_email": self.connected_email,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<UserIntegration {self.provider} for User {self.user_id}>"
