from app import app
with app.app_context():
    from models.meeting_notes import MeetingNotes
    from models.decision_log import DecisionLog
    from config.database import db
    from sqlalchemy import text
    
    meetings = MeetingNotes.query.filter_by(workspace_id=384).order_by(MeetingNotes.date.desc()).all()
    print(f'=== MEETING NOTES: {len(meetings)} total ===\n')
    
    for m in meetings:
        print(f'--- [{m.id}] {m.title} ---')
        print(f'  date={m.date} | type={m.meeting_type}')
        print(f'  source={m.source_integration} | source_event_id={m.source_event_id}')
        print(f'  status={m.status} | attendees={m.attendees}')
        print(f'  summary={m.summary[:120] if m.summary else "(empty)"}')
        print(f'  key_topics={m.key_topics}')
        print(f'  action_items={m.action_items}')
        print(f'  decisions_made={m.decisions_made}')
        print(f'  follow_up_needed={m.follow_up_needed} | follow_up_note={m.follow_up_note}')
        print(f'  created_by={m.created_by}')
        print()
    
    # Cross-links: decisions that link to meetings
    print('=== CROSS-LINKS TO DECISIONS ===')
    decisions = DecisionLog.query.filter(
        DecisionLog.workspace_id == 384,
        DecisionLog.linked_meeting_id.isnot(None)
    ).all()
    print(f'{len(decisions)} decisions linked to meetings:')
    for d in decisions:
        m = MeetingNotes.query.get(d.linked_meeting_id)
        m_title = m.title if m else '(deleted)'
        print(f'  Decision [{d.id}]: "{d.decision[:50]}" -> Meeting [{d.linked_meeting_id}]: "{m_title[:50]}"')
    
    # Tasks linked to meetings
    print('\n=== CROSS-LINKS TO TASKS ===')
    tasks = db.session.execute(text("""
        SELECT t.id, t.title, t.linked_meeting_id, m.title as m_title
        FROM tasks t
        LEFT JOIN meeting_notes m ON m.id = t.linked_meeting_id
        WHERE t.workspace_id = 384 AND t.linked_meeting_id IS NOT NULL
    """)).fetchall()
    print(f'{len(tasks)} tasks linked to meetings:')
    for t in tasks:
        print(f'  Task [{t[0]}]: "{t[1][:50]}" -> Meeting [{t[2]}]: "{t[3][:50] if t[3] else "(deleted)"}"')
