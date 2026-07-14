from datetime import datetime
from config.database import db

def is_duplicate_exact(session, model_class, workspace_id, source_event_id):
    if source_event_id is None:
        return False
    return session.query(model_class).filter_by(
        workspace_id=workspace_id,
        source_event_id=str(source_event_id)
    ).first() is not None

def is_duplicate_similar(session, model_class, workspace_id, title, threshold=0.85):
    existing = session.query(model_class).filter(
        model_class.workspace_id == workspace_id,
    ).all()

    query_tokens = _tokenize(title)
    if not query_tokens:
        return False, None, 0.0

    for record in existing:
        record_tokens = _tokenize(getattr(record, "title", getattr(record, "decision", "")))
        if not record_tokens:
            continue
        similarity = _cosine_similarity(query_tokens, record_tokens)
        if similarity >= threshold:
            return True, record.id, similarity

    return False, None, 0.0

def is_previously_dismissed(session, model_class, workspace_id, source_event_id):
    if source_event_id is None:
        return False
    return session.query(model_class).filter_by(
        workspace_id=workspace_id,
        source_event_id=str(source_event_id),
        ai_status="dismissed"
    ).first() is not None

def _tokenize(text):
    import re
    if not text:
        return []
    tokens = re.findall(r'\w+', text.lower())
    stopwords = {"the", "a", "an", "is", "of", "to", "for", "in", "and", "or", "on", "at",
                 "this", "that", "with", "by", "i", "we", "you", "he", "she", "they", "it",
                 "be", "was", "are", "been", "have", "has", "had", "do", "does", "did"}
    return [t for t in tokens if t not in stopwords]

def _cosine_similarity(tokens_a, tokens_b):
    all_tokens = list(set(tokens_a + tokens_b))
    vec_a = [tokens_a.count(t) for t in all_tokens]
    vec_b = [tokens_b.count(t) for t in all_tokens]
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sum(a * a for a in vec_a) ** 0.5
    norm_b = sum(b * b for b in vec_b) ** 0.5
    if norm_a * norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
