import os
import hashlib
import hmac
import json
from flask import Blueprint, request, jsonify
from config.database import db
from utils.auth import token_required
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.invoice import Invoice
from datetime import datetime, timedelta

billing_bp = Blueprint('billing', __name__)

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
PLAN_PRICE = int(os.environ.get("RAZORPAY_PLAN_AMOUNT", "999"))  # in paise (₹9.99)
TRIAL_DAYS = int(os.environ.get("BILLING_TRIAL_DAYS", "14"))


def _get_razorpay_client():
    import razorpay
    return razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


PLANS = [
    {"id": "starter", "name": "Starter Plan", "amount": 999, "currency": "INR", "features": ["5 workspaces", "Unlimited integrations", "AI insights", "Calendar defense", "Knowledge transfer"]},
    {"id": "pro", "name": "Pro Plan", "amount": 2999, "currency": "INR", "features": ["Unlimited workspaces", "Unlimited integrations", "Priority AI insights", "Advanced calendar defense", "Knowledge transfer", "Priority support", "Custom branding"]},
    {"id": "enterprise", "name": "Enterprise Plan", "amount": 9999, "currency": "INR", "features": ["Everything in Pro", "SSO/SAML", "Audit logs", "Dedicated support", "Custom SLA"]},
]

PLAN_LIMITS = {"starter": {"workspaces": 5, "integrations": 100, "goals": 50, "tasks": 500},
               "pro": {"workspaces": 999, "integrations": 999, "goals": 999, "tasks": 9999},
               "enterprise": {"workspaces": 9999, "integrations": 9999, "goals": 9999, "tasks": 99999}}


@billing_bp.route('/billing/config', methods=['GET'])
def billing_config():
    return jsonify({
        "key_id": RAZORPAY_KEY_ID,
        "plan_amount": PLAN_PRICE,
        "currency": "INR",
        "trial_days": TRIAL_DAYS,
        "plans": PLANS,
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

    plan_key = workspace.plan if workspace else "starter"
    limits = PLAN_LIMITS.get(plan_key, PLAN_LIMITS["starter"])
    limits_exceeded = {
        "workspaces": ws_count > limits["workspaces"],
        "integrations": integration_count > limits["integrations"],
        "goals": goal_count > limits["goals"],
        "tasks": task_count > limits["tasks"],
    }

    return jsonify({
        "subscription_status": workspace.subscription_status if workspace else None,
        "plan": workspace.plan if workspace else None,
        "trial_remaining_days": trial_remaining,
        "plan_amount": PLAN_PRICE,
        "currency": "INR",
        "usage": {
            "workspaces": {"used": ws_count, "limit": limits["workspaces"]},
            "integrations": {"used": integration_count, "limit": limits["integrations"]},
            "goals": {"used": goal_count, "limit": limits["goals"]},
            "tasks": {"used": task_count, "limit": limits["tasks"]},
            "members_per_ws": {"used": max_members}
        },
        "limits_exceeded": limits_exceeded,
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
    data = request.get_json(silent=True) or {}
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

    invoice = Invoice(
        workspace_id=workspace.id,
        user_id=current_user_id,
        razorpay_order_id=order_id,
        razorpay_payment_id=payment_id,
        amount=PLAN_PRICE,
        currency="INR",
        status="paid",
        plan_name="starter",
        paid_at=datetime.utcnow(),
    )
    db.session.add(invoice)
    db.session.commit()

    return jsonify({"status": "active", "message": "Payment verified, subscription activated"})


@billing_bp.route('/billing/change-plan', methods=['POST'])
@token_required
def change_plan(current_user_id):
    data = request.get_json(silent=True) or {}
    new_plan = data.get("plan", "").strip().lower()
    valid_plans = [p["id"] for p in PLANS]
    if new_plan not in valid_plans:
        return jsonify({"error": f"Invalid plan. Valid: {valid_plans}"}), 400

    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").all()
    if not memberships:
        return jsonify({"error": "No active workspace"}), 400
    workspace = Workspace.query.get(memberships[0].workspace_id)
    if not workspace:
        return jsonify({"error": "Workspace not found"}), 404

    old_plan = workspace.plan
    workspace.plan = new_plan
    invoice = Invoice(
        workspace_id=workspace.id,
        user_id=current_user_id,
        amount=PLAN_PRICE,
        currency="INR",
        status="created",
        plan_name=new_plan,
        description=f"Plan changed from {old_plan} to {new_plan}",
    )
    db.session.add(invoice)
    db.session.commit()
    return jsonify({"message": f"Plan changed to {new_plan}", "plan": new_plan})


@billing_bp.route('/billing/cancel', methods=['POST'])
@token_required
def cancel_subscription(current_user_id):
    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").all()
    if not memberships:
        return jsonify({"error": "No active workspace"}), 400
    workspace = Workspace.query.get(memberships[0].workspace_id)
    if not workspace:
        return jsonify({"error": "Workspace not found"}), 404

    workspace.subscription_status = "cancelled"
    invoice = Invoice(
        workspace_id=workspace.id,
        user_id=current_user_id,
        amount=0,
        currency="INR",
        status="refunded",
        plan_name=workspace.plan,
        description="Subscription cancelled",
    )
    db.session.add(invoice)
    db.session.commit()
    return jsonify({"message": "Subscription cancelled", "subscription_status": "cancelled"})


@billing_bp.route('/billing/reactivate', methods=['POST'])
@token_required
def reactivate_subscription(current_user_id):
    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").all()
    if not memberships:
        return jsonify({"error": "No active workspace"}), 400
    workspace = Workspace.query.get(memberships[0].workspace_id)
    if not workspace:
        return jsonify({"error": "Workspace not found"}), 404

    workspace.subscription_status = "trial"
    workspace.trial_ends_at = datetime.utcnow() + timedelta(days=TRIAL_DAYS)
    db.session.commit()
    return jsonify({"message": "Subscription reactivated", "subscription_status": "trial", "trial_ends_at": workspace.trial_ends_at.isoformat() if workspace.trial_ends_at else None})


@billing_bp.route('/billing/invoices', methods=['GET'])
@token_required
def get_invoices(current_user_id):
    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").all()
    workspace_ids = [m.workspace_id for m in memberships]
    invoices = Invoice.query.filter(Invoice.workspace_id.in_(workspace_ids)).order_by(Invoice.created_at.desc()).all()
    return jsonify({"invoices": [inv.to_dict() for inv in invoices]})


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

    event = request.get_json(silent=True) or {}
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
