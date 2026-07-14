from config.database import db
from datetime import datetime

class PhaseTemplate(db.Model):
    __tablename__ = "phase_templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

class PhaseTemplateGoal(db.Model):
    __tablename__ = "phase_template_goals"

    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('phase_templates.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    goal_type = db.Column(db.String(50), nullable=False)  # 'monthly' or 'weekly'
    parent_goal_id = db.Column(db.Integer, db.ForeignKey('phase_template_goals.id', ondelete='CASCADE'), nullable=True)

    # Self-referencing relationship for cascade representation:
    sub_goals = db.relationship('PhaseTemplateGoal', backref=db.backref('parent', remote_side=[id]), cascade='all, delete-orphan')

    def to_dict(self):
        return {
            "id": self.id,
            "template_id": self.template_id,
            "title": self.title,
            "description": self.description,
            "goal_type": self.goal_type,
            "parent_goal_id": self.parent_goal_id
        }

class PhaseTemplateTask(db.Model):
    __tablename__ = "phase_template_tasks"

    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('phase_templates.id', ondelete='CASCADE'), nullable=False)
    parent_goal_id = db.Column(db.Integer, db.ForeignKey('phase_template_goals.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(10), default='P2', nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "template_id": self.template_id,
            "parent_goal_id": self.parent_goal_id,
            "title": self.title,
            "description": self.description,
            "priority": self.priority
        }
