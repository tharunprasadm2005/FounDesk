from config.database import db
from datetime import datetime
import secrets

class ApiKey(db.Model):
    __tablename__ = "api_keys"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    key_prefix = db.Column(db.String(20), nullable=False)
    key_hash = db.Column(db.String(128), nullable=False)
    last_used_at = db.Column(db.DateTime, nullable=True)
    last_used_ip = db.Column(db.String(45), nullable=True)
    permissions = db.Column(db.JSON, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('api_keys', lazy=True, cascade='all, delete-orphan'))

    @staticmethod
    def generate_key():
        return "fd_" + secrets.token_hex(24)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "key_prefix": self.key_prefix + "...",
            "is_active": self.is_active,
            "last_used_at": self.last_used_at.isoformat() if self.last_used_at else None,
            "last_used_ip": self.last_used_ip,
            "permissions": self.permissions,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<ApiKey {self.name} for User {self.user_id}>"
