from config.database import db
from datetime import datetime

class Waitlist(db.Model):
    __tablename__ = "waitlist"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    source = db.Column(db.String(100), default='landing_page')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<Waitlist {self.email}>"
