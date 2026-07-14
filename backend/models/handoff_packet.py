from config.database import db
from datetime import datetime

class HandoffPacket(db.Model):
    __tablename__ = "handoff_packets"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    packet_type = db.Column(db.String(50), nullable=False)  # "onboarding" or "offboarding"
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    user_name = db.Column(db.String(255), nullable=True)
    markdown_content = db.Column(db.Text, nullable=False)
    reassign_to_user_id = db.Column(db.Integer, nullable=True)
    reassign_to_name = db.Column(db.String(255), nullable=True)
    reassigned_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "packet_type": self.packet_type,
            "user_id": self.user_id,
            "user_name": self.user_name,
            "markdown_content": self.markdown_content,
            "reassign_to_user_id": self.reassign_to_user_id,
            "reassign_to_name": self.reassign_to_name,
            "reassigned_count": self.reassigned_count,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "created_by": self.created_by
        }

    def __repr__(self):
        return f"<HandoffPacket {self.packet_type} for {self.user_name}>"
