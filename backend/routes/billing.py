import os
import hashlib
import hmac
import json
from flask import Blueprint, request, jsonify
from config.database import db
from utils.auth import token_required
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from datetime import datetime, timedelta

billing_bp = Blueprint('billing', __name__)

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
PLAN_PRICE = int(os.environ.get("RAZORPAY_PLAN_AMOUNT", "999"))  # in paise (₹9.99)
TRIAL_DAYS = int(os.environ.get("BILLING_TRIAL_DAYS", "14"))


def _get_razorpay_client():
    import razorpay
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


@billing_bp.route('/billing/config', methods=['GET'])
def billing_config():
    return jsonify({
        "key_id": RAZORPAY_KEY_ID,
        "plan_amount": PLAN_PRICE,
        "currency": "INR",
        "trial_days": TRIAL_DAYS,
    })


@billing_bp.route('/billing/plan', methods=['GET'])
@token_required
def get_billing(current_user_id):
    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").all()
    workspace_ids = [m.workspace_id for m in memberships]
    from models.user_integration import UserIntegration
    from models.goal import Goal
    from models.task import Task
    ws_count = len(workspace_ids)
    integration_count = UserIntegration.query.filter_by(user_id=current_user_id).count()
    goal_count = Goal.query.filter(Goal.workspace_id.in_(workspace_ids)).count() if workspace_ids else 0
    task_count = Task.query.filter(Task.workspace_id.in_(workspace_ids)).count() if workspace_ids else 0
    max_members = max(
        len(WorkspaceMember.query.filter_by(workspace_id=m.workspace_id).all())
        for m in memberships
    ) if memberships else 0

    workspace = Workspace.query.get(workspace_ids[0]) if workspace_ids else None
    trial_remaining = None
    if workspace and workspace.trial_ends_at:
        remaining = (workspace.trial_ends_at - datetime.utcnow()).days
        trial_remaining = max(0, remaining)

    return jsonify({
        "subscription_status": workspace.subscription_status if workspace else None,
        "plan": workspace.plan if workspace else None,
        "trial_remaining_days": trial_remaining,
        "plan_amount": PLAN_PRICE,
        "currency": "INR",
        "usage": {
            "workspaces": {"used": ws_count},
            "integrations": {"used": integration_count},
            "goals": {"used": goal_count},
            "tasks": {"used": task_count},
            "members_per_ws": {"used": max_members}
        },
    })


@billing_bp.route('/billing/create-order', methods=['POST'])
@token_required
def create_order(current_user_id):
    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").all()
    if not memberships:
        return jsonify({"error": "No active workspace"}), 400
    workspace = Workspace.query.get(memberships[0].workspace_id)
    if not workspace:
        return jsonify({"error": "Workspace not found"}), 404

    try:
        client = _get_razorpay_client()
        order = client.order.create({
            "amount": PLAN_PRICE,
            "currency": "INR",
            "receipt": f"ws_{workspace.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "notes": {"workspace_id": str(workspace.id)},
        })
        return jsonify({
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID,
        })
    except Exception as e:
        print(f"Razorpay order creation failed: {e}")
        return jsonify({"error": "Payment order creation failed"}), 500


@billing_bp.route('/billing/verify', methods=['POST'])
@token_required
def verify_payment(current_user_id):
    data = request.get_json() or {}
    order_id = data.get("razorpay_order_id")
    payment_id = data.get("razorpay_payment_id")
    signature = data.get("razorpay_signature")

    if not all([order_id, payment_id, signature]):
        return jsonify({"error": "Missing payment details"}), 400

    expected = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{order_id}|{payment_id}".encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        return jsonify({"error": "Payment verification failed"}), 400

    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").all()
    if not memberships:
        return jsonify({"error": "No active workspace"}), 400
    workspace = Workspace.query.get(memberships[0].workspace_id)
    if not workspace:
        return jsonify({"error": "Workspace not found"}), 404

    workspace.subscription_status = "active"
    workspace.plan = "starter"
    workspace.razorpay_subscription_id = payment_id
    db.session.commit()

    return jsonify({"status": "active", "message": "Payment verified, subscription activated"})


@billing_bp.route('/billing/webhook', methods=['POST'])
def razorpay_webhook():
    webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")
    received_sig = request.headers.get("X-Razorpay-Signature", "")

    if webhook_secret:
        expected_sig = hmac.new(webhook_secret.encode(), request.data, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, received_sig):
            return jsonify({"error": "Invalid signature"}), 400
    else:
        return jsonify({"error": "Webhook secret not configured"}), 500

    event = request.get_json() or {}
    event_type = event.get("event", "")
    payload = event.get("payload", {})

    def _get_workspace_from_notes(notes):
        ws_id = notes.get("workspace_id")
        if ws_id:
            try:
                return Workspace.query.get(int(ws_id))
            except (ValueError, TypeError):
                return None
        return None

    if event_type == "payment.failed":
        payment = payload.get("payment", {}).get("entity", {})
        workspace = _get_workspace_from_notes(payment.get("notes", {}))
        if workspace:
            workspace.subscription_status = "past_due"
            db.session.commit()
            print(f"[BILLING] Payment failed for workspace {workspace.id} → past_due")

    elif event_type == "subscription.cancelled":
        subscription = payload.get("subscription", {}).get("entity", {})
        workspace = _get_workspace_from_notes(subscription.get("notes", {}))
        if workspace:
            workspace.subscription_status = "cancelled"
            db.session.commit()
            print(f"[BILLING] Subscription cancelled for workspace {workspace.id}")

    return jsonify({"status": "ok"})
