from config.database import db
from datetime import datetime
import secrets


class RefreshToken(db.Model):
    __tablename__ = "refresh_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = db.Column(db.String(128), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked = db.Column(db.Boolean, default=False, nullable=False)
    user_agent = db.Column(db.String(500), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    last_used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship("User", backref=db.backref("refresh_tokens", lazy=True, cascade="all, delete-orphan"))

    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(48)

    @staticmethod
    def hash_token(token):
        import hashlib
        return hashlib.sha256(token.encode()).hexdigest()

    def is_valid(self):
        return not self.revoked and self.expires_at > datetime.utcnow()
