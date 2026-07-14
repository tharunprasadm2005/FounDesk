from models.meeting_notes import MeetingNotes

def sync(events, workspace_id):
    records = []
    for ev in events:
        records.append(MeetingNotes(
            title=ev.get("name", "Scheduled Meeting"),
            summary=f"Calendly event: {ev.get('start_time', '')} - {ev.get('end_time', '')}",
            workspace_id=workspace_id,
        ))
    return records
