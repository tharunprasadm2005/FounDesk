from datetime import datetime, timedelta
from config.database import db
from models.blocker import Blocker
from models.chronicle_event import ChronicleEvent
from models.workspace import Workspace

from .utils import _create_chronicle


def _create_chronicle_for_blocker_resolve(workspace_id):
    """Create ChronicleEvent entries when blockers are resolved."""
    from models.blocker import Blocker
    from models.chronicle_event import ChronicleEvent
    now = datetime.utcnow()
    cutoff = now - timedelta(hours=1)
    resolved = Blocker.query.filter(
        Blocker.workspace_id == workspace_id,
        Blocker.status == "resolved",
        Blocker.resolved_at >= cutoff,
    ).all()
    ws_obj = Workspace.query.get(workspace_id)
    created = 0
    for b in resolved:
        existing = ChronicleEvent.query.filter_by(
            workspace_id=workspace_id,
            event_type="blocker_resolved",
            source_id=b.id,
        ).first()
        if existing:
            continue
        ce = ChronicleEvent(
            workspace_id=workspace_id,
            event_type="blocker_resolved",
            title=f"Blocker Resolved: {b.title[:80]}",
            description=f"Blocker '{b.title[:100]}' resolved (severity={b.severity})",
            stage=ws_obj.stage if ws_obj else "Think",
            source_type="blocker",
            source_id=b.id,
            meta_data={"severity": b.severity, "task_id": b.task_id},
        )
        db.session.add(ce)
        created += 1
    if created:
        db.session.commit()
        print(f"[CHRONICLE] Created {created} blocker-resolved events (ws={workspace_id})")
