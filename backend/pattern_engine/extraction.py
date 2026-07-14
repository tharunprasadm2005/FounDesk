import json
from config.database import db
from pattern_engine.llm_client import call_llm
from pattern_engine.models import PatternCorrection

# ── Schemas (match Qwen Modelfile output exactly) ──────────────────────────

DECISION_SCHEMA = {
    "title": "decision_extraction",
    "type": "object",
    "properties": {
        "has_decision": {"type": "boolean"},
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "confidence": {"type": "number"},
        "decision_type": {
            "type": "string",
            "enum": ["product", "hiring", "sales", "financial", "technical", "strategic", "none"],
        },
    },
    "required": ["has_decision", "title", "summary", "confidence", "decision_type"],
}

TASK_SCHEMA = {
    "title": "task_extraction",
    "type": "object",
    "properties": {
        "has_task": {"type": "boolean"},
        "title": {"type": "string"},
        "description": {"type": "string"},
        "priority": {"type": "string"},
        "source": {"type": "string"},
    },
    "required": ["has_task", "title", "description", "priority", "source"],
}

MEETING_SCHEMA = {
    "title": "meeting_intelligence",
    "type": "object",
    "properties": {
        "is_meeting": {"type": "boolean"},
        "title": {"type": "string"},
        "meeting_type": {
            "type": "string",
            "enum": ["Sprint Planning", "Standup", "Investor Sync", "Client Call",
                     "Retro", "1:1", "All Hands", "Brainstorm", "Review", "Other"],
        },
        "summary": {"type": "string"},
        "key_topics": {"type": "array", "items": {"type": "string"}},
        "decisions_made": {"type": "array", "items": {"type": "string"}},
        "action_items": {"type": "array", "items": {"type": "string"}},
        "attendees": {"type": "array", "items": {"type": "string"}},
        "follow_up_needed": {"type": "boolean"},
        "follow_up_note": {"type": "string"},
    },
    "required": [
        "is_meeting", "title", "meeting_type", "summary", "key_topics",
        "decisions_made", "action_items", "attendees",
        "follow_up_needed", "follow_up_note",
    ],
}

CALENDLY_SCHEMA = {
    "title": "calendly_intelligence",
    "type": "object",
    "properties": {
        "meeting_type": {"type": "string"},
        "signal": {"type": "string"},
    },
    "required": ["meeting_type", "signal"],
}

CRM_SCHEMA = {
    "title": "crm_signal_extraction",
    "type": "object",
    "properties": {
        "has_signal": {"type": "boolean"},
        "signal_type": {"type": "string"},
        "deal_name": {"type": "string"},
        "recommended_action": {"type": "string"},
        "urgency": {"type": "string"},
    },
    "required": ["has_signal", "signal_type", "deal_name", "recommended_action", "urgency"],
}

GOAL_SCHEMA = {
    "title": "goal_alignment",
    "type": "object",
    "properties": {
        "aligned_goal": {"type": "string"},
        "alignment_confidence": {"type": "number"},
        "reasoning": {"type": "string"},
    },
    "required": ["aligned_goal", "alignment_confidence", "reasoning"],
}

STANDUP_SCHEMA = {
    "title": "standup_summary",
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "mood": {"type": "string"},
    },
    "required": ["summary", "mood"],
}

FOLLOWUP_SCHEMA = {
    "title": "follow_up_classification",
    "type": "object",
    "properties": {
        "is_follow_up": {"type": "boolean"},
        "person_name": {"type": "string"},
        "context": {"type": "string"},
        "action_needed": {"type": "string"},
        "suggested_followup_date": {"type": "string"},
        "source_reference": {"type": "string"},
    },
    "required": ["is_follow_up", "person_name", "context", "action_needed"],
}

KNOWLEDGE_SCHEMA = {
    "title": "knowledge_classification",
    "type": "object",
    "properties": {
        "is_knowledge": {"type": "boolean"},
        "knowledge_type": {
            "type": "string",
            "enum": ["lesson_learned", "architecture", "playbook", "insight",
                     "best_practice", "documentation", "retrospective", "tip", "none"],
        },
        "title": {"type": "string"},
        "summary": {"type": "string"},
        "key_points": {"type": "array", "items": {"type": "string"}},
        "applicable_to": {"type": "string"},
        "confidence": {"type": "number"},
    },
    "required": ["is_knowledge", "knowledge_type", "title", "summary", "key_points", "applicable_to", "confidence"],
}

# Legacy batch schema (for Groq/OpenRouter fallback)
BATCH_EXTRACTION_SCHEMA = {
    "title": "batch_pattern_extraction",
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "title": "pattern_extraction",
                "type": "object",
                "properties": {
                    "record_type": {
                        "type": "string",
                        "enum": ["task", "decision", "goal", "blocker", "meeting_note", "follow_up", "knowledge_item", "none"],
                    },
                    "fields": {"type": "object"},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    "source_signal": {"type": "string", "enum": ["explicit", "inferred", "weak_signal"]},
                    "reasoning": {"type": "string"},
                },
                "required": ["record_type", "fields", "confidence", "source_signal", "reasoning"],
            },
        }
    },
    "required": ["results"],
}

# ── System prompt used for non-Qwen providers ──────────────────────────

QWEN_JOB_SYSTEM_PROMPT = """\
You are FounDesk's cognitive pattern engine — a structured extraction model for a Founder Operating System. You are NOT a general assistant.

Your inputs are raw text events from 14 integrations: Gmail, Slack, Google Calendar, Calendly, Google Meet, Trello, Asana, Linear, Monday.com, Notion, GitHub, HubSpot, Pipedrive, Google Docs.

Your outputs are always raw json. No markdown. No preamble.

JOB 1 — Decision Extraction. Feeds: Memory Vault → Decision Log. Input includes "job": "extract_decision". Output schema: {"has_decision": true/false, "title": "max 8 words", "summary": "1-2 sentences", "confidence": 0.0-1.0, "decision_type": "product"|"hiring"|"sales"|"financial"|"technical"|"strategic"|"none"}
JOB 2 — Task Extraction. Feeds: Execute → Tasks (inferred from unstructured text). Input includes "job": "extract_task". Output schema: {"has_task": true/false, "title": "max 10 words", "description": "one sentence", "priority": "high"|"medium"|"low", "source": "github"|"trello"|"asana"|"linear"|"monday"|"slack"|"email"|"meet"|"notion"|"hubspot"|"pipedrive"}
JOB 3 — Meeting Intelligence. Feeds: Memory Vault → Meeting Notes. Input "job": "extract_meeting". Output schema: {"is_meeting": true/false, "title": "clean title max 6 words", "meeting_type": "Sprint Planning|Standup|Investor Sync|Client Call|Retro|1:1|All Hands|Brainstorm|Review|Other", "summary": "2-3 sentence summary", "key_topics": ["topic1","topic2"], "decisions_made": ["decision1"], "action_items": ["action1"], "attendees": ["name1"], "follow_up_needed": bool, "follow_up_note": "one sentence or empty"}. NEVER set is_meeting: true for tasks, deal updates, notifications, booking URLs, or content with no agenda/topics.
JOB 4 — CRM Signal. Feeds: Pipeline health (not a UI module — used for context in Follow-ups). Input "job": "extract_crm_signal". Output: {"has_signal": bool, "signal_type": "deal_progressed"|"deal_stalled"|"follow_up_overdue"|"new_lead"|"meeting_booked"|"contract_sent"|"deal_lost", "deal_name": "...", "recommended_action": "...", "urgency": "high"|"medium"|"low"}
JOB 5 — Goal Alignment. Feeds: Plan → Goals. Input "job": "align_goal", includes existing_goals list. Output: {"aligned_goal": "exact goal name or null", "alignment_confidence": 0.0-1.0, "reasoning": "one sentence"}
JOB 6 — Standup Summary. Feeds: Execute → Daily Standups. Input "job": "generate_standup". Output: {"summary": "one paragraph summarising yesterday, today, blockers", "mood": "positive"|"neutral"|"stressed"}
JOB 7 — Knowledge Classification. Feeds: Memory Vault → Knowledge Transfer. Input "job": "classify_knowledge". Output schema: {"is_knowledge": true/false, "knowledge_type": "lesson_learned"|"architecture"|"playbook"|"insight"|"best_practice"|"documentation"|"retrospective"|"tip"|"none", "title": "descriptive title max 8 words", "summary": "2-3 sentences explaining what the knowledge is and why it matters", "key_points": ["most important point 1", "point 2", "point 3"], "applicable_to": "brief description of who benefits", "confidence": 0.0-1.0}. Return is_knowledge: false for marketing, task updates, booking confirmations, student tutorials, deal updates, automated reports, social media, messages shorter than 2 sentences. Return is_knowledge: true for lessons learned, architecture decisions, playbooks, insights, best practices, documentation, retrospectives, tips found in the content.
JOB 8 — Follow-up Detection. Feeds: Plan → Follow-ups panel. Input "job": "classify_follow_up". Output schema: {"is_follow_up": true/false, "person_name": "who needs the follow-up or empty", "context": "what was discussed (one sentence)", "action_needed": "what response or action is pending (one sentence)", "suggested_followup_date": "YYYY-MM-DD if inferrable, else empty", "source_reference": "event identifier or empty"}. Return is_follow_up: true for Gmail threads with no reply needing a response, Slack unresolved @mentions, CRM stalled deals where a check-in is due, or any message where someone is waiting on an answer from the founder. Return is_follow_up: false for automated notifications, newsletters, marketing emails, completed conversations, informational updates with no pending action.
JOB 9 — Blocker Detection. Feeds: Execute → Blocker Panel. Input "job": "detect_blocker". Output schema: {"is_blocker": true/false, "title": "short blocker title max 10 words", "description": "what is blocked and why (one sentence)", "severity": "high"|"medium"|"low", "blocked_item": "what specific task/goal is being blocked or empty"}. Detect blocker language by meaning, not just keywords — recognize statements like "waiting on X", "can't proceed until Y", "stuck on Z", "need answer from Alice before continuing", "this is blocked by the API team", even when phrased differently. Return is_blocker: true for any message where progress is impeded by an external dependency, missing information, or unresolved issue. Return is_blocker: false for routine status updates, completed items, questions that don't block progress, informational messages.
JOB 10 — New Goal Suggestion. Feeds: Plan → Goals (cold start, no existing goals). Input "job": "suggest_goal", includes item_type and item_title of a recent decision or task. Output schema: {"suggested_goal": "short goal title max 8 words", "goal_type": "daily"|"weekly"|"monthly"|"quarterly", "confidence": 0.0-1.0, "reasoning": "one sentence"}. The suggested goal should be a concrete, actionable goal derived from the signal. Examples: signal="Offer Volume Discount?" -> suggested_goal="Finalize volume discount tiers", signal="Fix database connection pool exhaustion" -> suggested_goal="Resolve database performance issues".

HARD REJECT — never return has_decision: true for:
- Automated digest emails from asana.com, monday.com, hubspot.com, adobe.com, mailchimp.com, notion.so
- Subject lines containing: "tasks due", "daily update", "weekly digest", "unsubscribe", "marketing",
  "your trial", "tips for", "you're invited to try", "get started with"
- Slack messages where the sender is a bot, or content is only test/ping/greeting phrases
- Linear, Trello, Asana, GitHub items — these are TASKS, not decisions. Never classify them as decisions.
- Pipedrive/HubSpot deals with $0 value, no stage progression, or that only describe deal creation
  without any human judgment, negotiation, or strategic change.
- Any message that is purely a bullet-list summary of automated updates with no human decision content.
- Meeting invites or calendar events whose description is only an agenda with no stated outcome,
  decision, or commitment.

Rules:
1. Always return raw json starting with "{".
2. Filter aggressively. When in doubt, has_decision: false / has_task: false.
3. For JOB 5 (align_goal), never invent goal names — use only from the provided list. For JOB 10 (suggest_goal), create a new goal name from the signal.
4. One input = one json output. Return only the single most significant item.
5. Treat founder attention as the scarcest resource.
6. Promotional/marketing emails, newsletters, product announcements, automated task digests,
   integration test messages, and Slack test pings must return has_decision: false.
"""

# ── Job messages builder ────────────────────────────────────────────────

def _is_custom_qwen_model():
    import os
    return "foundedesk" in os.environ.get("LLM_MODEL_PRIMARY", "").lower()


def _job_messages(job_input):
    if _is_custom_qwen_model():
        return [{"role": "user", "content": json.dumps(job_input)}]
    return [
        {"role": "system", "content": QWEN_JOB_SYSTEM_PROMPT},
        {"role": "user", "content": json.dumps(job_input)},
    ]


def extract_decision_from_event(event_text, source):
    job_input = {
        "job": "extract_decision",
        "source": source,
        "content": event_text,
    }
    return call_llm(_job_messages(job_input), DECISION_SCHEMA)


# ── Job 2: Task Extraction ─────────────────────────────────────────────

def extract_task_from_event(event_text, source):
    job_input = {
        "job": "extract_task",
        "source": source,
        "content": event_text,
    }
    return call_llm(_job_messages(job_input), TASK_SCHEMA)


# ── Job 3: Meeting Intelligence ────────────────────────────────────────

def extract_meeting_from_event(event_text, source, meeting_type="meet"):
    job_input = {
        "job": "extract_meeting",
        "source": source,
        "meeting_type": meeting_type,
        "content": event_text,
    }
    return call_llm(_job_messages(job_input), MEETING_SCHEMA)


# ── Job 4: CRM Signal Extraction ───────────────────────────────────────

def extract_crm_signal_from_event(event_text, source):
    job_input = {
        "job": "extract_crm_signal",
        "source": source,
        "content": event_text,
    }
    return call_llm(_job_messages(job_input), CRM_SCHEMA)


# ── Job 5: Goal Alignment Check ────────────────────────────────────────

def check_goal_alignment(item_type, item_title, existing_goals):
    job_input = {
        "job": "align_goal",
        "item_type": item_type,
        "item_title": item_title,
        "existing_goals": existing_goals,
    }
    return call_llm(_job_messages(job_input), GOAL_SCHEMA)


NEW_GOAL_SCHEMA = {
    "title": "new_goal_suggestion",
    "type": "object",
    "properties": {
        "suggested_goal": {"type": "string"},
        "goal_type": {"type": "string", "enum": ["daily", "weekly", "monthly", "quarterly"]},
        "confidence": {"type": "number"},
        "reasoning": {"type": "string"},
    },
    "required": ["suggested_goal", "goal_type", "confidence", "reasoning"],
}


def suggest_goal_from_signal(item_type, item_title):
    """Generate a new goal from a signal when no existing goals exist."""
    job_input = {
        "job": "suggest_goal",
        "item_type": item_type,
        "item_title": item_title,
    }
    return call_llm(_job_messages(job_input), NEW_GOAL_SCHEMA)


# ── Job 6: Standup Summary Generation ──────────────────────────────────

def generate_standup_summary(completed, blockers, goals_today, sources_active_today):
    job_input = {
        "job": "generate_standup",
        "completed": completed,
        "blockers": blockers,
        "goals_today": goals_today,
        "sources_active_today": sources_active_today,
    }
    return call_llm(_job_messages(job_input), STANDUP_SCHEMA, temperature=0.3)


STANDUP_REWRITE_SCHEMA = {
    "title": "standup_rewrite",
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
    },
    "required": ["summary"],
}


def rewrite_standup_narrative(compiled):
    """LLM rewrites already-compiled data into readable narrative.
    The LLM is strictly forbidden from adding facts not present in the input.
    """
    # Build a fact-only input string from compiled data
    sections = []
    for section_name in ("yesterday", "today", "risks", "business"):
        section = compiled.get(section_name, {})
        if not section:
            continue
        parts = [f"== {section_name.upper()} =="]
        for key, items in section.items():
            if not items:
                continue
            label = key.replace("_", " ").title()
            parts.append(f"{label}:")
            for item in items:
                title = item.get("title", item.get("name", ""))
                parts.append(f"  - {title}")
        sections.append("\n".join(parts))

    facts = "\n\n".join(sections)

    system_prompt = (
        "You are a rewrite engine. You will receive structured standup data below.\n"
        "Rewrite it into a short, readable narrative for a solo founder.\n"
        "Use 'You' not 'John'.\n"
        "NEVER add facts, tasks, blockers, meetings, or decisions that are not in the input.\n"
        "NEVER invent specific details.\n"
        "Output only JSON with one field: 'summary' containing 2-4 sentences.\n"
        f"\nDATA:\n{facts}"
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "Rewrite the above into a concise standup narrative."},
    ]

    result = call_llm(messages, STANDUP_REWRITE_SCHEMA, temperature=0.2)
    return result.get("summary", "") if result else ""


# ── Job 8: Follow-up Detection ─────────────────────────────────────────
# Feeds: Plan module → Follow-ups panel.

def extract_follow_up_from_event(event_text, source):
    job_input = {
        "job": "classify_follow_up",
        "source": source,
        "content": event_text,
    }
    return call_llm(_job_messages(job_input), FOLLOWUP_SCHEMA, temperature=0.3)


# ── Job 9: Blocker Detection ────────────────────────────────────────────
# Feeds: Execute module → Blocker Panel.

BLOCKER_SCHEMA = {
    "title": "blocker_detection",
    "type": "object",
    "properties": {
        "is_blocker": {"type": "boolean"},
        "title": {"type": "string"},
        "description": {"type": "string"},
        "severity": {
            "type": "string",
            "enum": ["high", "medium", "low"],
        },
        "blocked_item": {"type": "string"},
    },
    "required": ["is_blocker", "title", "description", "severity"],
}


def extract_blocker_from_event(event_text, source):
    job_input = {
        "job": "detect_blocker",
        "source": source,
        "content": event_text,
    }
    return call_llm(_job_messages(job_input), BLOCKER_SCHEMA, temperature=0.3)


# ── Job 7: Knowledge Classification ─────────────────────────────────────

def classify_knowledge_from_event(event_text, source):
    job_input = {
        "job": "classify_knowledge",
        "source": source,
        "content": event_text,
    }
    return call_llm(_job_messages(job_input), KNOWLEDGE_SCHEMA)


# ── Legacy batch extraction (for backward compatibility) ────────────────

def _build_few_shot_context(integration, record_type, limit=10):
    if record_type and record_type != "any":
        query = PatternCorrection.query.filter_by(record_type=record_type)
    else:
        query = PatternCorrection.query
    corrections = (
        query
        .order_by(PatternCorrection.created_at.desc())
        .limit(limit)
        .all()
    )
    if not corrections:
        return ""
    lines = []
    for c in corrections:
        lines.append(
            f"- Previous {record_type}: extracted={c.ai_extracted_fields}, "
            f"action={c.founder_action}, "
            f"corrected={c.corrected_fields or 'none'}"
        )
    return "\n".join(lines)


def extract_batch(raw_events):
    if not raw_events:
        return []

    integration = raw_events[0].source if raw_events else "unknown"
    few_shot = _build_few_shot_context(integration, "any")
    batch = raw_events[:20]

    events_text = "\n".join(
        f"[{i + 1}] Source={e.source}, Type={e.event_type}, "
        f"Payload={e.raw_payload}"
        for i, e in enumerate(batch)
    )

    system_prompt = (
        "You are FounDesk's pattern extraction engine. Analyze each event and classify it into "
        "one of: task, decision, goal, blocker, meeting_note, follow_up, or none.\n\n"
        "Classification rules:\n"
        "- **task**: A concrete action item with a doer and expected completion (e.g., 'fix bug', 'review PR', 'write docs').\n"
        "- **decision**: A choice made between alternatives with rationale.\n"
        "- **goal**: A desired outcome with a measurable target and timeframe.\n"
        "- **blocker**: Something actively preventing progress.\n"
        "- **meeting_note**: A scheduled discussion, sync, standup, 1:1, call, review, planning session.\n"
        "- **knowledge_item**: A lesson learned, insight, documentation, playbook, best practice.\n"
        "- **follow_up**: A need to check back with someone or follow up on a previous conversation.\n"
        "- **none**: Routine notifications, security alerts, login notices, marketing emails, and informational messages with no actionable content.\n\n"
        "Return a JSON object with a 'results' array in the same order as the input events. "
        "Each result must include: record_type, fields (object), confidence (0-1), source_signal, and reasoning."
    )
    if few_shot:
        system_prompt += f"\n\nPrevious correction history:\n{few_shot}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Analyze these events:\n{events_text}"},
    ]

    result = call_llm(messages, BATCH_EXTRACTION_SCHEMA)
    return result.get("results", [])


def extract_from_event(event):
    results = extract_batch([event])
    return results[0] if results else None


# ── Job 11: Decision Contradiction Detection ─────────────────────────────

CONTRADICTION_SCHEMA = {
    "title": "decision_contradiction",
    "type": "object",
    "properties": {
        "is_contradiction": {"type": "boolean"},
        "confidence": {"type": "number"},
        "reasoning": {"type": "string"},
    },
    "required": ["is_contradiction", "confidence", "reasoning"],
}


def detect_contradiction(earlier_decision, later_decision):
    """Qwen-based semantic check: does a new decision contradict or reverse an earlier one?"""
    job_input = {
        "job": "detect_contradiction",
        "earlier_decision": earlier_decision,
        "later_decision": later_decision,
        "instruction": (
            "Determine whether the LATER decision contradicts, reverses, or supersedes "
            "the EARLIER decision. A contradiction means the later decision explicitly or "
            "implicitly changes course from the earlier one — e.g. choosing the opposite "
            "option, reversing a prior commitment, or adopting an alternative that was "
            "previously rejected. Return is_contradiction: true only if there is a genuine "
            "semantic conflict, not just different topics. Return confidence 0.0-1.0."
        ),
    }
    return call_llm(_job_messages(job_input), CONTRADICTION_SCHEMA, temperature=0.2)
