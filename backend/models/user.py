from config.database import db
from datetime import datetime
import hashlib
import bcrypt

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    email = db.Column(db.String(120), unique=True, nullable=False)
    google_id = db.Column(db.String(200), unique=True)
    password_hash = db.Column(db.String(255), nullable=True)
    timezone = db.Column(db.String(100), default="UTC", nullable=False)
    locale = db.Column(db.String(20), default="en-US", nullable=False)
    theme = db.Column(db.String(20), default="dark", nullable=False)
    date_format = db.Column(db.String(20), default="MM/DD/YYYY", nullable=False)
    week_start_day = db.Column(db.String(10), default="monday", nullable=False)
    totp_secret = db.Column(db.String(255), nullable=True)
    totp_enabled = db.Column(db.Boolean, default=False, nullable=False)
    avatar_url = db.Column(db.String(500), nullable=True)
    avatar_updated_at = db.Column(db.DateTime, nullable=True)
    recovery_codes = db.Column(db.Text, nullable=True)
    password_reset_token = db.Column(db.String(200), nullable=True)
    password_reset_expires = db.Column(db.DateTime, nullable=True)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verify_token = db.Column(db.String(200), nullable=True)
    token_version = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    @staticmethod
    def hash_token(token):
        return hashlib.sha256(token.encode()).hexdigest()

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "google_id": self.google_id,
            "timezone": self.timezone,
            "locale": self.locale,
            "theme": self.theme,
            "date_format": self.date_format,
            "week_start_day": self.week_start_day,
            "totp_enabled": self.totp_enabled,
            "avatar_url": self.avatar_url,
            "created_at": (self.created_at.isoformat() + "Z") if self.created_at else None
        }

    def __repr__(self):
        return f"<User {self.email}>"