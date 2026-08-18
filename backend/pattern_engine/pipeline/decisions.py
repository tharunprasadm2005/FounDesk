from datetime import datetime, timedelta
from config.database import db
from models.decision_log import DecisionLog
from models.workspace import Workspace
from models.chronicle_event import ChronicleEvent


def _detect_decision_reversal(workspace_id):
    """Qwen-based detection: does a new decision contradict/reverse a prior logged decision?
    Only decisions created in the last 24h are treated as the 'new' side, so every pair is
    LLM-checked at most once (when it's fresh) instead of re-polled every 15-min cycle."""
    from models.decision_log import DecisionLog
    now = datetime.utcnow()
    fresh = now - timedelta(hours=24)
    unlinked = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        DecisionLog.superseded_by_id.is_(None),
        DecisionLog.status.in_(["Proposed", "Confirmed", "Implemented"]),
        DecisionLog.ai_status != "dismissed",
    ).order_by(DecisionLog.created_at.desc()).limit(6).all()
    if len(unlinked) < 2:
        return
    # Only the SINGLE newest decision is the "new" side. A decision only ever
    # needs a contradiction check in the cycle where it is newest; afterwards a
    # newer decision (or none) takes that slot, so nothing is re-polled and the
    # LLM bill per cycle is capped at (N-1) calls instead of C(N,2) × cycles.
    later = unlinked[0]
    if later.status == "Reversed":
        return
    if not later.created_at or later.created_at < fresh:
        return
    reversed_count = 0
    checks = 0
    for earlier in unlinked[1:]:
        if earlier.status == "Reversed":
            continue
        time_gap = (later.created_at - earlier.created_at).days
        if time_gap > 30 or time_gap < 0:
            continue
        if checks >= 8:
            continue
        checks += 1
        try:
            from pattern_engine.extraction import detect_contradiction
            result = detect_contradiction(earlier.decision, later.decision)
            if result and result.get("is_contradiction") and result.get("confidence", 0) >= 0.6:
                later.superseded_by_id = earlier.id
                later.status = "Reversed"
                earlier.status = "Superseded"
                reversed_count += 1
                print(f"[DECISION] Reversal: '{later.decision[:40]}' supersedes '{earlier.decision[:40]}' (confidence={result.get('confidence', 0):.2f})")
                from models.chronicle_event import ChronicleEvent
                try:
                    ws = Workspace.query.get(workspace_id)
                    ce = ChronicleEvent(
                        workspace_id=workspace_id,
                        event_type="decision_reversed",
                        title=f"Decision Reversed: {later.decision[:80]}",
                        description=f"'{later.decision[:100]}' reverses/supersedes '{earlier.decision[:100]}'",
                        stage=ws.stage if ws else "Think",
                        source_type="decision",
                        source_id=earlier.id,
                        meta_data={"superseding_id": later.id, "superseded_id": earlier.id},
                    )
                    db.session.add(ce)
                except Exception:
                    pass
                break
        except Exception:
            continue
    if reversed_count:
        db.session.commit()
        print(f"[DECISION] Detected {reversed_count} reversal(s) (ws={workspace_id})")
