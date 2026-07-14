from models.meeting_notes import MeetingNotes

def sync(events, workspace_id):
    records = []
    for ev in events:
        records.append(MeetingNotes(
            title=ev.get("summary", "Google Meet"),
            summary=ev.get("description", ""),
            attendees=", ".join(a.get("email", "") for a in ev.get("attendees", [])),
            workspace_id=workspace_id,
        ))
    return records
