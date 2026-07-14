from models.goal import Goal
from pattern_engine.extraction import check_goal_alignment


def sync(transactions, workspace_id):
    total = sum(
        abs(float(t.get("amount", 0))) for t in transactions
        if t.get("status") == "completed"
    )
    goals = Goal.query.filter_by(workspace_id=workspace_id, status="in_progress").all()
    existing_titles = [g.title for g in goals]
    updated = []
    for g in goals:
        try:
            result = check_goal_alignment("payment", g.title, existing_titles)
            if result and result.get("aligned_goal") and result.get("alignment_confidence", 0) > 0.6:
                g.description = (g.description or "") + f"\nRevenue synced: ${total:.2f}"
                updated.append(g)
        except Exception:
            pass
    return updated
