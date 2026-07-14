from config.database import db
from datetime import datetime

class ChronicleEvent(db.Model):
    __tablename__ = "chronicle_events"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    event_type = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    stage = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Phase 5: source linking
    source_type = db.Column(db.String(50), nullable=True)
    source_id = db.Column(db.Integer, nullable=True)
    meta_data = db.Column(db.JSON, nullable=True)

    workspace = db.relationship('Workspace', backref=db.backref('chronicle_events', lazy=True, cascade='all, delete-orphan'))
    user = db.relationship('User', backref=db.backref('chronicle_events', lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "event_type": self.event_type,
            "title": self.title,
            "description": self.description,
            "stage": self.stage,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "created_at": (self.created_at.isoformat() + "Z") if self.created_at else None,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "meta_data": self.meta_data
        }

    def __repr__(self):
        return f"<ChronicleEvent {self.title} in WS {self.workspace_id}>"
