import os
import secrets
from flask import Blueprint, request, jsonify
from config.database import db
from utils.auth import token_required
from models.notification_preference import NotificationPreference, InAppNotification
from models.workspace_member import WorkspaceMember
from models.user import User
from models.email_notification import EmailNotification
from utils.rate_limit import limiter
from utils.email import send_email
from datetime import datetime

TEMPLATES = {
    "blocker_detected": {"title": "Blocker: {blocker_title}", "message": "A blocker has been detected in {workspace_name}: {blocker_description}"},
    "daily_briefing": {"title": "Daily Briefing - {date}", "message": "Here's your daily briefing for {workspace_name}. You have {task_count} tasks today."},
    "follow_up_due": {"title": "Follow-up Due: {item}", "message": "Your follow-up '{item}' is due. Please review and take action."},
    "decision_confirmation": {"title": "Decision: {decision_title}", "message": "The decision '{decision_title}' has been confirmed in {workspace_name}."},
    "member_joined": {"title": "Welcome {member_name}", "message": "{member_name} has joined {workspace_name} as {role}."},
    "phase_change": {"title": "Phase Change: {workspace_name}", "message": "{workspace_name} moved from {old_stage} to {new_stage}."},
    "weekly_digest": {"title": "Weekly Digest - {workspace_name}", "message": "This week: {task_completed} tasks completed, {goals_achieved} goals achieved, {blockers_resolved} blockers resolved."},
}

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

    data = request.get_json(silent=True)
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
    import traceback
    try:
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
            except ValueError:
                pass
        if to_date:
            try:
                td = datetime.fromisoformat(to_date)
                query = query.filter(InAppNotification.created_at <= td)
            except ValueError:
                pass

        total = query.count()
        notifications = query.order_by(InAppNotification.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

        unread_count = 0
        try:
            unread_count = InAppNotification.query.filter_by(user_id=current_user_id, workspace_id=workspace_id, is_read=False).count()
        except Exception:
            pass

        return jsonify({
            "notifications": [n.to_dict() for n in notifications],
            "total": total, "page": page, "per_page": per_page,
            "unread_count": unread_count
        })
    except Exception as e:
        print(f"GET /notifications error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to fetch notifications", "message": str(e)}), 500


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


@notifications_bp.route('/notifications/read-all/workspace/<int:workspace_id>', methods=['POST'])
@token_required
def mark_all_read_workspace(current_user_id, workspace_id):
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=current_user_id, status='active').first()
    if not member:
        return jsonify({"error": "Unauthorized"}), 403
    InAppNotification.query.filter_by(user_id=current_user_id, workspace_id=workspace_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "All notifications marked as read for this workspace"})


@notifications_bp.route('/notifications/templates', methods=['GET'])
@token_required
def get_notification_templates(current_user_id):
    return jsonify({"templates": TEMPLATES})


@notifications_bp.route('/notifications/resend-verification', methods=['POST'])
@token_required
@limiter.limit("3 per minute")
def resend_verification(current_user_id):
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user.email_verified:
        return jsonify({"message": "Email already verified"})
    import hashlib
    raw_token = secrets.token_urlsafe(32)
    user.email_verify_token = User.hash_token(raw_token)
    db.session.commit()
    frontend_url = os.getenv("FRONTEND_URL", "https://foundesk.onrender.com")
    verify_link = f"{frontend_url}/verify-email?token={raw_token}"
    try:
        send_email(
            user.email,
            "Verify your FounDesk email",
            f"<p>Click <a href='{verify_link}'>here</a> to verify your email.</p>",
            f"Verify your email: {verify_link}",
        )
    except Exception as e:
        return jsonify({"error": f"Failed to send verification email: {e}"}), 500
    return jsonify({"message": "Verification email sent"})


# ─── helpers ─────────────────────────────────

def _is_in_quiet_hours(pref):
    if not pref or not pref.quiet_hours_start or not pref.quiet_hours_end:
        return False
    try:
        now = datetime.utcnow()
        start_parts = pref.quiet_hours_start.split(":")
        end_parts = pref.quiet_hours_end.split(":")
        start_min = int(start_parts[0]) * 60 + int(start_parts[1])
        end_min = int(end_parts[0]) * 60 + int(end_parts[1])
        current_min = now.hour * 60 + now.minute
        if start_min <= end_min:
            return start_min <= current_min <= end_min
        else:
            return current_min >= start_min or current_min <= end_min
    except (ValueError, IndexError):
        return False


def _send_notification_email(user_id, workspace_id, ntype, title, message):
    user = User.query.get(user_id)
    if not user or not user.email:
        return False
    email_note = EmailNotification(
        user_id=user_id,
        workspace_id=workspace_id,
        notification_type=ntype,
        recipient_email=user.email,
        subject=title,
        body_text=message,
        status="pending",
    )
    db.session.add(email_note)
    db.session.flush()
    try:
        success = send_email(user.email, title, f"<p>{message}</p>", message)
        email_note.status = "sent" if success else "failed"
        email_note.sent_at = datetime.utcnow() if success else None
        if not success:
            email_note.error_message = "Email send returned failure"
    except Exception as e:
        email_note.status = "failed"
        email_note.error_message = str(e)
    db.session.commit()
    return email_note.status == "sent"


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
    ws_id = member.workspace_id if member else None
    return ws_id
