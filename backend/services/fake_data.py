"""Fake sample data generator for mock-token integrations (sandbox/demo mode).

Only invoked for integrations whose access token starts with ``mock_``, which
only exist in isolated test accounts. Every event is flagged ``is_mock=True`` so
display layers can always hide it unless the owner workspace is a mock sandbox.
"""
from datetime import datetime, timedelta


def _at(hour, minute=0, day_offset=0):
    base = datetime.utcnow() + timedelta(days=day_offset)
    return base.replace(hour=hour, minute=minute, second=0, microsecond=0)


def _ago(hours=0, days=0):
    return datetime.utcnow() - timedelta(hours=hours, days=days)


def _feed_items(provider):
    rows = {
        "gmail": [
            {
                "actor": "sarah@northstarventures.example",
                "title": "Seed round — intro call next week",
                "status": "unread",
                "at": _ago(days=1, hours=2),
                "details": "Hi — loved the demo. Could you walk us through roadmap in a 30-min call next week?",
            },
            {
                "actor": "harsh@clientco.example",
                "title": "Custom integration — API scope clarification",
                "status": "unread",
                "at": _ago(days=2),
                "details": "Can the activity compiler surface CRM updates too? Need to align scope before the build sprint.",
            },
            {
                "actor": "dev@nucleo.example",
                "title": "Blocker on payments module",
                "status": "read",
                "at": _ago(hours=5),
                "details": "Refund webhook keeps 500ing on empty payloads — reviewing the guard now.",
            },
            {
                "actor": "liam@partners.example",
                "title": "Partnership MOU draft attached",
                "status": "unread",
                "at": _ago(hours=6),
                "details": "Shared the draft. Feedback by EOD Friday if possible.",
            },
            {
                "actor": "founders@accelerator.example",
                "title": "Demo day logistics confirmed",
                "status": "read",
                "at": _ago(days=3),
                "details": "You are slotted for a 5-minute stage demo. Recording link attached.",
            },
            {
                "actor": "priya@board.example",
                "title": "Decision: move to usage-based pricing",
                "status": "read",
                "at": _ago(hours=3),
                "details": "We've decided to switch from flat subscriptions to usage-based pricing starting next quarter. Product and finance have aligned on the tier structure.",
            },
            {
                "actor": "akshay@recruiting.example",
                "title": "Approved: hire two backend engineers",
                "status": "read",
                "at": _ago(days=1),
                "details": "Approved two backend engineer roles this quarter to support the integrations workload. Job postings go live Monday.",
            },
            {
                "actor": "ceo@accelerator.example",
                "title": "Board decision: pause mobile app this year",
                "status": "unread",
                "at": _ago(days=2),
                "details": "We're pausing the mobile app build to focus engineering on enterprise SSO and Teams integration. Revisit in Q1.",
            },
        ],
        "google_calendar": [
            {"actor": "Northstar Ventures", "title": "Investor pitch — Northstar Ventures", "at": _at(9, 30), "meet_link": "https://meet.google.com/northstar-demo-abc", "details": "Investor pitch demo", "priority": "high", "activity_type": "meeting", "status": "confirmed"},
            {"actor": "Arjun Mehta", "title": "Product design review with Arjun", "at": _at(11, 0), "meet_link": "https://meet.google.com/prod-design-xyz", "details": "Design review — onboarding revamp", "priority": "medium", "activity_type": "meeting", "status": "confirmed"},
            {"actor": "Engineering", "title": "Engineering standup", "at": _at(14, 0), "meet_link": None, "details": "Daily standup", "priority": "low", "activity_type": "meeting", "status": "confirmed"},
            {"actor": "Accelerator", "title": "Demo Day prep walkthrough", "at": _at(16, 30), "meet_link": None, "details": "Rehearse the demo flow", "priority": "high", "activity_type": "meeting", "status": "confirmed"},
            {"actor": "ClientCo", "title": "Client onboarding call — ClientCo", "at": _at(10, 0, day_offset=1), "meet_link": None, "details": "Onboarding walkthrough", "priority": "high", "activity_type": "event", "status": "confirmed"},
        ],
        "github": [
            {"repo": "nucleo-pay/payments-service", "title": "Fix CORS preflight on /api/track", "activity_type": "pull_request", "url": "https://github.com/nucleo-pay/payments-service/pull/42", "details": "Adds allow-list origin handling before the auth middleware.", "status": "open", "at": _ago(hours=8)},
            {"repo": "nucleo-pay/payments-service", "title": "Add retry on Slack message delivery", "activity_type": "pull_request", "url": "https://github.com/nucleo-pay/payments-service/pull/41", "details": "Backoff + retry for transient channel failures.", "status": "open", "at": _ago(days=1)},
            {"repo": "nucleo-pay/webapp", "title": "Flaky E2E tests for onboarding flow", "activity_type": "issue", "url": "https://github.com/nucleo-pay/webapp/issues/188", "details": "Timing flakiness on the wizard step transitions.", "status": "open", "at": _ago(days=2)},
            {"repo": "nucleo-pay/core-api", "title": "Upgrade billing webhook signature verification", "activity_type": "pull_request", "url": "https://github.com/nucleo-pay/core-api/pull/73", "details": "Moves to v2 signature scheme.", "status": "merged", "at": _ago(days=3)},
            {"repo": "nucleo-pay/core-api", "title": "Optimize activity compiler queries", "activity_type": "issue", "url": "https://github.com/nucleo-pay/core-api/issues/77", "details": "Cut N+1 query patterns in the feed compiler.", "status": "open", "at": _ago(days=4)},
        ],
        "slack": [
            {"actor": "Riya", "channel": "engineering", "title": "New message in #engineering", "details": "Deploy blocked on CORS fix — anyone free to review PR #42?", "status": "unread", "at": _ago(hours=3)},
            {"actor": "Kabir", "channel": "product", "title": "New message in #product", "details": "Shipped onboarding revamp to staging, QA pass tomorrow.", "status": "unread", "at": _ago(hours=5)},
            {"actor": "Neha", "channel": "design", "title": "New message in #design", "details": "New investor deck draft ready for review.", "status": "unread", "at": _ago(hours=9)},
            {"actor": "Aman", "channel": "general", "title": "New message in #general", "details": "Demo day team lunch Friday after the standup.", "status": "read", "at": _ago(days=1)},
            {"actor": "Riya", "channel": "engineering", "title": "New message in #engineering", "details": "We decided to move the release of the analytics dashboard to Q4 so the team can focus on the SSO and Teams integrations first.", "status": "unread", "at": _ago(hours=7)},
            {"actor": "Kabir", "channel": "product", "title": "New message in #product", "details": "Confirmed decision from product review: usage-based pricing ships in Q3 and the free tier caps at 500 events per month.", "status": "unread", "at": _ago(days=1)},
        ],
        "notion": [
            {"actor": "test@foundesk.dev", "title": "Investor Pitch Deck v4", "activity_type": "document", "details": "Updated unit economics and go-to-market slides.", "status": "published", "at": _ago(hours=4)},
            {"actor": "test@foundesk.dev", "title": "Product Requirements — Payments", "activity_type": "document", "details": "Refund flow, webhook retries, and idempotency notes.", "status": "published", "at": _ago(days=1)},
            {"actor": "test@foundesk.dev", "title": "Meeting notes: Board sync", "activity_type": "document", "details": "Q3 targets, headcount, runway.", "status": "published", "at": _ago(days=2)},
            {"actor": "test@foundesk.dev", "title": "Q3 Hiring Plan", "activity_type": "wiki", "details": "Hiring pipeline for engineering and design.", "status": "published", "at": _ago(days=5)},
            {"actor": "test@foundesk.dev", "title": "Roadmap Decision: build CRM integrations in-house", "activity_type": "document", "details": "We decided to build the CRM sync layer in-house instead of buying a vendor tool. Two engineers assigned, target date end of Q3.", "status": "published", "at": _ago(hours=6)},
            {"actor": "test@foundesk.dev", "title": "Pricing Decision Memo", "activity_type": "document", "details": "Final decision to adopt usage-based pricing. Tiers: Starter 500 events/mo free, Growth unlimited. Grandfathering for existing customers.", "status": "published", "at": _ago(hours=2)},
        ],
        "monday": [
            {"actor": "Arjun", "title": "Monday: Build onboarding wizard", "activity_type": "task", "status": "In Progress", "at": _ago(hours=6), "details": "Board: Product, Group: Sprint 12", "priority": "P1", "progress": 60, "risk": "Medium"},
            {"actor": "Kabir", "title": "Monday: Migrate auth to new stack", "activity_type": "task", "status": "Working", "at": _ago(days=1), "details": "Board: Product, Group: Sprint 12", "priority": "P2", "progress": 40, "risk": None},
            {"actor": "Neha", "title": "Monday: Update pricing page", "activity_type": "task", "status": "Done", "at": _ago(days=2), "details": "Board: Marketing, Group: Website", "priority": "P2", "progress": 100, "risk": None},
            {"actor": "Riya", "title": "Monday: QA pass on billing flow", "activity_type": "task", "status": "Not Started", "at": _ago(days=1), "details": "Board: Product, Group: Sprint 13", "priority": "P1", "progress": 0, "risk": None},
        ],
        "google_docs": [
            {"actor": "test@foundesk.dev", "title": "Product Requirements v2", "activity_type": "document_edit", "details": "https://docs.example.com/prd-v2", "status": "Active", "at": _ago(hours=2)},
            {"actor": "test@foundesk.dev", "title": "Investor Update September", "activity_type": "document_edit", "details": "https://docs.example.com/investor-sep", "status": "Active", "at": _ago(days=1)},
            {"actor": "test@foundesk.dev", "title": "Engineering Onboarding", "activity_type": "document_edit", "details": "https://docs.example.com/eng-onboarding", "status": "Active", "at": _ago(days=3)},
        ],
        "trello": [
            {"actor": "Trello Board", "title": "Trello: Integrate Stripe test mode", "activity_type": "task", "status": "In Progress", "at": _ago(hours=12), "details": "Board: Backend", "priority": "P1"},
            {"actor": "Trello Board", "title": "Trello: Write API docs v2", "activity_type": "task", "status": "Done", "at": _ago(days=1), "details": "Board: Docs", "priority": "P2"},
            {"actor": "Trello Board", "title": "Trello: Address review comments", "activity_type": "task", "status": "Review", "at": _ago(hours=20), "details": "Board: Frontend", "priority": "P2"},
            {"actor": "Trello Board", "title": "Trello: Rotate API keys", "activity_type": "task", "status": "To Do", "at": _ago(days=2), "details": "Board: Security", "priority": "P1"},
        ],
        "asana": [
            {"actor": "test@foundesk.dev", "title": "Asana: Prepare investor follow-ups", "activity_type": "task", "status": "In Progress", "at": _ago(hours=7), "details": "Project: Growth", "priority": "P1"},
            {"actor": "test@foundesk.dev", "title": "Asana: Vendor evaluation matrix", "activity_type": "task", "status": "Not Started", "at": _ago(days=2), "details": "Project: Vendor", "priority": "P2"},
            {"actor": "test@foundesk.dev", "title": "Asana: Refresh content calendar", "activity_type": "task", "status": "Done", "at": _ago(days=1), "details": "Project: Marketing", "priority": "P3"},
            {"actor": "test@foundesk.dev", "title": "Asana: Set up usage dashboards", "activity_type": "task", "status": "In Progress", "at": _ago(hours=30), "details": "Project: Analytics", "priority": "P2"},
        ],
        "calendly": [
            {"actor": "test@foundesk.dev", "title": "Calendly: Product demo — Acme Corp", "activity_type": "event", "status": "Scheduled", "at": _at(13, 0), "details": "https://calendly.example/events/acme-001", "priority": "high"},
            {"actor": "test@foundesk.dev", "title": "Calendly: Founder intro — Blue Ocean Fund", "activity_type": "event", "status": "Scheduled", "at": _at(15, 0, day_offset=1), "details": "https://calendly.example/events/bof-005", "priority": "high"},
            {"actor": "test@foundesk.dev", "title": "Calendly: Walkthrough — FinEdge", "activity_type": "event", "status": "Scheduled", "at": _at(12, 30, day_offset=-1), "details": "https://calendly.example/events/finedge-011", "priority": "medium"},
        ],
        "linear": [
            {"actor": "test@foundesk.dev", "title": "Linear: NFC-221 Fix checkout race condition", "activity_type": "task", "status": "In Progress", "at": _ago(hours=9), "details": "https://linear.app/issue/NFC-221 | Team: Payments", "priority": "P1"},
            {"actor": "test@foundesk.dev", "title": "Linear: PAY-98 Add refund webhook handler", "activity_type": "task", "status": "Todo", "at": _ago(days=1), "details": "https://linear.app/issue/PAY-98 | Team: Payments", "priority": "P2"},
            {"actor": "test@foundesk.dev", "title": "Linear: AUTH-512 Session invalidation on plan change", "activity_type": "task", "status": "Backlog", "at": _ago(days=3), "details": "https://linear.app/issue/AUTH-512 | Team: Core", "priority": "P0"},
            {"actor": "test@foundesk.dev", "title": "Linear: GROW-77 Referral link generation", "activity_type": "task", "status": "Done", "at": _ago(days=2), "details": "https://linear.app/issue/GROW-77 | Team: Growth", "priority": "P2"},
        ],
        "hubspot": [
            {"actor": "Nexora", "title": "HubSpot Deal: Nexora — Series A", "activity_type": "deal", "status": "Contract Sent", "at": _ago(hours=5), "details": "Amount: $360000 | Stage: Contract Sent | Notes: Legal review pending"},
            {"actor": "Finsights", "title": "HubSpot Deal: Finsights trial", "activity_type": "deal", "status": "Discovery", "at": _ago(days=1), "details": "Amount: $15000 | Stage: Discovery | Notes: Startup plan"},
            {"actor": "Meera Krishnan", "title": "HubSpot Contact: Meera Krishnan", "activity_type": "lead", "status": "Active", "at": _ago(days=2), "details": "Email: meera@example.co | Phone: N/A"},
            {"actor": "Lumina Labs", "title": "HubSpot Company: Lumina Labs", "activity_type": "company", "status": "Active", "at": _ago(days=3), "details": "Domain: lumina.example"},
        ],
        "pipedrive": [
            {"actor": "Aarti Rao", "title": "Pipedrive Deal: Enterprise onboarding package", "activity_type": "deal", "status": "Open", "at": _ago(days=1), "details": "Value: $24000 | Status: Open | Notes: wants API support"},
            {"actor": "Vikram Nair", "title": "Pipedrive Deal: API access upgrade", "activity_type": "deal", "status": "Won", "at": _ago(days=3), "details": "Value: $6000 | Status: Won"},
            {"actor": "Ishaan Gupta", "title": "Pipedrive Deal: Consultancy retainer", "activity_type": "deal", "status": "Open", "at": _ago(hours=20), "details": "Value: $12000 | Status: Open"},
        ],
        "zoho_crm": [
            {"actor": "Careerstack", "title": "Zoho Deal: Career platform pilot", "activity_type": "deal", "status": "Negotiation", "at": _ago(days=1), "details": "Amount: $18000 | Stage: Negotiation"},
            {"actor": "Rohan Mehta", "title": "Zoho Contact: Rohan Mehta", "activity_type": "contact", "status": "Active", "at": _ago(days=2), "details": "Email: rohan@example.co"},
            {"actor": "Springboard Labs", "title": "Zoho Lead: Springboard Labs", "activity_type": "lead", "status": "New", "at": _ago(hours=10), "details": "Company: Springboard"},
        ],
        "google_analytics": [
            {
                "actor": "Google Analytics",
                "title": "📈 Traffic increased to 1240 users (+180)",
                "activity_type": "metric",
                "status": "active",
                "at": _ago(days=1),
                "details": "Previous: 1060 users",
                "priority": "medium",
            },
        ],
    }
    return rows.get(provider, [])


def generate_fake_events(provider):
    """Build ActivityEvent-shaped dicts (is_mock=True) for a mock integration."""
    events = []
    for idx, item in enumerate(_feed_items(provider)):
        activity_type = item.get("activity_type")
        if activity_type is None:
            activity_type = {
                "gmail": "email",
                "google_calendar": "meeting",
                "slack": "message",
                "notion": "document",
            }.get(provider, "generic")

        category = {
            "gmail": "communication",
            "google_calendar": "calendar",
            "calendly": "calendar",
            "github": "dev",
            "slack": "communication",
            "notion": "docs_tasks_wikis",
            "google_docs": "docs_tasks_wikis",
            "monday": "tasks",
            "trello": "tasks",
            "asana": "tasks",
            "linear": "tasks",
            "hubspot": "crm",
            "pipedrive": "crm",
            "zoho_crm": "crm",
            "google_analytics": "analytics",
        }.get(provider, "generic")

        status = item.get("status", "active")
        event = {
            "provider": provider,
            "category": category,
            "actor": item.get("actor", "Mock User"),
            "title": item.get("title", "Mock event"),
            "activity_type": activity_type,
            "status": status,
            "external_timestamp": item.get("at", datetime.utcnow()),
            "details": item.get("details", ""),
            "raw_ref": f"mock_{provider}_{idx}",
            "is_mock": True,
            "priority": item.get("priority") or "normal",
        }
        if "meet_link" in item:
            event["meet_link"] = item["meet_link"]
        if "url" in item:
            event["url"] = item["url"]
        if "repo" in item:
            event["repo"] = item["repo"]
        if "progress" in item:
            event["progress_percentage"] = item["progress"]
        if "risk" in item:
            event["risk_level"] = item["risk"]

        events.append(event)

    return events