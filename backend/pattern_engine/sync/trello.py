from models.task import Task

def sync(cards, workspace_id):
    records = []
    for card in cards:
        records.append(Task(
            title=card.get("name", "Untitled")[:255],
            description=card.get("desc", ""),
            status=_map_status(card.get("dueComplete", False)),
            workspace_id=workspace_id,
        ))
    return records

def _map_status(complete):
    return "Done" if complete else "Not Started"
