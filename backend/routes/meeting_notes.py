from flask import Blueprint, request, jsonify
from config.database import db
from models.meeting_notes import MeetingNotes
from models.task import Task
from models.decision_log import DecisionLog
from models.workspace import Workspace
from models.chronicle_event import ChronicleEvent
from utils.auth import token_required
from utils.workspace_auth import get_current_workspace_id
from datetime import datetime
from sqlalchemy.orm import selectinload
from sqlalchemy import case
import re
import html as html_mod

def _strip_html(text):
    import re as _re
    text = _re.sub(r'<[^>]+>', ' ', text)
    text = html_mod.unescape(text)
    return _re.sub(r'\s+', ' ', text).strip()


def _clean_decision_text(raw_text):
    cleaned = _strip_html(raw_text)
    prefixes = ["decision:", "decided:", "we decided", "agreed on", "agreed to"]
    for p in prefixes:
        if cleaned.lower().startswith(p):
            cleaned = cleaned[len(p):].strip()
    cleaned = re.sub(r'^["\'\\[{(-]+', '', cleaned).strip()
    if len(cleaned) < 5:
        return None
    return cleaned[:500]


notes_bp = Blueprint('meeting_notes', __name__)

@notes_bp.route('/notes', methods=['GET'])
@token_required
def get_notes(current_user_id):
    import traceback
    try:
        workspace_id = get_current_workspace_id(current_user_id)
        if not workspace_id:
            return jsonify({"error": "No active workspace context"}), 400

        search = request.args.get('search', '').strip()
        meeting_type = request.args.get('meeting_type', '').strip()
        status_filter = request.args.get('status', '').strip()
        query = MeetingNotes.query.options(
            selectinload(MeetingNotes.linked_tasks),
            selectinload(MeetingNotes.linked_decisions)
        ).filter_by(workspace_id=workspace_id)
        
        if search:
            query = query.filter(
                (MeetingNotes.title.ilike(f"%{search}%")) |
                (MeetingNotes.summary.ilike(f"%{search}%")) |
                (MeetingNotes.attendees.ilike(f"%{search}%")) |
                (MeetingNotes.agenda.ilike(f"%{search}%")) |
                (MeetingNotes.tags.ilike(f"%{search}%"))
            )
        if meeting_type:
            query = query.filter(MeetingNotes.meeting_type == meeting_type)
        if status_filter:
            query = query.filter(MeetingNotes.status == status_filter)

        status_order = case(
            (MeetingNotes.status == 'Draft', 0),
            (MeetingNotes.status == 'Processed', 1),
            else_=2
        )
        notes = query.order_by(status_order, MeetingNotes.date.desc()).all()

        safe_notes = []
        for n in notes:
            try:
                safe_notes.append(n.to_dict())
            except Exception:
                safe_notes.append({"id": n.id, "title": n.title or "Error loading note"})
        return jsonify(safe_notes)
    except Exception as e:
        print(f"GET /notes error: {e}\n{traceback.format_exc()}")
        return jsonify({"error": "Failed to fetch notes", "message": str(e)}), 500

@notes_bp.route('/notes', methods=['POST'])
@token_required
def create_note(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({"error": "Title is required"}), 400
        
    date_val = datetime.utcnow()
    if data.get('date'):
        try:
            date_str = data.get('date').replace('Z', '+00:00')
            date_val = datetime.fromisoformat(date_str)
        except Exception:
            pass
            
    follow_up_val = None
    if data.get('follow_up_at'):
        try:
            follow_up_str = data.get('follow_up_at').replace('Z', '+00:00')
            follow_up_val = datetime.fromisoformat(follow_up_str)
        except Exception:
            pass
            
    note = MeetingNotes(
        title=data.get('title'),
        summary=data.get('summary', ''),
        attendees=data.get('attendees', ''),
        duration=data.get('duration'),
        date=date_val,
        meeting_type=data.get('meeting_type'),
        tags=data.get('tags'),
        agenda=data.get('agenda'),
        recording_url=data.get('recording_url'),
        calendar_event_id=data.get('calendar_event_id'),
        status=data.get('status', 'Draft'),
        follow_up_at=follow_up_val,
        created_by=current_user_id,
        workspace_id=workspace_id
    )
    
    db.session.add(note)
    db.session.commit()

    return jsonify(note.to_dict()), 201

@notes_bp.route('/notes/<int:note_id>', methods=['PUT'])
@token_required
def update_note(current_user_id, note_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    note = MeetingNotes.query.filter_by(id=note_id, workspace_id=workspace_id).first()
    if not note:
        return jsonify({"error": "Meeting note not found in this workspace"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if 'title' in data:
        if not data['title'].strip():
            return jsonify({"error": "Title cannot be empty"}), 400
        note.title = data['title']
    if 'summary' in data:
        note.summary = data['summary']
    if 'attendees' in data:
        note.attendees = data['attendees']
    if 'duration' in data:
        note.duration = data['duration']
    if 'date' in data:
        try:
            date_str = data['date'].replace('Z', '+00:00')
            note.date = datetime.fromisoformat(date_str)
        except Exception:
            pass
    if 'meeting_type' in data:
        note.meeting_type = data['meeting_type']
    if 'tags' in data:
        note.tags = data['tags']
    if 'agenda' in data:
        note.agenda = data['agenda']
    if 'recording_url' in data:
        note.recording_url = data['recording_url']
    if 'calendar_event_id' in data:
        note.calendar_event_id = data['calendar_event_id']
    if 'status' in data:
        note.status = data['status']
    if 'follow_up_at' in data:
        if data['follow_up_at']:
            try:
                follow_up_str = data['follow_up_at'].replace('Z', '+00:00')
                note.follow_up_at = datetime.fromisoformat(follow_up_str)
            except Exception:
                note.follow_up_at = None
        else:
            note.follow_up_at = None

    db.session.commit()
    return jsonify(note.to_dict())

@notes_bp.route('/notes/<int:note_id>', methods=['DELETE'])
@token_required
def delete_note(current_user_id, note_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    note = MeetingNotes.query.filter_by(id=note_id, workspace_id=workspace_id).first()
    if not note:
        return jsonify({"error": "Meeting note not found in this workspace"}), 404
        
    db.session.delete(note)
    db.session.commit()
    return jsonify({"message": "Meeting note deleted successfully"})

@notes_bp.route('/notes/<int:note_id>/process', methods=['POST'])
@token_required
def process_note(current_user_id, note_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    note = MeetingNotes.query.filter_by(id=note_id, workspace_id=workspace_id).first()
    if not note:
        return jsonify({"error": "Meeting note not found in this workspace"}), 404

    data = request.get_json() or {}
    transcript = data.get("transcript") or data.get("raw_notes") or data.get("text") or note.summary or ""
    
    if not transcript.strip():
        return jsonify({"error": "No transcript or notes text available for processing"}), 400

    summary_text = ""
    tasks_extracted = []
    decisions_extracted = []

    lines = [line.strip() for line in transcript.split("\n") if line.strip()]
    summary_text = " ".join(lines[:3])
    if len(summary_text) > 150:
        summary_text = summary_text[:147] + "..."
    
    for line in lines:
        clean_line = _clean_decision_text(line)
        if clean_line is None:
            continue
        task_match = re.match(r'^(?:-\s*\[\s*\]|-\s+task:|-\s+todo:|\*\s+task:|\*\s+todo:|todo:|task:|action item:)\s*(.*)', clean_line, re.IGNORECASE)
        if task_match:
            task_title = _clean_decision_text(task_match.group(1))
            if task_title:
                tasks_extracted.append({
                    "title": task_title,
                    "description": task_title,
                    "priority": "P2"
                })
        elif any(word in clean_line.lower() for word in ["needs to", "should", "will draft"]):
            tasks_extracted.append({
                "title": clean_line,
                "description": clean_line,
                "priority": "P2"
            })

    for line in lines:
        clean_line = _clean_decision_text(line)
        if clean_line is None:
            continue
        decision_match = re.match(r'^(?:decision:|decided:)\s*(.*)', clean_line, re.IGNORECASE)
        if decision_match:
            dec_title = _clean_decision_text(decision_match.group(1))
            if dec_title:
                decisions_extracted.append({
                    "decision": dec_title,
                    "context": "Extracted from meeting notes",
                    "alternatives": None,
                    "attendees": note.attendees or ""
                })
        elif any(phrase in clean_line.lower() for phrase in ["we decided", "agreed on", "agreed to"]):
            decisions_extracted.append({
                "decision": clean_line,
                "context": "Extracted from meeting notes",
                "alternatives": None,
                "attendees": note.attendees or ""
            })

    note.summary = summary_text
    note.status = "Finalized"
    
    workspace = Workspace.query.get(workspace_id)
    stage = workspace.stage if workspace else "Think"

    created_tasks = []
    for t_data in tasks_extracted:
        task_obj = Task(
            title=t_data.get("title")[:255] if t_data.get("title") else "Untitled Task",
            description=t_data.get("description"),
            priority=t_data.get("priority", "P2"),
            status="Not Started",
            user_id=note.created_by,
            workspace_id=workspace_id,
            linked_meeting_id=note.id
        )
        db.session.add(task_obj)
        created_tasks.append(task_obj)

    # Dedup: skip if decisions already exist for this meeting
    existing_for_meeting = set()
    for ed in DecisionLog.query.filter_by(workspace_id=workspace_id, linked_meeting_id=note.id).all():
        if ed.decision:
            existing_for_meeting.add(ed.decision.lower().strip())

    created_decisions = []
    for d_data in decisions_extracted:
        dec_title = (d_data.get("decision") or "Untitled Decision").strip()
        if dec_title.lower() in existing_for_meeting:
            continue
        existing_for_meeting.add(dec_title.lower())
        dec_obj = DecisionLog(
            decision=dec_title,
            context=d_data.get("context") or "Extracted from meeting notes",
            alternatives=d_data.get("alternatives"),
            attendees=d_data.get("attendees") or note.attendees,
            startup_stage=stage,
            linked_meeting_id=note.id,
            created_by=note.created_by,
            workspace_id=workspace_id
        )
        db.session.add(dec_obj)
        created_decisions.append(dec_obj)

    # Create chronicle entry for the meeting
    chronicle = ChronicleEvent(
        workspace_id=workspace_id,
        event_type="meeting",
        title=note.title,
        description=f"Meeting \"{note.title}\" was processed. Extracted {len(tasks_extracted)} tasks and {len(decisions_extracted)} strategic decisions.\n\n{summary_text}",
        stage=stage,
        user_id=current_user_id
    )
    db.session.add(chronicle)

    db.session.commit()

    return jsonify({
        "message": "Processed successfully",
        "note": note.to_dict(),
        "tasks": [t.to_dict() for t in created_tasks],
        "decisions": [d.to_dict() for d in created_decisions]
    }), 200


@notes_bp.route('/notes/auto-process', methods=['POST'])
@token_required
def auto_process_notes(current_user_id):
    workspace_id = get_current_workspace_id(current_user_id)
    if not workspace_id:
        return jsonify({"error": "No active workspace context"}), 400

    draft_notes = MeetingNotes.query.filter_by(
        workspace_id=workspace_id,
        status="Draft"
    ).all()

    results = {"processed": 0, "tasks_created": 0, "decisions_created": 0, "errors": 0}
    for note in draft_notes:
        try:
            transcript = note.summary or ""
            if not transcript.strip():
                note.status = "Finalized"
                db.session.commit()
                results["processed"] += 1
                continue

            lines = [l.strip() for l in transcript.split("\n") if l.strip()]
            tasks_extracted = []
            decisions_extracted = []
            workspace = Workspace.query.get(workspace_id)
            stage = workspace.stage if workspace else "Think"

            for line in lines:
                clean_line = _clean_decision_text(line)
                if clean_line is None:
                    continue
                task_match = __import__('re').match(
                    r'^(?:-\s*\[\s*\]|-\s+task:|-\s+todo:|\*\s+task:|\*\s+todo:|todo:|task:|action item:)\s*(.*)',
                    clean_line, __import__('re').IGNORECASE
                )
                if task_match:
                    tt = _clean_decision_text(task_match.group(1))
                    if tt:
                        tasks_extracted.append({"title": tt, "description": tt, "priority": "P2"})

            for line in lines:
                clean_line = _clean_decision_text(line)
                if clean_line is None:
                    continue
                if any(word in clean_line.lower() for word in ["we decided", "agreed on", "agreed to", "decision:", "decided:"]):
                    dec_text = _clean_decision_text(clean_line)
                    if dec_text:
                        decisions_extracted.append({
                            "decision": dec_text,
                            "context": "Extracted from meeting notes",
                            "alternatives": None,
                            "attendees": note.attendees or ""
                        })

            for t in tasks_extracted:
                task_obj = Task(
                    title=t["title"][:255], description=t["description"],
                    priority="P2", status="Not Started",
                    user_id=note.created_by, workspace_id=workspace_id,
                    linked_meeting_id=note.id
                )
                db.session.add(task_obj)
                results["tasks_created"] += 1

            existing_for_meeting = set()
            for ed in DecisionLog.query.filter_by(workspace_id=workspace_id, linked_meeting_id=note.id).all():
                if ed.decision:
                    existing_for_meeting.add(ed.decision.lower().strip())

            for d in decisions_extracted:
                dec_title = d["decision"].strip()
                if dec_title.lower() in existing_for_meeting:
                    continue
                existing_for_meeting.add(dec_title.lower())
                dec_obj = DecisionLog(
                    decision=dec_title, context=d["context"],
                    alternatives=d["alternatives"], attendees=d["attendees"],
                    startup_stage=stage, linked_meeting_id=note.id,
                    created_by=note.created_by, workspace_id=workspace_id
                )
                db.session.add(dec_obj)
                results["decisions_created"] += 1

            if tasks_extracted or decisions_extracted:
                chronicle = ChronicleEvent(
                    workspace_id=workspace_id, event_type="meeting",
                    title=f"Auto-processed: {note.title}",
                    description=f"Extracted {len(tasks_extracted)} tasks and {len(decisions_extracted)} decisions.",
                    stage=stage, user_id=current_user_id
                )
                db.session.add(chronicle)

            note.status = "Finalized"
            results["processed"] += 1
        except Exception as e:
            print(f"Auto-process note {note.id} failed: {e}")
            results["errors"] += 1

    db.session.commit()
    return jsonify(results)
