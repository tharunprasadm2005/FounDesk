from models.task import Task
from datetime import datetime

def sync(tasks, workspace_id):
    records = []
    for t in tasks:
        records.append(Task(
            title=t.get("name", "Untitled")[:255],
            description=t.get("notes", ""),
            status="Done" if t.get("completed") else "Not Started",
            completed_at=datetime.utcnow() if t.get("completed") else None,
            workspace_id=workspace_id,
        ))
    return records
