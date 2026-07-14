from models.task import Task
from datetime import datetime

def sync(items, workspace_id):
    records = []
    for item in items:
        is_pr = "pull_request" in item
        prefix = "[PR] " if is_pr else "[Issue] "
        title = item.get("title", "Untitled")[:255]
        records.append(Task(
            title=f"{prefix}{title}",
            description=item.get("body", ""),
            status="Done" if item.get("merged") or item.get("state") == "closed" else "Open",
            completed_at=datetime.utcnow() if item.get("merged") or item.get("state") == "closed" else None,
            workspace_id=workspace_id,
        ))
    return records
