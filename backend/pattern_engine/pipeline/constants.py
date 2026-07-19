from models.task import Task
from models.goal import Goal
from models.decision_log import DecisionLog
from models.blocker import Blocker
from models.meeting_notes import MeetingNotes
from models.follow_up import FollowUp
from models.knowledge_item import KnowledgeItem

AI_SOURCES = {"gmail", "slack", "notion", "google_docs"}
DETERMINISTIC_SOURCES = {
    "trello", "asana", "monday", "linear", "github",
    "calendly", "google_calendar", "google_meet",
    "stripe", "razorpay", "payu",
    "posthog", "mixpanel", "amplitude",
}

PROVIDER_MAP = {
    "google": ["gmail", "google_calendar", "google_meet", "google_docs"],
    "gmail": ["gmail"],
    "slack": ["slack"],
    "notion": ["notion"],
    "google_docs": ["google_docs"],
    "trello": ["trello"],
    "asana": ["asana"],
    "monday": ["monday"],
    "linear": ["linear"],
    "github": ["github"],
    "calendly": ["calendly"],
    "google_calendar": ["google_calendar"],
    "google_meet": ["google_meet"],
    "posthog": ["posthog"],
    "mixpanel": ["mixpanel"],
    "amplitude": ["amplitude"],
    "hubspot": ["hubspot"],
    "pipedrive": ["pipedrive"],
    "zoho_crm": ["zoho"],
}

RECORD_MODELS = {
    "task": Task,
    "decision": DecisionLog,
    "goal": Goal,
    "blocker": Blocker,
    "meeting_note": MeetingNotes,
    "follow_up": FollowUp,
    "knowledge_item": KnowledgeItem,
}

MAX_DEADLOCK_RETRIES = 3
