from flask import Blueprint, request, jsonify
from datetime import datetime
import os
from config.database import db
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.user import User
from models.chronicle_event import ChronicleEvent
from models.activity_event import ActivityEvent
from models.handoff_packet import HandoffPacket
from models.task import Task
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from utils.auth import token_required

workspaces_bp = Blueprint('workspaces', __name__)

@workspaces_bp.route('/workspaces', methods=['GET'])
@token_required
def get_workspaces(current_user_id):
    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id).all()
    result = []
    for m in memberships:
        ws = Workspace.query.get(m.workspace_id)
        if not ws:
            continue
        ws_dict = ws.to_dict()
        ws_dict['role'] = m.role
        ws_dict['member_status'] = m.status
        
        all_members = WorkspaceMember.query.filter_by(workspace_id=ws.id).all()
        is_owner = m.role in ("owner", "founder", "admin")
        ws_dict['members'] = [
            {
                "id": mem.id,
                "user_id": mem.user_id,
                "role": mem.role,
                "status": mem.status,
                "title": mem.title,
                "email": mem.email if is_owner else None,
                "user_name": mem.user.name if mem.user else None,
                "created_at": (mem.created_at.isoformat() + "Z") if mem.created_at else None,
            }
            for mem in all_members
        ]
        result.append(ws_dict)
    return jsonify(result)

@workspaces_bp.route('/workspaces', methods=['POST'])
@token_required
def create_workspace(current_user_id):
    data = request.get_json()
    if not data or not data.get('name'):
        return jsonify({"error": "Workspace name is required"}), 400
        
    from datetime import timedelta
    trial_days = int(os.environ.get("BILLING_TRIAL_DAYS", "14"))
    ws = Workspace(
        name=data['name'],
        description=data.get('description', ''),
        stage=data.get('stage', 'Build'),
        color=data.get('color', '#ff751f'),
        creator_id=current_user_id,
        subscription_status="trial",
        plan="starter",
        trial_ends_at=datetime.utcnow() + timedelta(days=trial_days),
    )
    db.session.add(ws)
    db.session.commit()
    
    # Creator automatically becomes founder membership
    user = User.query.get(current_user_id)
    member = WorkspaceMember(
        workspace_id=ws.id,
        user_id=current_user_id,
        email=user.email,
        role="founder",
        status="active"
    )
    db.session.add(member)
    
    # Log chronicle event for founder joining
    event = ChronicleEvent(
        workspace_id=ws.id,
        event_type="team_joined",
        title="Founder Joined Workspace",
        description=f"{user.name or user.email} created the workspace as Founder.",
        stage=ws.stage
    )
    db.session.add(event)

    # Auto-generate onboarding handoff packet for founder
    founder_md = f"# Onboarding: {user.name or user.email} (Founder)\n\n"
    founder_md += f"**Workspace**: {ws.name}\n"
    founder_md += f"**Role**: Founder\n"
    founder_md += f"**Created**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
    founder_md += "You are the workspace founder. Start by connecting integrations, adding team members, and defining goals."
    founder_packet = HandoffPacket(
        workspace_id=ws.id,
        packet_type="onboarding",
        user_id=current_user_id,
        user_name=user.name or user.email,
        markdown_content=founder_md,
        created_by=current_user_id,
    )
    db.session.add(founder_packet)
    db.session.commit()
    
    ws_dict = ws.to_dict()
    ws_dict['role'] = 'founder'
    ws_dict['member_status'] = 'active'
    ws_dict['members'] = [member.to_dict()]
    return jsonify(ws_dict), 201

@workspaces_bp.route('/workspaces/<int:workspace_id>', methods=['PUT'])
@token_required
def update_workspace(current_user_id, workspace_id):
    # Verify owner/admin role permissions
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=current_user_id).first()
    if not member or member.role not in ['founder', 'admin']:
        return jsonify({"error": "Unauthorized to update workspace"}), 403
        
    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404
        
    data = request.get_json()
    if 'name' in data:
        ws.name = data['name']
    if 'stage' in data:
        if data['stage'] not in ['Think', 'Build', 'Launch', 'Scale']:
            return jsonify({"error": "Invalid workspace stage"}), 400
        old_stage = ws.stage
        ws.stage = data['stage']
        if old_stage != data['stage']:
            chronicle = ChronicleEvent(
                workspace_id=workspace_id,
                event_type="stage_change",
                title=f"Stage Changed: {old_stage} → {data['stage']}",
                description=f"Workspace advanced from {old_stage} to {data['stage']} stage.",
                stage=data['stage'],
                user_id=current_user_id,
                source_type="workspace",
                source_id=workspace_id,
                meta_data={"from": old_stage, "to": data['stage']}
            )
            db.session.add(chronicle)
    if 'description' in data:
        ws.description = data['description']
    if 'color' in data:
        ws.color = data['color']
    if 'active_phase' in data:
        ws.active_phase = data['active_phase'] if data['active_phase'] != '' else None
    if 'calendar_rules' in data:
        ws.calendar_rules = data['calendar_rules']

    db.session.commit()

    # Re-fetch with members for the response
    ws_dict = ws.to_dict()
    all_members = WorkspaceMember.query.filter_by(workspace_id=ws.id).all()
    ws_dict['members'] = [mem.to_dict() for mem in all_members]
    ws_dict['role'] = member.role
    ws_dict['member_status'] = member.status
    return jsonify(ws_dict)

@workspaces_bp.route('/workspaces/<int:workspace_id>/invite', methods=['POST'])
@token_required
def invite_member(current_user_id, workspace_id):
    # Verify permissions: admin/founder role required
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=current_user_id).first()
    if not member or member.role not in ['founder', 'admin']:
        return jsonify({"error": "Unauthorized to invite team members"}), 403
        
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    role = data.get('role', 'member')
    
    if not email:
        return jsonify({"error": "Email is required"}), 400
        
    if role not in ['admin', 'member']:
        return jsonify({"error": "Invalid role specified"}), 400
        
    # Check if already has workspace membership or pending invitation
    existing = WorkspaceMember.query.filter_by(workspace_id=workspace_id, email=email).first()
    if existing:
        return jsonify({"error": "Email has already been invited or is a member of this workspace"}), 400
        
    # Check if user already registered in FounDesk
    invited_user = User.query.filter_by(email=email).first()
    user_id = invited_user.id if invited_user else None
    
    new_invite = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user_id,
        email=email,
        role=role,
        status="pending"
    )
    db.session.add(new_invite)
    db.session.flush()

    ws = Workspace.query.get(workspace_id)

    # Create in-app notification for the invited user if they exist
    if invited_user:
        from models.notification_preference import InAppNotification
        notif = InAppNotification(
            user_id=invited_user.id,
            workspace_id=workspace_id,
            title=f"Workspace invitation from {ws.name}",
            message=f"You've been invited to join '{ws.name}' as {role}.",
            notification_type="workspace_invite",
        )
        db.session.add(notif)

    # Create notification for the inviter confirming the invite was sent
    from models.notification_preference import InAppNotification
    inviter_notif = InAppNotification(
        user_id=current_user_id,
        workspace_id=workspace_id,
        title=f"Invitation sent to {email}",
        message=f"They've been invited to join as {role}. Wait for them to accept.",
        notification_type="workspace_invite_sent",
    )
    db.session.add(inviter_notif)

    db.session.commit()

    # Send real email
    try:
        from utils.email import send_invite_email
        inviter = User.query.get(current_user_id)
        inviter_name = inviter.name if inviter else "A team member"
        frontend_url = os.getenv("FRONTEND_URL", "https://foundesk.onrender.com")
        link = f"{frontend_url}/settings?invite={new_invite.id}"
        send_invite_email(email, inviter_name, ws.name, role, link)
    except Exception as e:
        print(f"Failed to send invite email: {e}")

    return jsonify(new_invite.to_dict()), 201

@workspaces_bp.route('/workspaces/invites', methods=['GET'])
@token_required
def get_invites(current_user_id):
    user = User.query.get(current_user_id)
    invites = WorkspaceMember.query.filter_by(email=user.email.strip().lower(), status='pending').all()
    result = []
    for invite in invites:
        ws = Workspace.query.get(invite.workspace_id)
        if ws:
            invite_dict = invite.to_dict()
            invite_dict['workspace_name'] = ws.name
            result.append(invite_dict)
    return jsonify(result)

@workspaces_bp.route('/workspaces/invites/<int:member_id>/accept', methods=['POST'])
@token_required
def accept_invite(current_user_id, member_id):
    user = User.query.get(current_user_id)
    member = WorkspaceMember.query.filter_by(id=member_id, email=user.email.strip().lower(), status='pending').first()
    if not member:
        return jsonify({"error": "Invitation not found or unauthorized"}), 404
        
    member.status = "active"
    member.user_id = current_user_id
    
    # Log chronicle event for member joining
    ws = Workspace.query.get(member.workspace_id)
    event = ChronicleEvent(
        workspace_id=member.workspace_id,
        event_type="team_joined",
        title="Team Member Joined",
        description=f"{user.name or user.email} joined the workspace as {member.role}.",
        stage=ws.stage if ws else "Think"
    )
    db.session.add(event)

    # Auto-generate onboarding handoff packet
    onboard_md = f"# Onboarding: {user.name or user.email}\n\n"
    onboard_md += f"**Role**: {member.role}\n"
    onboard_md += f"**Joined**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
    onboard_md += "Welcome to the workspace! Review ongoing projects, active tasks, and recent decisions below.\n"
    packet = HandoffPacket(
        workspace_id=member.workspace_id,
        packet_type="onboarding",
        user_id=current_user_id,
        user_name=user.name or user.email,
        markdown_content=onboard_md,
        created_by=member.invited_by or current_user_id,
    )
    db.session.add(packet)
    db.session.commit()
    return jsonify(member.to_dict())

@workspaces_bp.route('/workspaces/invites/<int:member_id>/decline', methods=['POST'])
@token_required
def decline_invite(current_user_id, member_id):
    user = User.query.get(current_user_id)
    member = WorkspaceMember.query.filter_by(id=member_id, email=user.email.strip().lower(), status='pending').first()
    if not member:
        return jsonify({"error": "Invitation not found or unauthorized"}), 404
        
    db.session.delete(member)
    db.session.commit()
    return jsonify({"message": "Invitation declined"})

@workspaces_bp.route('/workspaces/<int:workspace_id>/members/<int:member_id>', methods=['DELETE'])
@token_required
def remove_member(current_user_id, workspace_id, member_id):
    # Verify owner/admin role permissions
    current_member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=current_user_id).first()
    if not current_member or current_member.role not in ['founder', 'admin']:
        return jsonify({"error": "Unauthorized to modify workspace memberships"}), 403
        
    target_member = WorkspaceMember.query.filter_by(id=member_id, workspace_id=workspace_id).first()
    if not target_member:
        return jsonify({"error": "Member not found in workspace"}), 404
        
    if target_member.role == 'founder':
        return jsonify({"error": "Cannot remove the workspace founder"}), 400
        
    # Fetch details before delete
    target_user = User.query.get(target_member.user_id) if target_member.user_id else None
    target_email = target_user.email if target_user else target_member.email
    target_name = target_user.name if target_user else target_email
    
    ws = Workspace.query.get(workspace_id)
    event = ChronicleEvent(
        workspace_id=workspace_id,
        event_type="team_left",
        title="Team Member Departed",
        description=f"{target_name} left the workspace.",
        stage=ws.stage if ws else "Think"
    )
    db.session.add(event)

    # Auto-generate offboarding handoff packet
    active_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.assignee_id == target_member.user_id,
        Task.status != 'Done',
        Task.status != 'Cancelled'
    ).all()

    members = WorkspaceMember.query.filter_by(workspace_id=workspace_id, status="active").all()
    user_workloads = []
    for m in members:
        if m.user_id == target_member.user_id:
            continue
        u = User.query.get(m.user_id)
        if not u:
            continue
        open_task_count = Task.query.filter(
            Task.workspace_id == workspace_id,
            Task.assignee_id == m.user_id,
            Task.status != 'Done',
            Task.status != 'Cancelled'
        ).count()
        user_workloads.append({
            "name": u.name,
            "email": u.email,
            "role": m.role,
            "workload": open_task_count
        })

    md = f"# Offboarding: {target_name}\n\n"
    md += f"**Departing**: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
    md += "## Active Tasks\n"
    if active_tasks:
        for t in active_tasks:
            md += f"- {t.title}\n"
    else:
        md += "_No active tasks._\n"
    md += "\n## Team Workloads\n"
    for w in user_workloads:
        md += f"- {w['name']} ({w['role']}): {w['workload']} tasks\n"

    packet = HandoffPacket(
        workspace_id=workspace_id,
        packet_type="offboarding",
        user_id=target_member.user_id,
        user_name=target_name,
        markdown_content=md,
        created_by=current_user_id,
    )
    db.session.add(packet)
    db.session.delete(target_member)
    db.session.commit()
    return jsonify({"message": "Member removed successfully"})

@workspaces_bp.route('/workspaces/<int:workspace_id>', methods=['DELETE'])
@token_required
def delete_workspace(current_user_id, workspace_id):
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=current_user_id).first()
    if not member or member.role not in ['founder', 'admin']:
        return jsonify({"error": "Unauthorized to delete workspace"}), 403

    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    # Delete all related data explicitly (cascades may not cover all)
    for model in [ChronicleEvent, ActivityEvent]:
        model.query.filter_by(workspace_id=workspace_id).delete()
    WorkspaceMember.query.filter_by(workspace_id=workspace_id).delete()

    db.session.delete(ws)
    db.session.commit()
    return jsonify({"message": f"Workspace '{ws.name}' deleted successfully"})

@workspaces_bp.route('/workspaces/<int:workspace_id>/archive', methods=['POST'])
@token_required
def archive_workspace(current_user_id, workspace_id):
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=current_user_id).first()
    if not member or member.role not in ['founder', 'admin']:
        return jsonify({"error": "Unauthorized"}), 403

    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    ws.is_archived = not ws.is_archived
    db.session.commit()
    status = "archived" if ws.is_archived else "unarchived"
    return jsonify({"message": f"Workspace '{ws.name}' {status}", "is_archived": ws.is_archived})

@workspaces_bp.route('/workspaces/health', methods=['GET'])
@token_required
def workspaces_health(current_user_id):
    memberships = WorkspaceMember.query.filter_by(user_id=current_user_id, status='active').all()
    from models.goal import Goal
    from models.task import Task
    from models.blocker import Blocker
    from datetime import datetime, timedelta

    result = []
    for m in memberships:
        ws = Workspace.query.get(m.workspace_id)
        if not ws:
            continue

        ws_id = ws.id
        total_goals = Goal.query.filter_by(workspace_id=ws_id).count()
        completed_goals = Goal.query.filter_by(workspace_id=ws_id, status='completed').count()
        total_tasks = Task.query.filter_by(workspace_id=ws_id).count()
        from sqlalchemy import func
        open_tasks = Task.query.filter(Task.workspace_id == ws_id, func.lower(Task.status).notin_(['completed', 'done'])).count()
        completed_tasks = Task.query.filter(Task.workspace_id == ws_id, func.lower(Task.status).in_(['completed', 'done'])).count()
        blockers = Blocker.query.filter_by(workspace_id=ws_id).count()
        recent_activity = ChronicleEvent.query.filter(
            ChronicleEvent.workspace_id == ws_id,
            ChronicleEvent.created_at >= datetime.utcnow() - timedelta(days=7)
        ).count()

        goal_pct = (completed_goals / total_goals * 100) if total_goals > 0 else 0
        task_pct = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0

        health_score = min(100, round(
            goal_pct * 0.3 +
            task_pct * 0.3 +
            max(0, 100 - blockers * 10) * 0.2 +
            min(100, recent_activity * 10) * 0.2
        ))

        active_members = WorkspaceMember.query.filter_by(workspace_id=ws_id, status='active').count()
        pending_members = WorkspaceMember.query.filter_by(workspace_id=ws_id, status='pending').count()

        result.append({
            "id": ws_id,
            "name": ws.name,
            "description": ws.description,
            "stage": ws.stage,
            "color": ws.color,
            "is_archived": ws.is_archived,
            "active_phase": ws.active_phase,
            "health_score": health_score,
            "total_goals": total_goals,
            "completed_goals": completed_goals,
            "total_tasks": total_tasks,
            "open_tasks": open_tasks,
            "completed_tasks": completed_tasks,
            "blockers": blockers,
            "active_members": active_members,
            "pending_members": pending_members,
            "recent_activity": recent_activity,
            "role": m.role
        })

    return jsonify(result)

@workspaces_bp.route('/workspaces/<int:workspace_id>/members/<int:member_id>/role', methods=['PUT'])
@token_required
def update_member_role(current_user_id, workspace_id, member_id):
    current_member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=current_user_id).first()
    if not current_member or current_member.role not in ['founder', 'admin']:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    new_role = data.get('role')
    if new_role not in ['admin', 'member']:
        return jsonify({"error": "Invalid role. Must be 'admin' or 'member'"}), 400

    target = WorkspaceMember.query.filter_by(id=member_id, workspace_id=workspace_id).first()
    if not target:
        return jsonify({"error": "Member not found"}), 404
    if target.role == 'founder':
        return jsonify({"error": "Cannot change founder role"}), 400

    target.role = new_role
    db.session.commit()
    return jsonify(target.to_dict())
