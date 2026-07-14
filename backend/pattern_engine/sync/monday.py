from models.task import Task
from datetime import datetime

def sync(items, workspace_id):
    records = []
    for item in items:
        name = ""
        status = "Not Started"
        column_values = item.get("column_values", [])
        for col in column_values:
            if col.get("id") == "name":
                name = col.get("text", "")
            elif col.get("id") == "status":
                status = "Done" if col.get("text") == "Done" else "Not Started"
        records.append(Task(
            title=name or item.get("name", "Untitled")[:255],
            status=status,
            completed_at=datetime.utcnow() if status == "Done" else None,
            workspace_id=workspace_id,
        ))
    return records
