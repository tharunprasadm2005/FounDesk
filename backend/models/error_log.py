from config.database import db
from datetime import datetime


class ErrorLog(db.Model):
    __tablename__ = "error_logs"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, nullable=True)
    route = db.Column(db.String(255), nullable=True)
    method = db.Column(db.String(10), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    error_type = db.Column(db.String(100), nullable=True)
    user_id = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
