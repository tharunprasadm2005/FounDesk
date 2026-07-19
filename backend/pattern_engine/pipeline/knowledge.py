from datetime import datetime, timedelta
from config.database import db
from models.knowledge_item import KnowledgeItem
from models.decision_log import DecisionLog


def _detect_knowledge_staleness(workspace_id, stale_days=60):
    """Flag KnowledgeItems untouched for stale_days as needing review."""
    from models.knowledge_item import KnowledgeItem
    cutoff = datetime.utcnow() - timedelta(days=stale_days)
    items = KnowledgeItem.query.filter(
        KnowledgeItem.workspace_id == workspace_id,
        KnowledgeItem.status.in_(["auto_inferred", "verified"]),
    ).all()
    flagged = 0
    for item in items:
        latest = item.reviewed_at or item.created_at
        if latest < cutoff:
            item.review_flag = "needs_review"
            flagged += 1
            print(f"[KNOWLEDGE] Stale: '{item.title[:40]}' \u2014 unverified since {latest.date()}")
        elif item.review_flag == "needs_review" and latest >= cutoff:
            item.review_flag = None
    if flagged:
        db.session.commit()
        print(f"[KNOWLEDGE] Flagged {flagged} knowledge items as needs_review (ws={workspace_id})")


def _link_knowledge_to_decisions(workspace_id):
    """Auto-link knowledge items to decisions that reference similar content."""
    from models.knowledge_item import KnowledgeItem
    from models.decision_log import DecisionLog
    from pattern_engine.dedup import _tokenize, _cosine_similarity
    items = KnowledgeItem.query.filter_by(
        workspace_id=workspace_id,
        linked_decision_id=None,
    ).limit(20).all()
    if not items:
        return
    recent_decisions = DecisionLog.query.filter(
        DecisionLog.workspace_id == workspace_id,
        DecisionLog.created_at >= (datetime.utcnow() - timedelta(days=30)),
    ).all()
    linked = 0
    for item in items:
        item_tokens = _tokenize(f"{item.title} {item.summary or ''}")
        if not item_tokens:
            continue
        best_dec = None
        best_score = 0.0
        for d in recent_decisions:
            dec_tokens = _tokenize(d.decision)
            if not dec_tokens:
                continue
            score = _cosine_similarity(item_tokens, dec_tokens)
            if score > best_score:
                best_score = score
                best_dec = d
        if best_score >= 0.45 and best_dec:
            item.linked_decision_id = best_dec.id
            linked += 1
            print(f"[KNOWLEDGE] Linked '{item.title[:40]}' to decision #{best_dec.id} (score={best_score:.2f})")
    if linked:
        db.session.commit()
        print(f"[KNOWLEDGE] Linked {linked} items to decisions (ws={workspace_id})")
