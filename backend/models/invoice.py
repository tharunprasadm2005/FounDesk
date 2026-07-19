from config.database import db
from datetime import datetime

class Invoice(db.Model):
    __tablename__ = "invoices"
    
    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    razorpay_order_id = db.Column(db.String(100), nullable=True)
    razorpay_payment_id = db.Column(db.String(100), nullable=True)
    amount = db.Column(db.Integer, nullable=False)  # in paise
    currency = db.Column(db.String(10), default='INR', nullable=False)
    status = db.Column(db.String(20), default='created', nullable=False)  # created, paid, failed, refunded
    plan_name = db.Column(db.String(50), nullable=True)
    description = db.Column(db.String(500), nullable=True)
    paid_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    workspace = db.relationship('Workspace', backref=db.backref('invoices', lazy=True, cascade='all, delete-orphan'))
    
    def to_dict(self):
        return {
            "id": self.id,
            "workspace_id": self.workspace_id,
            "razorpay_order_id": self.razorpay_order_id,
            "razorpay_payment_id": self.razorpay_payment_id,
            "amount": self.amount,
            "currency": self.currency,
            "status": self.status,
            "plan_name": self.plan_name,
            "description": self.description,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    def __repr__(self):
        return f"<Invoice {self.id} for WS {self.workspace_id}: {self.amount} {self.currency}>"
