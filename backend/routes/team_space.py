from flask import Blueprint, jsonify, request
from utils.auth import token_required
from config.database import db
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.user import User
from models.task import Task
from models.goal import Goal
from models.blocker import Blocker
from models.chronicle_event import ChronicleEvent
from models.notification_preference import NotificationPreference
from models.team_models import SubTeam, SubTeamMember
from datetime import datetime, timedelta

team_space_bp = Blueprint('team_space', __name__)

def _get_ws_id(current_user_id):
    ws_id = request.headers.get("X-Workspace-Id")
    if ws_id:
        return int(ws_id)
    membership = WorkspaceMember.query.filter_by(user_id=current_user_id, status="active").first()
    return membership.workspace_id if membership else None


# ─── Org Chart ────────────────────────────────────────────────────
@team_space_bp.route('/workspaces/<int:workspace_id>/org-chart', methods=['GET'])
@token_required
def get_org_chart(current_user_id, workspace_id):
    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    members = WorkspaceMember.query.filter_by(workspace_id=workspace_id, status="active").all()
    sub_teams = SubTeam.query.filter_by(workspace_id=workspace_id).all()

    chart = {
        "workspace": ws.name,
        "founder": None,
        "admins": [],
        "members": [],
        "teams": []
    }

    for m in members:
        entry = {
            "id": m.id, "user_id": m.user_id, "name": m.user.name if m.user else m.email,
            "email": m.email, "role": m.role, "avatar": (m.user.name or "?")[0].upper() if m.user else "?"
        }
        if m.role == "founder":
            chart["founder"] = entry
        elif m.role == "admin":
            chart["admins"].append(entry)
        else:
            chart["members"].append(entry)

    for t in sub_teams:
        t_members = SubTeamMember.query.filter_by(sub_team_id=t.id).all()
        chart["teams"].append({
            "id": t.id, "name": t.name, "description": t.description,
            "members": [{
                "user_id": tm.user_id,
                "name": tm.user.name if tm.user else None,
                "email": tm.user.email if tm.user else None,
                "role": tm.role
            } for tm in t_members]
        })

    return jsonify(chart)


# ─── Permissions Matrix ────────────────────────────────────────────
@team_space_bp.route('/workspaces/<int:workspace_id>/permissions', methods=['GET'])
@token_required
def get_permissions(current_user_id, workspace_id):
    matrix = {
        "founder": {
            "view_workspace": True, "edit_workspace": True, "delete_workspace": True,
            "invite_members": True, "remove_members": True, "manage_roles": True,
            "create_goals": True, "edit_goals": True, "delete_goals": True,
            "create_tasks": True, "assign_tasks": True, "edit_tasks": True, "delete_tasks": True,
            "manage_billing": True, "manage_integrations": True, "view_analytics": True,
            "manage_teams": True, "archive_workspace": True, "export_data": True
        },
        "admin": {
            "view_workspace": True, "edit_workspace": True, "delete_workspace": False,
            "invite_members": True, "remove_members": True, "manage_roles": False,
            "create_goals": True, "edit_goals": True, "delete_goals": False,
            "create_tasks": True, "assign_tasks": True, "edit_tasks": True, "delete_tasks": True,
            "manage_billing": False, "manage_integrations": True, "view_analytics": True,
            "manage_teams": True, "archive_workspace": False, "export_data": True
        },
        "member": {
            "view_workspace": True, "edit_workspace": False, "delete_workspace": False,
            "invite_members": False, "remove_members": False, "manage_roles": False,
            "create_goals": True, "edit_goals": True, "delete_goals": False,
            "create_tasks": True, "assign_tasks": False, "edit_tasks": True, "delete_tasks": False,
            "manage_billing": False, "manage_integrations": False, "view_analytics": False,
            "manage_teams": False, "archive_workspace": False, "export_data": False
        }
    }
    return jsonify(matrix)


# ─── Member Profile ───────────────────────────────────────────────
@team_space_bp.route('/workspaces/<int:workspace_id>/members/<int:member_id>/profile', methods=['GET'])
@token_required
def get_member_profile(current_user_id, workspace_id, member_id):
    member = WorkspaceMember.query.filter_by(id=member_id, workspace_id=workspace_id).first()
    if not member:
        return jsonify({"error": "Member not found"}), 404

    user = User.query.get(member.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    tasks = Task.query.filter_by(workspace_id=workspace_id, assignee_id=user.id).order_by(Task.created_at.desc()).limit(20).all()
    goals = Goal.query.filter_by(workspace_id=workspace_id, user_id=user.id).order_by(Goal.created_at.desc()).limit(10).all()
    blockers = Blocker.query.filter_by(workspace_id=workspace_id, assigned_to=user.id).order_by(Blocker.created_at.desc()).limit(10).all()
    activity = ChronicleEvent.query.filter_by(workspace_id=workspace_id).order_by(ChronicleEvent.created_at.desc()).limit(20).all()
    prefs = NotificationPreference.query.filter_by(user_id=user.id, workspace_id=workspace_id).all()
    teams = SubTeamMember.query.filter_by(user_id=user.id).join(SubTeam).filter(SubTeam.workspace_id == workspace_id).all()

    return jsonify({
        "user": user.to_dict(),
        "role": member.role,
        "status": member.status,
        "joined_at": member.created_at.isoformat() if member.created_at else None,
        "tasks": [t.to_dict() for t in tasks],
        "goals": [g.to_dict() for g in goals],
        "blockers": [b.to_dict() for b in blockers],
        "activity": [a.to_dict() for a in activity],
        "notification_prefs": {p.rule_key: p.enabled for p in prefs},
        "teams": [{"id": tm.sub_team_id, "name": tm.sub_team.name, "role": tm.role} for tm in teams if tm.sub_team]
    })


# ─── Workload Distribution ────────────────────────────────────────
@team_space_bp.route('/workspaces/<int:workspace_id>/workload', methods=['GET'])
@token_required
def get_workload(current_user_id, workspace_id):
    members = WorkspaceMember.query.filter_by(workspace_id=workspace_id, status="active").all()
    workload = []

    for m in members:
        uid = m.user_id
        if not uid:
            continue
        task_count = Task.query.filter_by(workspace_id=workspace_id, assignee_id=uid).count()
        open_tasks = Task.query.filter_by(workspace_id=workspace_id, assignee_id=uid).filter(Task.status.notin_(["Completed", "Done"])).count()
        goal_count = Goal.query.filter_by(workspace_id=workspace_id, user_id=uid).count()
        blocker_count = Blocker.query.filter_by(workspace_id=workspace_id, assigned_to=uid, status="open").count()
        completed_tasks = Task.query.filter_by(workspace_id=workspace_id, assignee_id=uid).filter(Task.status.in_(["Completed", "Done"])).count()

        workload.append({
            "user_id": uid,
            "name": m.user.name if m.user else m.email,
            "email": m.email,
            "role": m.role,
            "total_tasks": task_count,
            "open_tasks": open_tasks,
            "completed_tasks": completed_tasks,
            "goals": goal_count,
            "open_blockers": blocker_count,
            "load_score": round((open_tasks * 2 + blocker_count * 3) / max(task_count, 1), 2) if task_count > 0 else 0
        })

    workload.sort(key=lambda x: x["load_score"], reverse=True)
    return jsonify(workload)


# ─── Team Activity Feed ──────────────────────────────────────────
@team_space_bp.route('/workspaces/<int:workspace_id>/activity', methods=['GET'])
@token_required
def get_team_activity(current_user_id, workspace_id):
    limit = request.args.get("limit", 30, type=int)
    events = ChronicleEvent.query.filter_by(workspace_id=workspace_id).order_by(ChronicleEvent.created_at.desc()).limit(limit).all()
    return jsonify([e.to_dict() for e in events])


# ─── Bulk Invite ─────────────────────────────────────────────────
@team_space_bp.route('/workspaces/<int:workspace_id>/invite-bulk', methods=['POST'])
@token_required
def bulk_invite(current_user_id, workspace_id):
    data = request.get_json() or {}
    raw = data.get("emails", "")
    role = data.get("role", "member")

    if role not in ("admin", "member"):
        return jsonify({"error": "Invalid role"}), 400

    emails = [e.strip().lower() for e in raw.replace("\n", ",").split(",") if e.strip()]
    if not emails:
        return jsonify({"error": "No valid emails provided"}), 400

    ws = Workspace.query.get(workspace_id)
    if not ws:
        return jsonify({"error": "Workspace not found"}), 404

    results = {"created": [], "already_member": [], "invalid": []}
    for email in emails:
        if "@" not in email or "." not in email:
            results["invalid"].append(email)
            continue

        existing = WorkspaceMember.query.filter_by(workspace_id=workspace_id, email=email).first()
        if existing:
            results["already_member"].append(email)
            continue

        user = User.query.filter_by(email=email).first()
        member = WorkspaceMember(
            workspace_id=workspace_id,
            user_id=user.id if user else None,
            email=email,
            role=role,
            status="pending" if not user else "active"
        )
        db.session.add(member)
        results["created"].append(email)

    if results["created"]:
        event = ChronicleEvent(
            workspace_id=workspace_id, event_type="team_joined",
            title=f"Bulk invite sent to {len(results['created'])} member(s)",
            description=", ".join(results["created"][:5]) + ("..." if len(results["created"]) > 5 else ""),
            stage=ws.active_phase or "build"
        )
        db.session.add(event)

    db.session.commit()
    return jsonify(results)


# ─── Sub-Teams CRUD ──────────────────────────────────────────────
@team_space_bp.route('/workspaces/<int:workspace_id>/teams', methods=['GET'])
@token_required
def list_teams(current_user_id, workspace_id):
    teams = SubTeam.query.filter_by(workspace_id=workspace_id).order_by(SubTeam.created_at.desc()).all()
    return jsonify([t.to_dict() for t in teams])


@team_space_bp.route('/workspaces/<int:workspace_id>/teams', methods=['POST'])
@token_required
def create_team(current_user_id, workspace_id):
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Team name is required"}), 400

    team = SubTeam(workspace_id=workspace_id, name=name, description=data.get("description", ""), created_by=current_user_id)
    db.session.add(team)
    db.session.commit()
    return jsonify(team.to_dict()), 201


@team_space_bp.route('/workspaces/<int:workspace_id>/teams/<int:team_id>', methods=['PUT'])
@token_required
def update_team(current_user_id, workspace_id, team_id):
    team = SubTeam.query.filter_by(id=team_id, workspace_id=workspace_id).first()
    if not team:
        return jsonify({"error": "Team not found"}), 404
    data = request.get_json() or {}
    if "name" in data:
        team.name = data["name"].strip()
    if "description" in data:
        team.description = data["description"]
    db.session.commit()
    return jsonify(team.to_dict())


@team_space_bp.route('/workspaces/<int:workspace_id>/teams/<int:team_id>', methods=['DELETE'])
@token_required
def delete_team(current_user_id, workspace_id, team_id):
    team = SubTeam.query.filter_by(id=team_id, workspace_id=workspace_id).first()
    if not team:
        return jsonify({"error": "Team not found"}), 404
    db.session.delete(team)
    db.session.commit()
    return jsonify({"message": "Team deleted"})


# ─── Sub-Team Members ────────────────────────────────────────────
@team_space_bp.route('/workspaces/<int:workspace_id>/teams/<int:team_id>/members', methods=['GET'])
@token_required
def list_team_members(current_user_id, workspace_id, team_id):
    members = SubTeamMember.query.filter_by(sub_team_id=team_id).all()
    return jsonify([m.to_dict() for m in members])


@team_space_bp.route('/workspaces/<int:workspace_id>/teams/<int:team_id>/members', methods=['POST'])
@token_required
def add_team_member(current_user_id, workspace_id, team_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")
    role = data.get("role", "member")

    if not user_id:
        return jsonify({"error": "user_id is required"}), 400

    existing = SubTeamMember.query.filter_by(sub_team_id=team_id, user_id=user_id).first()
    if existing:
        return jsonify({"error": "User is already a member of this team"}), 409

    membership = SubTeamMember(sub_team_id=team_id, user_id=user_id, role=role)
    db.session.add(membership)
    db.session.commit()
    return jsonify(membership.to_dict()), 201


@team_space_bp.route('/workspaces/<int:workspace_id>/teams/<int:team_id>/members/<int:user_id>', methods=['DELETE'])
@token_required
def remove_team_member(current_user_id, workspace_id, team_id, user_id):
    membership = SubTeamMember.query.filter_by(sub_team_id=team_id, user_id=user_id).first()
    if not membership:
        return jsonify({"error": "Membership not found"}), 404
    db.session.delete(membership)
    db.session.commit()
    return jsonify({"message": "Member removed from team"})
