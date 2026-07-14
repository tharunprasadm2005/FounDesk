from config.database import db
from datetime import datetime

class RecurringWorkflow(db.Model):
    __tablename__ = "recurring_workflows"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    frequency = db.Column(db.String(50), nullable=False)  # 'weekly' or 'monthly'
    day_of_week = db.Column(db.Integer, nullable=True)  # 0-6 (0=Monday, 6=Sunday to match Python)
    day_of_month = db.Column(db.Integer, nullable=True)  # 1-31
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    last_generated_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "frequency": self.frequency,
            "day_of_week": self.day_of_week,
            "day_of_month": self.day_of_month,
            "workspace_id": self.workspace_id,
            "last_generated_at": self.last_generated_at.isoformat() if self.last_generated_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<RecurringWorkflow {self.title} ({self.frequency})>"
