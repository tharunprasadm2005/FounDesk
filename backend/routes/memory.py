from flask import Blueprint, request, jsonify
from config.database import db
from models.goal import Goal
from models.task import Task
from models.decision_log import DecisionLog
from models.meeting_notes import MeetingNotes
from models.knowledge_item import KnowledgeItem
from models.user import User
from models.workspace import Workspace
from models.workspace_member import WorkspaceMember
from models.chronicle_event import ChronicleEvent
from models.handoff_packet import HandoffPacket
from models.activity_event import ActivityEvent
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from sqlalchemy.orm import selectinload
from datetime import datetime
import re

memory_bp = Blueprint('memory', __name__)

def tokenize(text):
    if not text:
        return []
    tokens = re.findall(r'\w+', text.lower())
    stopwords = {'the', 'a', 'an', 'is', 'of', 'to', 'for', 'in', 'and', 'or', 'on', 'at', 'this', 'that', 'with', 'by', 'i', 'we', 'you', 'he', 'she', 'they', 'it'}
    return [t for t in tokens if t not in stopwords]

@memory_bp.route('/memory/search', methods=['GET'])
@token_required
def search_memory(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    query_str = request.args.get('q', '').strip()
    if not query_str:
        return jsonify([])

    # 1. Fetch Candidates (filtered by workspace_id and capped at 200 items each to prevent full table scans)
    goals = Goal.query.filter_by(workspace_id=workspace_id).limit(200).all()
    tasks = Task.query.options(selectinload(Task.goal)).filter_by(workspace_id=workspace_id).limit(200).all()
    decisions = DecisionLog.query.options(selectinload(DecisionLog.linked_tasks)).filter_by(workspace_id=workspace_id).limit(200).all()
    notes = MeetingNotes.query.options(selectinload(MeetingNotes.linked_tasks), selectinload(MeetingNotes.linked_decisions)).filter_by(workspace_id=workspace_id).limit(200).all()
    knowledge_items = KnowledgeItem.query.filter_by(workspace_id=workspace_id).limit(200).all()

    results = []

    # TF-IDF Token Fallback
    query_tokens = tokenize(query_str)
    if query_tokens:
        for g in goals:
            title_tok = tokenize(g.title)
            desc_tok = tokenize(g.description)
            title_matches = sum(1 for t in query_tokens if t in title_tok)
            desc_matches = sum(1 for t in query_tokens if t in desc_tok)
            score = (title_matches * 3.0) + (desc_matches * 1.0)
            if score > 0:
                relevance_pct = min(100.0, (score / len(query_tokens)) * 25.0)
                results.append({"type": "goal", "score": round(relevance_pct, 1), "data": g.to_dict()})

        for t in tasks:
            title_tok = tokenize(t.title)
            desc_tok = tokenize(t.description)
            status_tok = tokenize(t.status)
            priority_tok = tokenize(t.priority)
            
            title_matches = sum(1 for tok in query_tokens if tok in title_tok)
            desc_matches = sum(1 for tok in query_tokens if tok in desc_tok)
            tag_matches = sum(1 for tok in query_tokens if tok in status_tok or tok in priority_tok)
            
            score = (title_matches * 3.0) + (desc_matches * 1.0) + (tag_matches * 2.0)
            if score > 0:
                relevance_pct = min(100.0, (score / len(query_tokens)) * 25.0)
                results.append({"type": "task", "score": round(relevance_pct, 1), "data": t.to_dict()})

        for d in decisions:
            decision_tok = tokenize(d.decision)
            context_tok = tokenize(d.context)
            alt_tok = tokenize(d.alternatives)
            attendees_tok = tokenize(d.attendees)
            
            title_matches = sum(1 for tok in query_tokens if tok in decision_tok)
            desc_matches = sum(1 for tok in query_tokens if tok in context_tok or tok in alt_tok)
            tag_matches = sum(1 for tok in query_tokens if tok in attendees_tok)
            
            score = (title_matches * 3.0) + (desc_matches * 1.0) + (tag_matches * 2.0)
            if score > 0:
                relevance_pct = min(100.0, (score / len(query_tokens)) * 25.0)
                results.append({"type": "decision", "score": round(relevance_pct, 1), "data": d.to_dict()})

        for n in notes:
            title_tok = tokenize(n.title)
            summary_tok = tokenize(n.summary)
            attendees_tok = tokenize(n.attendees)
            
            title_matches = sum(1 for tok in query_tokens if tok in title_tok)
            desc_matches = sum(1 for tok in query_tokens if tok in summary_tok)
            tag_matches = sum(1 for tok in query_tokens if tok in attendees_tok)
            
            score = (title_matches * 3.0) + (desc_matches * 1.0) + (tag_matches * 2.0)
            if score > 0:
                relevance_pct = min(100.0, (score / len(query_tokens)) * 25.0)
                results.append({"type": "meeting", "score": round(relevance_pct, 1), "data": n.to_dict()})

        for k in knowledge_items:
            title_tok = tokenize(k.title)
            content_tok = tokenize(getattr(k, 'summary', '') or '')
            cat_tok = tokenize(getattr(k, 'knowledge_type', '') or '')

            title_matches = sum(1 for tok in query_tokens if tok in title_tok)
            desc_matches = sum(1 for tok in query_tokens if tok in content_tok)
            tag_matches = sum(1 for tok in query_tokens if tok in cat_tok)

            score = (title_matches * 3.0) + (desc_matches * 1.0) + (tag_matches * 2.0)
            if score > 0:
                relevance_pct = min(100.0, (score / len(query_tokens)) * 25.0)
                try:
                    kd = k.to_dict()
                except Exception:
                    kd = {"id": getattr(k, 'id', None), "title": getattr(k, 'title', None), "error": "serialization failed"}
                results.append({"type": "knowledge", "score": round(relevance_pct, 1), "data": kd})

    # Sort descending by score
    results.sort(key=lambda r: r["score"], reverse=True)
    return jsonify(results)

@memory_bp.route('/handoff/onboard', methods=['POST'])
@token_required
def get_onboarding_packet(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json(silent=True) or {}
    new_user_id = data.get("new_user_id")
    if not new_user_id:
        return jsonify({"error": "new_user_id parameter is required"}), 400

    new_user = User.query.get(new_user_id)
    if not new_user:
        return jsonify({"error": "New user not found"}), 404

    workspace = Workspace.query.get(workspace_id)
    member = WorkspaceMember.query.filter_by(workspace_id=workspace_id, user_id=new_user_id).first()
    
    # 1. Fetch user specific active tasks
    user_tasks = Task.query.filter_by(workspace_id=workspace_id, assignee_id=new_user_id).all()
    
    # 2. Fetch decisions created by them or where their name is in attendees
    decisions = DecisionLog.query.filter_by(workspace_id=workspace_id).order_by(DecisionLog.created_at.desc()).all()
    user_name = new_user.name or ""
    relevant_decisions = []
    for d in decisions:
        is_relevant = (d.created_by == new_user_id) or (user_name.lower() in (d.attendees or "").lower())
        if is_relevant:
            relevant_decisions.append(d)
            if len(relevant_decisions) >= 5:
                break
    if not relevant_decisions and decisions:
        relevant_decisions = decisions[:5]
    
    meetings = MeetingNotes.query.filter_by(workspace_id=workspace_id).order_by(MeetingNotes.date.desc()).all()
    relevant_meetings = []
    for m in meetings:
        is_relevant = (m.created_by == new_user_id) or (user_name.lower() in (m.attendees or "").lower())
        if is_relevant:
            relevant_meetings.append(m)
            if len(relevant_meetings) >= 5:
                break
    if not relevant_meetings and meetings:
        relevant_meetings = meetings[:5]

    # 4. Fetch failed goals/lessons context
    failed_goals = Goal.query.filter_by(workspace_id=workspace_id, status="failed").limit(3).all()
    failed_tasks = Task.query.filter_by(workspace_id=workspace_id, status="Cancelled").limit(3).all()

    # Create narrative markdown
    md = f"# 🚀 Welcome to FounDesk: Onboarding Handoff Packet\n\n"
    md += f"**Prepared for**: {new_user.name} ({new_user.email})\n"
    md += f"**Role**: {member.role.capitalize() if member else 'Team Member'}\n"
    md += f"**Workspace Stage**: {workspace.stage if workspace else 'Think'}\n"
    md += f"**Active Phase**: {workspace.active_phase.replace('_', ' ').title() if workspace and workspace.active_phase else 'General Execution'}\n\n"

    md += "## 📋 Your Active Tasks\n"
    if user_tasks:
        for t in user_tasks:
            md += f"- **[{t.priority}] {t.title}** - *Status: {t.status}*\n"
            if t.description:
                md += f"  > {t.description}\n"
    else:
        md += "_No active tasks currently assigned to you. Check the Execute board to claim tasks!_\n"

    md += "\n## 🧠 Strategic Decisions You Should Know\n"
    if relevant_decisions:
        for d in relevant_decisions[:5]:
            md += f"### Decision #{d.id}: {d.decision}\n"
            md += f"- **Date**: {d.created_at.strftime('%Y-%m-%d') if d.created_at else 'N/A'}\n"
            if d.context:
                md += f"- **Why it was made**: {d.context}\n"
            if d.alternatives:
                md += f"- **Alternatives considered**: {d.alternatives}\n"
            if d.attendees:
                md += f"- **Involved**: {d.attendees}\n"
            md += "\n"
    else:
        md += "_No recent strategic decisions logged._\n"

    md += "\n## 📅 Recent Meeting Synchronizations\n"
    if relevant_meetings:
        for m in relevant_meetings[:5]:
            md += f"### Meeting: {m.title}\n"
            md += f"- **Date**: {m.date.strftime('%Y-%m-%d') if m.date else 'N/A'}\n"
            if m.summary:
                md += f"  > {m.summary}\n"
            md += "\n"
    else:
        md += "_No recent meetings logged._\n"

    md += "\n## ⚠️ Historical Lessons & Failed Attempts\n"
    has_lessons = False
    if failed_goals:
        has_lessons = True
        md += "### Failed Strategic Goals:\n"
        for g in failed_goals:
            md += f"- **{g.title}**: Rule-based templates or goals pivot required.\n"
    if failed_tasks:
        has_lessons = True
        md += "### Cancelled / Abandoned Tasks:\n"
        for t in failed_tasks:
            md += f"- **{t.title}** (Priority: {t.priority}) - {t.description or 'No reason logged.'}\n"
    if not has_lessons:
        md += "_No failed goals or cancelled tasks recorded. Off to a clean start!_\n"

    # Save to handoff_packets table
    packet = HandoffPacket(
        workspace_id=workspace_id,
        packet_type="onboarding",
        user_id=new_user_id,
        user_name=new_user.name,
        markdown_content=md,
        created_by=current_user_id
    )
    db.session.add(packet)

    # Create chronicle event
    chronicle = ChronicleEvent(
        workspace_id=workspace_id,
        event_type="team_joined",
        title=f"Onboarding: {new_user.name} joined the team",
        description=f"Onboarding packet generated for {new_user.name}. Role: {member.role.capitalize() if member else 'Team Member'}",
        stage=workspace.stage if workspace else "Think",
        user_id=new_user_id,
        source_type="handoff",
        source_id=packet.id
    )
    db.session.add(chronicle)
    db.session.commit()

    return jsonify({
        "new_user_id": new_user_id,
        "username": new_user.name,
        "markdown": md,
        "packet_id": packet.id,
        "created_at": packet.created_at.isoformat() + "Z"
    })

@memory_bp.route('/handoff/offboard', methods=['POST'])
@token_required
def get_offboarding_packet(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json(silent=True) or {}
    departing_user_id = data.get("departing_user_id")
    reassign_to_user_id = data.get("reassign_to_user_id")

    if not departing_user_id:
        return jsonify({"error": "departing_user_id is required"}), 400

    departing_user = User.query.get(departing_user_id)
    if not departing_user:
        return jsonify({"error": "Departing user not found"}), 404

    # 1. Fetch departing user's active tasks
    active_tasks = Task.query.filter(
        Task.workspace_id == workspace_id,
        Task.assignee_id == departing_user_id,
        Task.status != 'Done',
        Task.status != 'Cancelled'
    ).all()

    # 2. Query other workspace members for workloads
    members = WorkspaceMember.query.filter_by(workspace_id=workspace_id, status="active").all()
    user_workloads = []
    for m in members:
        if m.user_id == departing_user_id:
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
            "user_id": m.user_id,
            "name": u.name,
            "email": u.email,
            "role": m.role,
            "workload": open_task_count
        })

    # Reassign if requested
    reassigned_count = 0
    reassign_target = None
    if reassign_to_user_id:
        reassign_target = User.query.get(reassign_to_user_id)
        if reassign_target:
            for t in active_tasks:
                t.assignee_id = reassign_to_user_id
            db.session.commit()
            reassigned_count = len(active_tasks)

    # 3. Institutional Knowledge Scan: decisions and meetings departing user held context on
    departing_name = departing_user.name or ""
    all_decisions = DecisionLog.query.filter_by(workspace_id=workspace_id).all()
    held_decisions = []
    for d in all_decisions:
        if d.created_by == departing_user_id or (departing_name.lower() in (d.attendees or "").lower()):
            held_decisions.append(d)

    all_meetings = MeetingNotes.query.filter_by(workspace_id=workspace_id).all()
    held_meetings = []
    for m in all_meetings:
        if m.created_by == departing_user_id or (departing_name.lower() in (m.attendees or "").lower()):
            held_meetings.append(m)

    # Create narrative markdown
    md = f"# 🚪 Exit Offboarding & Knowledge Handoff\n\n"
    md += f"**Departing Member**: {departing_user.name} ({departing_user.email})\n"
    if reassign_target:
        md += f"**Reassignment Destination**: {reassign_target.name} ({reassign_target.email})\n"
        md += f"**Status**: {reassigned_count} active tasks successfully reassigned.\n\n"
    else:
        md += f"**Status**: Pending Reassignment. {len(active_tasks)} active tasks need owners.\n\n"

    md += "## 📋 Active Tasks Assessment\n"
    if active_tasks:
        for t in active_tasks:
            md += f"- **[{t.priority}] {t.title}**\n"
            if t.description:
                md += f"  > {t.description}\n"
            if reassign_target:
                md += f"  _Reassigned to {reassign_target.name}_\n"
    else:
        md += "_No active tasks assigned to this departing member._\n"

    md += "\n## 👥 Suggested Reassignment Owners (Active Workloads)\n"
    if user_workloads:
        for w in user_workloads:
            md += f"- **{w['name']}** ({w['role'].capitalize()}) - *Current Active Tasks: {w['workload']}*\n"
    else:
        md += "_No other active workspace members available for reassignment._\n"

    md += "\n## 🧠 Institutional Knowledge Surface\n"
    md += "The departing member was involved in or created the following memory logs. Review these to ensure no context is lost:\n\n"
    
    md += "### Key Decision Contributions:\n"
    if held_decisions:
        for d in held_decisions:
            md += f"- **Decision #{d.id}: {d.decision}** (Logged on {d.created_at.strftime('%Y-%m-%d') if d.created_at else 'N/A'})\n"
    else:
        md += "_No decision log contributions found._\n"

    md += "\n### Attended or Logged Meetings:\n"
    if held_meetings:
        for m in held_meetings:
            md += f"- **{m.title}** (Conducted on {m.date.strftime('%Y-%m-%d') if m.date else 'N/A'})\n"
    else:
        md += "_No meeting log contributions found._\n"

    # Save to handoff_packets table
    packet = HandoffPacket(
        workspace_id=workspace_id,
        packet_type="offboarding",
        user_id=departing_user_id,
        user_name=departing_user.name,
        markdown_content=md,
        reassign_to_user_id=reassign_to_user_id,
        reassign_to_name=reassign_target.name if reassign_target else None,
        reassigned_count=reassigned_count,
        created_by=current_user_id
    )
    db.session.add(packet)

    # Create chronicle event
    chronicle = ChronicleEvent(
        workspace_id=workspace_id,
        event_type="team_left",
        title=f"Offboarding: {departing_user.name} left the team",
        description=f"Offboarding packet generated. {reassigned_count} tasks reassigned to {reassign_target.name if reassign_target else 'unassigned'}.",
        stage=workspace.stage if workspace else "Think",
        user_id=departing_user_id,
        source_type="handoff",
        source_id=packet.id
    )
    db.session.add(chronicle)
    db.session.commit()

    return jsonify({
        "departing_user_id": departing_user_id,
        "departing_username": departing_user.name,
        "reassigned_count": reassigned_count,
        "markdown": md,
        "packet_id": packet.id,
        "created_at": packet.created_at.isoformat() + "Z"
    })

@memory_bp.route('/handoff/manual', methods=['POST'])
@token_required
def create_manual_handoff(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json(silent=True) or {}
    packet_type = (data.get("packet_type") or "").strip().lower()
    if packet_type not in ("onboarding", "offboarding"):
        return jsonify({"error": "packet_type must be 'onboarding' or 'offboarding'"}), 400

    user_name = (data.get("user_name") or "").strip()
    if not user_name:
        return jsonify({"error": "user_name is required"}), 400

    note = (data.get("note") or "").strip()
    role = (data.get("role") or "").strip()

    workspace = Workspace.query.get(workspace_id)
    stage = workspace.stage if workspace else "Think"
    direction = "joined" if packet_type == "onboarding" else "left"
    verb = "joined" if packet_type == "onboarding" else "left"

    md_lines = [f"# {'🚀 Onboarding' if packet_type == 'onboarding' else '🚪 Offboarding'} Handoff Packet\n"]
    md_lines.append(f"**Member**: {user_name}")
    if role:
        md_lines.append(f"**Role**: {role}")
    md_lines.append(f"**Date**: {datetime.utcnow().strftime('%Y-%m-%d')}")
    md_lines.append(f"**Recorded by**: {current_user_id}")
    if note:
        md_lines.append(f"\n## Notes\n{note}")
    else:
        md_lines.append(f"\n## Notes\n_{user_name} {verb} the team. Add context about handoff, access, and responsibilities._")
    md = "\n".join(md_lines)

    packet = HandoffPacket(
        workspace_id=workspace_id,
        packet_type=packet_type,
        user_id=data.get("user_id"),
        user_name=user_name,
        markdown_content=md,
        created_by=current_user_id
    )
    db.session.add(packet)
    db.session.flush()

    chronicle = ChronicleEvent(
        workspace_id=workspace_id,
        event_type="team_joined" if packet_type == "onboarding" else "team_left",
        title=f"{'Onboarding' if packet_type == 'onboarding' else 'Offboarding'}: {user_name} {verb} the team",
        description=f"Manual {'onboarding' if packet_type == 'onboarding' else 'offboarding'} packet created for {user_name}." + (f" Role: {role}." if role else "") + (f" Note: {note}" if note else ""),
        stage=stage,
        user_id=data.get("user_id"),
        source_type="handoff",
        source_id=packet.id
    )
    db.session.add(chronicle)
    db.session.commit()

    return jsonify({
        "packet": packet.to_dict(),
        "chronicle": chronicle.to_dict(),
        "message": f"{'Onboarding' if packet_type == 'onboarding' else 'Offboarding'} packet created for {user_name}"
    }), 201

@memory_bp.route('/handoff/packets', methods=['GET'])
@token_required
def list_handoff_packets(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    packet_type = request.args.get('type', '').strip()
    user_id = request.args.get('user_id', '').strip()

    query = HandoffPacket.query.filter_by(workspace_id=workspace_id)
    if packet_type:
        query = query.filter(HandoffPacket.packet_type == packet_type)
    if user_id:
        query = query.filter(HandoffPacket.user_id == int(user_id))

    packets = query.order_by(HandoffPacket.created_at.desc()).limit(50).all()
    return jsonify([p.to_dict() for p in packets])

@memory_bp.route('/chronicle', methods=['GET'])
@token_required
def get_chronicle(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    event_type_filter = request.args.get('event_type', '').strip()
    stage_filter = request.args.get('stage', '').strip()
    search_query = request.args.get('search', '').strip()

    EVENT_TYPE_ALIASES = {
        "meeting": "meeting_note",
        "meetings": "meeting_note",
        "integration": "activity",
        "integrations": "activity",
        "activity": "activity",
    }
    event_type_filter = EVENT_TYPE_ALIASES.get(event_type_filter.lower(), event_type_filter)

    workspace = Workspace.query.get(workspace_id)
    ws_stage = workspace.stage if workspace else "Think"

    events = []
    now = datetime.utcnow()

    # 1. Fetch from ChronicleEvent model (all event types)
    chronicle_query = ChronicleEvent.query.filter_by(workspace_id=workspace_id)
    if event_type_filter:
        if event_type_filter in ("milestone", "goal"):
            chronicle_query = chronicle_query.filter(ChronicleEvent.event_type.in_(["milestone", "goal"]))
        elif event_type_filter == "knowledge":
            chronicle_query = chronicle_query.filter(ChronicleEvent.event_type.in_(["knowledge", "knowledge_item"]))
        else:
            chronicle_query = chronicle_query.filter(ChronicleEvent.event_type == event_type_filter)
    if stage_filter:
        chronicle_query = chronicle_query.filter(ChronicleEvent.stage == stage_filter)
    if search_query:
        chronicle_query = chronicle_query.filter(
            (ChronicleEvent.title.ilike(f"%{search_query}%")) |
            (ChronicleEvent.description.ilike(f"%{search_query}%"))
        )
    chronicle_events = chronicle_query.order_by(ChronicleEvent.created_at.desc()).limit(200).all()

    # Record types that are re-added inline below (with canonical labels) so
    # we skip their ChronicleEvent rows here to avoid duplicates.
    RE_ADDED_TYPES = {"decision", "meeting", "meeting_note", "goal", "milestone", "knowledge", "knowledge_item"}
    TYPE_LABELS = {"meeting_note": "meeting", "knowledge_item": "knowledge", "goal": "milestone"}
    for ce in chronicle_events:
        if ce.event_type == "activity" and (ce.title or "").startswith("Ingested:"):
            continue
        if ce.event_type == "activity" and ce.source_id is not None:
            continue
        if ce.event_type in RE_ADDED_TYPES and ce.source_id is not None:
            continue
        if ce.source_type in RE_ADDED_TYPES and ce.source_id is not None:
            continue
        events.append({
            "type": TYPE_LABELS.get(ce.event_type, ce.event_type),
            "title": ce.title,
            "description": ce.description or "",
            "date": ce.created_at,
            "stage": ce.stage or ws_stage,
            "source_type": ce.source_type,
            "source_id": ce.source_id,
            "meta": ce.meta_data or {},
            "user_name": ce.user.name if ce.user else None
        })

    # 2. Completed goals as inline events (avoid duplicating if already in ChronicleEvent)
    existing_goal_ids = {e.get("source_id") for e in events if e.get("source_type") == "goal"}
    if not event_type_filter or event_type_filter == "milestone":
        completed_goals = Goal.query.filter_by(workspace_id=workspace_id, status="completed").all()
        for g in completed_goals:
            if g.id in existing_goal_ids:
                continue
            if search_query and not (search_query.lower() in (g.title or "").lower() or search_query.lower() in (g.description or "").lower()):
                continue
            evt_date = g.created_at or now
            events.append({
                "type": "milestone",
                "title": f"Goal Achieved: {g.title}",
                "description": g.description or "Workspace goal successfully marked as completed.",
                "date": evt_date,
                "stage": ws_stage,
                "source_type": "goal",
                "source_id": g.id,
                "meta": {"goal_type": g.goal_type},
                "user_name": None
            })

    # 3. Decisions as inline events
    existing_decision_ids = {e.get("source_id") for e in events if e.get("source_type") == "decision"}
    if not event_type_filter or event_type_filter == "decision":
        decisions = DecisionLog.query.filter_by(workspace_id=workspace_id).all()
        for d in decisions:
            if d.id in existing_decision_ids:
                continue
            if search_query and not (search_query.lower() in (d.decision or "").lower() or search_query.lower() in (d.context or "").lower()):
                continue
            if stage_filter and d.startup_stage != stage_filter:
                continue
            evt_date = d.created_at or now
            events.append({
                "type": "decision",
                "title": f"Decision: {d.decision}",
                "description": d.context or "A strategic choice was documented.",
                "date": evt_date,
                "stage": d.startup_stage or ws_stage,
                "source_type": "decision",
                "source_id": d.id,
                "meta": {"attendees": d.attendees, "status": d.status},
                "user_name": None
            })

    # 4. Meeting notes as inline events
    existing_meeting_ids = {e.get("source_id") for e in events if e.get("source_type") in ("meeting", "meeting_note")}
    if not event_type_filter or event_type_filter == "meeting_note":
        meetings = MeetingNotes.query.filter_by(workspace_id=workspace_id).all()
        for m in meetings:
            if m.id in existing_meeting_ids:
                continue
            if search_query and not (search_query.lower() in (m.title or "").lower() or search_query.lower() in (m.summary or "").lower()):
                continue
            evt_date = m.date or now
            events.append({
                "type": "meeting",
                "title": f"Meeting: {m.title}",
                "description": m.summary or "Post-meeting synchronization details.",
                "date": evt_date,
                "stage": ws_stage,
                "source_type": "meeting",
                "source_id": m.id,
                "meta": {"attendees": m.attendees, "duration": m.duration, "meeting_type": m.meeting_type, "status": m.status},
                "user_name": None
            })

    # 4b. Knowledge items as inline events
    existing_knowledge_ids = {e.get("source_id") for e in events if e.get("source_type") in ("knowledge", "knowledge_item")}
    if not event_type_filter or event_type_filter == "knowledge":
        knowledge_items = KnowledgeItem.query.filter_by(workspace_id=workspace_id).all()
        for k in knowledge_items:
            if k.id in existing_knowledge_ids:
                continue
            if search_query and not (search_query.lower() in (getattr(k, "title", "") or "").lower() or search_query.lower() in (getattr(k, "summary", "") or "").lower()):
                continue
            evt_date = getattr(k, "created_at", None) or now
            events.append({
                "type": "knowledge",
                "title": f"Knowledge: {getattr(k, 'title', '')}",
                "description": getattr(k, "summary", "") or "Knowledge item captured by the pipeline.",
                "date": evt_date,
                "stage": ws_stage,
                "source_type": "knowledge",
                "source_id": k.id,
                "meta": {"knowledge_type": getattr(k, "knowledge_type", None), "status": getattr(k, "status", None)},
                "user_name": None
            })

    # 5. ActivityEvents from integrations (events the pipeline sees)
    acts = ActivityEvent.query.filter_by(workspace_id=workspace_id).order_by(ActivityEvent.fetched_at.desc()).limit(100).all()
    existing_ae_source_ids = {e.get("source_id") for e in events if e.get("source_type") == "activity_event"}
    for a in acts:
        if event_type_filter and event_type_filter not in ("activity", "integration"):
            continue
        sid = str(a.id)
        if sid in existing_ae_source_ids:
            continue
        events.append({
            "type": "activity",
            "title": a.title or f"Event from {a.provider}",
            "description": a.details or f"Fetched from {a.provider}",
            "date": a.fetched_at or a.external_timestamp or now,
            "stage": ws_stage,
            "source_type": "activity_event",
            "source_id": sid,
            "meta": {"provider": a.provider, "activity_type": a.activity_type},
            "user_name": a.actor,
        })

    # Sort all events chronologically descending
    events.sort(key=lambda e: e["date"], reverse=True)

    total_count = len(events)
    paginated_events = events[offset:offset+limit]
    has_more = total_count > (offset + limit)

    formatted_events = []
    for e in paginated_events:
        source_type = e.get("source_type")
        source_id = e.get("source_id")
        source_url = None
        if source_type and source_id:
            route_map = {
                "decision": f"/memory/decisions/{source_id}",
                "meeting": f"/memory/notes/{source_id}",
                "meeting_note": f"/memory/notes/{source_id}",
                "goal": f"/plan/goals/{source_id}",
                "task": f"/execute/tasks/{source_id}",
                "blocker": f"/execute/blockers/{source_id}",
                "knowledge": f"/memory/knowledge/{source_id}",
                "knowledge_item": f"/memory/knowledge/{source_id}",
                "follow_up": f"/plan/follow-ups/{source_id}",
                "handoff": f"/memory/handoff/packets/{source_id}",
            }
            source_url = route_map.get(source_type)
            if not source_url and source_type in ("activity_event",):
                source_url = None
        formatted_events.append({
            "type": e["type"],
            "title": e["title"],
            "description": e["description"],
            "date": e["date"].isoformat() if isinstance(e["date"], datetime) else str(e["date"]),
            "stage": e["stage"],
            "source_type": source_type,
            "source_id": source_id,
            "source_url": source_url,
            "meta": e.get("meta", {}),
            "user_name": e.get("user_name")
        })

    return jsonify({
        "events": formatted_events,
        "has_more": has_more,
        "total_count": total_count
    })
