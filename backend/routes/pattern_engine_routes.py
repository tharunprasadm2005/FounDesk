from datetime import datetime
from flask import Blueprint, jsonify, request
from config.database import db
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.blocker import Blocker
from models.meeting_notes import MeetingNotes
from models.knowledge_item import KnowledgeItem
from pattern_engine.models import PatternCorrection
from pattern_engine.pipeline.core import run_for_integration, run_all
from models.user_integration import UserIntegration
from services.notification_engine import run_notification_engine

pattern_engine_bp = Blueprint("pattern_engine", __name__)

RECORD_MAP = {
    "task": Task,
    "decision": DecisionLog,
    "goal": Goal,
    "blocker": Blocker,
}

@pattern_engine_bp.route("/pattern-engine/sync", methods=["POST"])
@token_required
def trigger_sync(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400

    integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    results = []
    for integration in integrations:
        result = run_for_integration(integration.id)
        results.append({
            "provider": integration.provider,
            "result": result,
        })
    return jsonify({"results": results})


@pattern_engine_bp.route("/pattern-engine/run-all", methods=["POST"])
@token_required
def trigger_run_all(current_user_id):
    result = run_all(user_id=current_user_id)
    return jsonify(result)


@pattern_engine_bp.route("/records/<record_type>/<int:record_id>/confirm", methods=["POST"])
@token_required
def confirm_record(current_user_id, record_type, record_id):
    model_class = RECORD_MAP.get(record_type)
    if not model_class:
        return jsonify({"error": f"Unknown record type: {record_type}"}), 400

    record = model_class.query.get(record_id)
    if not record:
        return jsonify({"error": "Record not found"}), 404

    record.ai_status = "confirmed"
    record.confirmed_at = datetime.utcnow()

    correction = PatternCorrection(
        record_type=record_type,
        record_id=record_id,
        ai_extracted_fields=None,
        founder_action="confirmed",
    )
    db.session.add(correction)
    db.session.commit()

    return jsonify({"message": "Record confirmed", "record": record.to_dict()})


@pattern_engine_bp.route("/records/<record_type>/<int:record_id>/edit", methods=["POST"])
@token_required
def edit_record(current_user_id, record_type, record_id):
    model_class = RECORD_MAP.get(record_type)
    if not model_class:
        return jsonify({"error": f"Unknown record type: {record_type}"}), 400

    record = model_class.query.get(record_id)
    if not record:
        return jsonify({"error": "Record not found"}), 404

    data = request.get_json() or {}
    corrected = {}

    for key, value in data.items():
        if hasattr(record, key):
            old_val = getattr(record, key)
            if old_val != value:
                setattr(record, key, value)
                corrected[key] = {"from": old_val, "to": value}

    record.ai_status = "confirmed"
    record.confirmed_at = datetime.utcnow()

    if corrected:
        correction = PatternCorrection(
            record_type=record_type,
            record_id=record_id,
            ai_extracted_fields=None,
            founder_action="edited",
            corrected_fields=corrected,
        )
        db.session.add(correction)
    db.session.commit()

    return jsonify({"message": "Record updated", "record": record.to_dict()})


@pattern_engine_bp.route("/records/<record_type>/<int:record_id>/dismiss", methods=["POST"])
@token_required
def dismiss_record(current_user_id, record_type, record_id):
    model_class = RECORD_MAP.get(record_type)
    if not model_class:
        return jsonify({"error": f"Unknown record type: {record_type}"}), 400

    record = model_class.query.get(record_id)
    if not record:
        return jsonify({"error": "Record not found"}), 404

    reason = (request.get_json() or {}).get("reason", "")

    record.ai_status = "dismissed"
    record.dismissed_at = datetime.utcnow()

    correction = PatternCorrection(
        record_type=record_type,
        record_id=record_id,
        ai_extracted_fields=None,
        founder_action="dismissed",
        dismissal_reason=reason,
    )
    db.session.add(correction)
    db.session.commit()

    return jsonify({"message": "Record dismissed"})


@pattern_engine_bp.route("/records/pending", methods=["GET"])
@token_required
def get_pending_records(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400

    results = []
    for record_type, model_class in RECORD_MAP.items():
        records = model_class.query.filter_by(
            workspace_id=workspace_id,
            ai_status="pending_confirmation",
        ).all()
        for r in records:
            d = r.to_dict()
            d["record_type"] = record_type
            results.append(d)

    return jsonify(results)


@pattern_engine_bp.route("/pipeline/status", methods=["GET"])
@token_required
def pipeline_status(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400
    from models.activity_event import ActivityEvent
    from pattern_engine.models import RawEvent, LLMUsageLog
    all_integrations = UserIntegration.query.filter_by(user_id=current_user_id).all()
    integrations = len(all_integrations)
    providers = list(set(i.provider for i in all_integrations))
    decision_providers = [p for p in providers if p in ("gmail", "google", "slack", "google_calendar", "google_meet")]
    activity_events = ActivityEvent.query.filter_by(workspace_id=workspace_id).count()
    decision_count = DecisionLog.query.filter_by(workspace_id=workspace_id).count()
    task_count = Task.query.filter_by(workspace_id=workspace_id).count()
    ai_task_count = Task.query.filter_by(workspace_id=workspace_id, source="ai_pattern_engine").count()
    unprocessed_raw = RawEvent.query.filter_by(processed_at=None).count()
    records_found = sum(
        cls.query.filter_by(workspace_id=workspace_id).count()
        for cls in [Task, Goal, DecisionLog, Blocker]
    )
    last_llm = LLMUsageLog.query.order_by(LLMUsageLog.created_at.desc()).first()
    meeting_notes_count = MeetingNotes.query.filter_by(workspace_id=workspace_id).count()
    knowledge_items_count = KnowledgeItem.query.filter_by(workspace_id=workspace_id).count()
    return jsonify({
        "integrations_connected": integrations,
        "activity_events_fetched": activity_events,
        "unprocessed_events": unprocessed_raw,
        "records_extracted": records_found,
        "task_count": task_count,
        "ai_task_count": ai_task_count,
        "decision_count": decision_count,
        "meeting_notes_count": meeting_notes_count,
        "knowledge_items_count": knowledge_items_count,
        "has_decision_providers": len(decision_providers) > 0,
        "last_llm_call": last_llm.created_at.isoformat() if last_llm else None,
    })


@pattern_engine_bp.route("/pattern-engine/notifications", methods=["POST"])
@token_required
def trigger_notifications(current_user_id):
    from utils.workspace_auth import get_current_workspace_id
    ws_id = get_current_workspace_id(current_user_id)
    if not ws_id:
        return jsonify({"error": "No active workspace"}), 400
    created = run_notification_engine(ws_id)
    return jsonify({"notifications_created": created})
