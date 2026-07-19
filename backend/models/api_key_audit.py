from config.database import db
from datetime import datetime

class ApiKeyAuditLog(db.Model):
    __tablename__ = "api_key_audit_logs"
    
    id = db.Column(db.Integer, primary_key=True)
    api_key_id = db.Column(db.Integer, db.ForeignKey('api_keys.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # create, revoke, hard_delete, rename, used
    details = db.Column(db.Text, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    api_key = db.relationship('ApiKey', backref=db.backref('audit_logs', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('api_key_audit_logs', lazy=True))
    
    def to_dict(self):
        return {
            "id": self.id,
            "api_key_id": self.api_key_id,
            "action": self.action,
            "details": self.details,
            "ip_address": self.ip_address,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def __repr__(self):
        return f"<ApiKeyAuditLog {self.action} for Key {self.api_key_id}>"
