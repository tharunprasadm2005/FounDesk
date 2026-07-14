from config.database import db
from datetime import datetime

class KnowledgeItem(db.Model):
    __tablename__ = "knowledge_items"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    knowledge_type = db.Column(db.String(50), nullable=True)
    summary = db.Column(db.Text, nullable=True)
    key_points = db.Column(db.JSON, nullable=True)
    applicable_to = db.Column(db.String(255), nullable=True)
    confidence = db.Column(db.Float, nullable=True)
    source = db.Column(db.String(100), nullable=True)
    source_integration = db.Column(db.String(100), nullable=True)
    source_event_id = db.Column(db.String(255), nullable=True)
    integration_event_id = db.Column(db.String(255), unique=True, nullable=True)
    raw_content = db.Column(db.Text, nullable=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(db.String(50), default='auto_inferred', nullable=False)

    # Part 3 — Knowledge linking & review-staleness
    linked_decision_id = db.Column(db.Integer, db.ForeignKey('decision_logs.id', ondelete='SET NULL'), nullable=True)
    linked_goal_id = db.Column(db.Integer, db.ForeignKey('goals.id', ondelete='SET NULL'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    review_flag = db.Column(db.String(50), nullable=True)

    ai_status = db.Column(db.String(50), nullable=True)
    confirmed_at = db.Column(db.DateTime, nullable=True)
    dismissed_at = db.Column(db.DateTime, nullable=True)

    linked_decision = db.relationship('DecisionLog', backref=db.backref('knowledge_items', lazy=True))
    linked_goal = db.relationship('Goal', backref=db.backref('knowledge_items', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "knowledge_type": self.knowledge_type,
            "summary": self.summary,
            "key_points": self.key_points or [],
            "applicable_to": self.applicable_to,
            "confidence": self.confidence,
            "source": self.source,
            "source_integration": self.source_integration,
            "source_event_id": self.source_event_id,
            "integration_event_id": self.integration_event_id,
            "raw_content": self.raw_content,
            "workspace_id": self.workspace_id,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "status": self.status or "auto_inferred",
            "linked_decision_id": self.linked_decision_id,
            "linked_goal_id": self.linked_goal_id,
            "reviewed_at": self.reviewed_at.isoformat() if self.reviewed_at else None,
            "review_flag": self.review_flag,
            "ai_status": self.ai_status,
        }

    def __repr__(self):
        return f"<KnowledgeItem {self.id} {self.title[:40]}...>"
