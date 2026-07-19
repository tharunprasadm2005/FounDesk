from config.database import db
from datetime import datetime

WORKSPACE_COLORS = ["#ff751f", "#3acaa5", "#53a1f5", "#f59e0b", "#a855f7", "#ef4444", "#ec4899", "#14b8a6"]

class Workspace(db.Model):
    __tablename__ = "workspaces"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(500), nullable=True)
    stage = db.Column(db.String(50), default='Build', nullable=False)
    color = db.Column(db.String(7), default='#ff751f', nullable=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    active_phase = db.Column(db.String(100), nullable=True)
    active_health = db.Column(db.String(50), nullable=True)
    active_phase_scores = db.Column(db.JSON, nullable=True)
    calendar_rules = db.Column(db.JSON, nullable=True)
    is_archived = db.Column(db.Boolean, default=False, nullable=False)
    subscription_status = db.Column(db.String(20), default='trial', nullable=False)
    plan = db.Column(db.String(50), default='starter', nullable=True)
    trial_ends_at = db.Column(db.DateTime, nullable=True)
    razorpay_customer_id = db.Column(db.String(100), nullable=True)
    razorpay_subscription_id = db.Column(db.String(100), nullable=True)
    logo_url = db.Column(db.String(500), nullable=True)
    website = db.Column(db.String(500), nullable=True)
    industry = db.Column(db.String(100), nullable=True)
    size = db.Column(db.String(50), nullable=True)
    tags = db.Column(db.JSON, nullable=True)
    template_source = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "stage": self.stage,
            "color": self.color,
            "creator_id": self.creator_id,
            "active_phase": self.active_phase,
            "active_health": self.active_health,
            "active_phase_scores": self.active_phase_scores,
            "calendar_rules": self.calendar_rules,
            "is_archived": self.is_archived,
            "subscription_status": self.subscription_status,
            "plan": self.plan,
            "trial_ends_at": self.trial_ends_at.isoformat() if self.trial_ends_at else None,
            "logo_url": self.logo_url,
            "website": self.website,
            "industry": self.industry,
            "size": self.size,
            "tags": self.tags,
            "template_source": self.template_source,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Workspace {self.name}>"
