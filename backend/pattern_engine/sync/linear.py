from models.task import Task
from datetime import datetime

ONBOARDING_TITLES = {
    "welcome to linear",
    "get familiar with linear",
    "connect your tools",
    "set up your teams",
    "invite your team",
}

def _is_onboarding_issue(issue):
    title = (issue.get("title") or "").strip().lower()
    if title in ONBOARDING_TITLES:
        return True
    if issue.get("isDefault") is True:
        return True
    return False

def sync(issues, workspace_id):
    records = []
    for issue in issues:
        if _is_onboarding_issue(issue):
            continue
        records.append(Task(
            title=issue.get("title", "Untitled")[:255],
            description=issue.get("description", ""),
            priority=_map_priority(issue.get("priority")),
            status="Done" if issue.get("state", {}).get("type") == "completed" else "Not Started",
            completed_at=datetime.utcnow() if issue.get("state", {}).get("type") == "completed" else None,
            workspace_id=workspace_id,
        ))
    return records

def _map_priority(pri):
    # Linear: 0=No priority, 1=Urgent, 2=High, 3=Medium, 4=Low
    if pri is None:
        return "P2"
    mapping = {1: "P0", 2: "P1", 3: "P2", 4: "P3"}
    return mapping.get(pri, "P2")
