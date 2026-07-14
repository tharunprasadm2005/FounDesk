from config.database import db
from datetime import datetime

class RawEvent(db.Model):
    __tablename__ = "raw_events"

    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(100), nullable=False)
    source_id = db.Column(db.String(255), nullable=False)
    source_ref = db.Column(db.String(255), nullable=True)
    event_type = db.Column(db.String(100), nullable=False)
    occurred_at = db.Column(db.DateTime, nullable=False)
    raw_payload = db.Column(db.JSON, nullable=True)
    is_mock = db.Column(db.Boolean, default=False, nullable=False)
    processed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    processing_status = db.Column(db.String(20), default='pending', nullable=False)
    retry_count = db.Column(db.Integer, default=0, nullable=False)
    last_error = db.Column(db.Text, nullable=True)
    pipeline_name = db.Column(db.String(50), nullable=True)

    __table_args__ = (
        db.UniqueConstraint("source", "source_id", name="uq_raw_source_event"),
        db.Index("ix_raw_processing", "processing_status", "pipeline_name"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "source": self.source,
            "source_id": self.source_id,
            "event_type": self.event_type,
            "occurred_at": self.occurred_at.isoformat() if self.occurred_at else None,
            "raw_payload": self.raw_payload,
            "is_mock": self.is_mock,
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LLMUsageLog(db.Model):
    __tablename__ = "llm_usage_logs"

    id = db.Column(db.Integer, primary_key=True)
    model = db.Column(db.String(255), nullable=False)
    prompt_tokens = db.Column(db.Integer, default=0)
    completion_tokens = db.Column(db.Integer, default=0)
    total_tokens = db.Column(db.Integer, default=0)
    latency_ms = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "model": self.model,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "latency_ms": self.latency_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ProviderUsage(db.Model):
    __tablename__ = "provider_usage"

    id = db.Column(db.Integer, primary_key=True)
    provider = db.Column(db.String(50), nullable=False)
    date = db.Column(db.Date, nullable=False)
    tokens_used = db.Column(db.Integer, default=0, nullable=False)
    requests_count = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("provider", "date", name="uq_provider_date"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "provider": self.provider,
            "date": self.date.isoformat() if self.date else None,
            "tokens_used": self.tokens_used,
            "requests_count": self.requests_count,
        }


class PipelineLock(db.Model):
    __tablename__ = "pipeline_locks"

    id = db.Column(db.Integer, primary_key=True)
    workspace_id = db.Column(db.Integer, db.ForeignKey('workspaces.id', ondelete='CASCADE'), nullable=False)
    pipeline_name = db.Column(db.String(50), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    host = db.Column(db.String(255), nullable=True)

    __table_args__ = (
        db.UniqueConstraint("workspace_id", "pipeline_name", name="uq_pipeline_lock"),
    )


class PatternCorrection(db.Model):
    __tablename__ = "pattern_corrections"

    id = db.Column(db.Integer, primary_key=True)
    record_type = db.Column(db.String(50), nullable=False)
    record_id = db.Column(db.Integer, nullable=False)
    ai_extracted_fields = db.Column(db.JSON, nullable=True)
    founder_action = db.Column(db.String(50), nullable=False)
    corrected_fields = db.Column(db.JSON, nullable=True)
    dismissal_reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "record_type": self.record_type,
            "record_id": self.record_id,
            "ai_extracted_fields": self.ai_extracted_fields,
            "founder_action": self.founder_action,
            "corrected_fields": self.corrected_fields,
            "dismissal_reason": self.dismissal_reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
