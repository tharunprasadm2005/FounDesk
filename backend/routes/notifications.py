from flask import Blueprint, request, jsonify
from config.database import db
from utils.auth import token_required
from models.notification_preference import NotificationPreference, InAppNotification
from models.workspace_member import WorkspaceMember
from datetime import datetime

notifications_bp = Blueprint('notifications', __name__)

ALL_RULES = [
    "blocker_detected", "daily_briefing", "follow_up_due",
    "decision_confirmation", "member_joined", "phase_change", "weekly_digest"
]
DELIVERY_METHODS = ["in_app", "email", "both"]


@notifications_bp.route('/notifications/preferences', methods=['GET'])
@token_required
def get_preferences(current_user_id):
    workspace_id = _get_ws_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400

    prefs = NotificationPreference.query.filter_by(
        user_id=current_user_id, workspace_id=workspace_id
    ).all()
    pref_map = {p.rule_key: p.to_dict() for p in prefs}

    defaults = {
        "blocker_detected": True, "daily_briefing": True, "follow_up_due": True,
        "decision_confirmation": True, "member_joined": True, "phase_change": False, "weekly_digest": False
    }

    result = {}
    for rule in ALL_RULES:
        if rule in pref_map:
            result[rule] = pref_map[rule]
        else:
            result[rule] = {
                "rule_key": rule, "enabled": defaults.get(rule, False),
                "delivery_method": "in_app", "sound_enabled": True,
                "quiet_hours_start": None, "quiet_hours_end": None
            }

    return jsonify({"rules": result})


@notifications_bp.route('/notifications/preferences', methods=['PUT'])
@token_required
def save_preferences(current_user_id):
    workspace_id = _get_ws_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    enabled_count = 0
    for rule_key, settings in data.items():
        if rule_key not in ALL_RULES:
            continue
        pref = NotificationPreference.query.filter_by(
            user_id=current_user_id, workspace_id=workspace_id, rule_key=rule_key
        ).first()
        if not pref:
            pref = NotificationPreference(
                user_id=current_user_id, workspace_id=workspace_id, rule_key=rule_key
            )
            db.session.add(pref)

        if isinstance(settings, dict):
            pref.enabled = bool(settings.get("enabled", True))
            pref.delivery_method = settings.get("delivery_method", "in_app") if settings.get("delivery_method", "in_app") in DELIVERY_METHODS else "in_app"
            pref.sound_enabled = bool(settings.get("sound_enabled", True))
            pref.quiet_hours_start = settings.get("quiet_hours_start") or None
            pref.quiet_hours_end = settings.get("quiet_hours_end") or None
        else:
            pref.enabled = bool(settings)

        if pref.enabled:
            enabled_count += 1

    db.session.commit()
    return jsonify({"message": "Preferences saved", "active_rules": enabled_count})


@notifications_bp.route('/notifications', methods=['GET'])
@token_required
def get_notifications(current_user_id):
    workspace_id = _get_ws_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    unread_only = request.args.get("unread_only", "false").lower() == "true"
    search = request.args.get("search", "").strip()
    ntype = request.args.get("type", "").strip()
    from_date = request.args.get("from", "").strip()
    to_date = request.args.get("to", "").strip()

    query = InAppNotification.query.filter_by(user_id=current_user_id, workspace_id=workspace_id)

    if unread_only:
        query = query.filter_by(is_read=False)
    if search:
        query = query.filter(
            InAppNotification.title.ilike(f"%{search}%") |
            InAppNotification.message.ilike(f"%{search}%")
        )
    if ntype:
        query = query.filter_by(notification_type=ntype)
    if from_date:
        try:
            fd = datetime.fromisoformat(from_date)
            query = query.filter(InAppNotification.created_at >= fd)
        except: pass
    if to_date:
        try:
            td = datetime.fromisoformat(to_date)
            query = query.filter(InAppNotification.created_at <= td)
        except: pass

    total = query.count()
    notifications = query.order_by(InAppNotification.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "notifications": [n.to_dict() for n in notifications],
        "total": total, "page": page, "per_page": per_page,
        "unread_count": InAppNotification.query.filter_by(user_id=current_user_id, workspace_id=workspace_id, is_read=False).count()
    })


@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['POST'])
@token_required
def mark_read(current_user_id, notification_id):
    notification = InAppNotification.query.filter_by(id=notification_id, user_id=current_user_id).first()
    if not notification:
        return jsonify({"error": "Notification not found"}), 404
    notification.is_read = True
    db.session.commit()
    return jsonify({"message": "Marked as read"})


@notifications_bp.route('/notifications/read-all', methods=['POST'])
@token_required
def mark_all_read(current_user_id):
    workspace_id = _get_ws_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400
    InAppNotification.query.filter_by(user_id=current_user_id, workspace_id=workspace_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read"})


@notifications_bp.route('/notifications/test', methods=['POST'])
@token_required
def send_test_notification(current_user_id):
    workspace_id = _get_ws_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace"}), 400
    data = request.get_json() or {}
    ntype = data.get("type", "daily_briefing")
    note = InAppNotification(
        user_id=current_user_id, workspace_id=workspace_id,
        title=f"Test: {ntype.replace('_', ' ').title()}",
        message=f"This is a sample {ntype.replace('_', ' ')} notification. It looks like this when triggered.",
        notification_type=ntype
    )
    db.session.add(note)
    db.session.commit()
    return jsonify({"message": "Test notification sent", "notification": note.to_dict()})


# ─── helpers ─────────────────────────────────

def _get_ws_id(user_id):
    ws_id_str = request.headers.get("X-Workspace-Id")
    if ws_id_str:
        try:
            ws_id = int(ws_id_str)
            member = WorkspaceMember.query.filter_by(workspace_id=ws_id, user_id=user_id, status="active").first()
            if member:
                return ws_id
        except ValueError:
            pass
    member = WorkspaceMember.query.filter_by(user_id=user_id, status="active").first()
    return member.workspace_id if member else None
