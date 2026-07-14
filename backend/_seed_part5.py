import os, json, psycopg2
from dotenv import load_dotenv; load_dotenv()
from datetime import datetime, timedelta
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

ws_id = 372  # Tharun's Workspace (from preserved data)
user_id = 635  # Tharun's user
now = datetime.utcnow()

# ── Clear any leftover test data ──
for t in ["follow_ups", "blockers", "knowledge_items", "meeting_notes", "decision_logs", "tasks", "standups", "goals", "raw_events", "activity_events"]:
    cur.execute(f"DELETE FROM {t}")
conn.commit()

# ── Insert varied ActivityEvents across all 14 sources ──
events = []

# 1. Gmail (5 varied emails)
gmail_emails = [
    ("gmail", "communication", "tharu@foundesk.com", "Q3 Budget Review", "email", "unread", now - timedelta(hours=2),
     "Attached is the Q3 budget proposal. Key changes: increased engineering spend by 15%, reduced marketing by 5%. Please review and approve by Friday.", "gmail_msg_101"),
    ("gmail", "communication", "sarah@acme.com", "Partnership Agreement Draft", "email", "unread", now - timedelta(hours=5),
     "Hi Tharun, I've attached the draft partnership agreement. Key terms: revenue share 70/30, minimum commitment 12 months, IP remains with both parties. Let me know if you want to revise any clauses.", "gmail_msg_102"),
    ("gmail", "communication", "pr@startup.io", "Press Release: Series A Announcement", "email", "read", now - timedelta(days=1),
     "We're ready to publish the Series A announcement. Final version attached — please confirm the quote attribution and investor names are correct before we send to TechCrunch.", "gmail_msg_103"),
    ("gmail", "communication", "eng@foundesk.com", "Deploy v2.3 to production?", "email", "unread", now - timedelta(hours=8),
     "All tests pass on staging. The performance improvements are 40% faster query times. Decision needed: deploy to production today or wait for the security audit next week?", "gmail_msg_104"),
    ("gmail", "communication", "legal@foundesk.com", "NDA Signed with DataCorp", "email", "read", now - timedelta(days=2),
     "DataCorp has signed the NDA. We can now proceed with the data-sharing agreement. Their DPO requested a call to discuss GDPR compliance requirements.", "gmail_msg_105"),
]
for p, cat, actor, title, atype, status, ts, details, ref in gmail_emails:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 2. Slack (5 varied messages)
slack_msgs = [
    ("slack", "communication", "alice", "Blocked on API rate limiting", "message", None, now - timedelta(minutes=30),
     "The Stripe API is returning 429 errors. We're hitting the rate limit with our current batch processing approach. Need to decide: implement exponential backoff or request a higher tier?", "slack_msg_201"),
    ("slack", "communication", "bob", "Customer demo went great", "message", None, now - timedelta(hours=1),
     "Just finished the demo with Acme Corp. They loved the analytics dashboard. Asked for a PoC by end of month. I think we should prioritize this — could be $50k ARR deal.", "slack_msg_202"),
    ("slack", "communication", "carol", "Hiring update: backend candidate", "message", None, now - timedelta(hours=3),
     "The senior backend candidate from Stripe accepted our offer! Start date is Aug 1. We need to set up their onboarding and decide which team they join — platform or data.", "slack_msg_203"),
    ("slack", "communication", "dave", "Server costs increasing", "message", None, now - timedelta(hours=6),
     "Our AWS bill jumped 30% this month. Looks like the new ML inference instances are costing more than expected. Options: optimize model size, switch to spot instances, or pass cost to customers.", "slack_msg_204"),
    ("slack", "communication", "eve", "Design review: new onboarding flow", "message", None, now - timedelta(hours=12),
     "The new onboarding mockups are ready for review. Key changes: reduced from 5 steps to 3, added video walkthrough, removed the credit card requirement upfront. Feedback needed by EOD.", "slack_msg_205"),
]
for p, cat, actor, title, atype, status, ts, details, ref in slack_msgs:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 3. Notion (3 varied docs)
notion_docs = [
    ("notion", "knowledge", "tharu", "Product Strategy Q3 2026", "doc", None, now - timedelta(days=1),
     "Strategic initiatives for Q3: 1) Enterprise SSO integration — top customer request 2) Mobile app MVP 3) API marketplace. Budget allocated: $200k engineering, $50k design. Decision needed: prioritize SSO or mobile first?", "notion_doc_301"),
    ("notion", "knowledge", "tharu", "Engineering Architecture Decisions", "doc", None, now - timedelta(days=3),
     "Decision Record: After evaluating Postgres vs DynamoDB for the activity feed service, we chose Postgres with partitioning. Rationale: simpler ops, existing expertise, sufficient perf for our scale. Cost savings: ~$800/month vs DynamoDB.", "notion_doc_302"),
    ("notion", "knowledge", "carol", "Onboarding Playbook v2", "doc", None, now - timedelta(days=5),
     "Updated onboarding for new engineers: Week 1 — environment setup, codebase tour, first PR. Week 2 — shadow support rotation. Week 3 — own a small feature. Mentors assigned per cohort.", "notion_doc_303"),
]
for p, cat, actor, title, atype, status, ts, details, ref in notion_docs:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 4. Google Docs (3 docs)
gd_docs = [
    ("google_docs", "knowledge", "tharu", "Investor Update — July 2026", "doc", None, now - timedelta(days=2),
     "Monthly update for investors: Revenue grew 22% MoM, 3 new enterprise customers, churn at 2.1%. Key risks: hiring timeline slipping, AWS costs rising. Ask: introductions to B2B SaaS CFOs for our advisory board.", "gdoc_401"),
    ("google_docs", "knowledge", "alice", "Feature Spec: Teams Integration", "doc", None, now - timedelta(days=4),
     "Spec for Teams integration: Phase 1 — receive notifications in Teams (2 weeks), Phase 2 — reply/create tasks from Teams (4 weeks), Phase 3 — full bidirectional sync (6 weeks). Approved by product committee.", "gdoc_402"),
    ("google_docs", "knowledge", "bob", "Post-mortem: July 10 Outage", "doc", None, now - timedelta(days=7),
     "Root cause: Database connection pool exhaustion during traffic spike. Fix: increased pool size from 20 to 100, added connection retry logic, monitoring alert at 80% pool utilization. Total downtime: 14 minutes.", "gdoc_403"),
]
for p, cat, actor, title, atype, status, ts, details, ref in gd_docs:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 5. Google Meet (3 meetings)
meet_events = [
    ("google_meet", "calendar", "tharu", "Sprint Planning — Week 28", "meeting", None, now - timedelta(hours=4),
     "Attendees: Tharun, Alice, Bob, Carol, Dave. Decisions: Sprint goal — complete Teams integration API. Capacity: 45 story points. Blockers: awaiting design review for notification UI.", "meet_501"),
    ("google_meet", "calendar", "tharu", "Customer Call: Acme Corp PoC Review", "meeting", None, now - timedelta(days=1),
     "Met with Acme Corp CTO and VP Eng. They were impressed with the POC. Decision: proceed to paid pilot ($5k/month for 3 months). Follow-up: send security questionnaire by Friday, schedule technical deep-dive next week.", "meet_502"),
    ("google_meet", "calendar", "carol", "Hiring Interview: Senior Frontend Engineer", "meeting", None, now - timedelta(days=2),
     "Interviewed Jane from Figma. Strong system design skills, good cultural fit. Decision: advance to final round with CTO. Flag: her start date is 6 weeks out due to notice period.", "meet_503"),
]
for p, cat, actor, title, atype, status, ts, details, ref in meet_events:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 6. Google Calendar (3 events)
cal_events = [
    ("google_calendar", "calendar", "tharu", "Board Meeting — Q2 Review", "event", "confirmed", now + timedelta(days=3),
     "Agenda: Q2 financial review, Q3 strategy approval, hiring plan update, cap table changes. Materials to be distributed 48h before. Board members: Sequoia, a16z, founder.", "gcal_601"),
    ("google_calendar", "calendar", "tharu", "1:1 with Alice", "event", "confirmed", now - timedelta(days=1),
     "Weekly 1:1. Topics: career growth discussion, project bandwidth concerns, mentorship opportunities. Alice expressed interest in moving to a tech lead role next quarter.", "gcal_602"),
    ("google_calendar", "calendar", "tharu", "Vendor Negotiation: Cloud Infrastructure", "event", "confirmed", now + timedelta(days=7),
     "Meeting with AWS account manager to negotiate reserved instance pricing. Target: 30% discount on 1-year commit. Current monthly spend: $45k. Decision needed: commit term length.", "gcal_603"),
]
for p, cat, actor, title, atype, status, ts, details, ref in cal_events:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 7. Calendly (3 events)
calendly_events = [
    ("calendly", "calendar", "lead@acme.com", "Calendly: Product Demo — Acme Corp", "scheduled", "upcoming", now - timedelta(hours=6),
     "Scheduled via Calendly. Prospect: Acme Corp, contact: Sarah Chen, title: VP Eng. Company size: 500 employees, funding: Series C. Interest: enterprise SSO and compliance features.", "calendly_701"),
    ("calendly", "calendar", "lead@startup.io", "Calendly: Discovery Call — Startup.io", "scheduled", "completed", now - timedelta(days=1),
     "Discovery call with Startup.io CEO. They're evaluating FounDesk for their 20-person team. Key requirements: Slack integration, task management, decision logging. Price-sensitive — startup pricing needed.", "calendly_702"),
    ("calendly", "calendar", "partner@data.com", "Calendly: Partnership Discussion — Data Corp", "scheduled", "upcoming", now + timedelta(days=2),
     "Potential integration partnership. Data Corp wants to build a connector on our platform. Revenue share model discussed: 80/20 in our favor for first year.", "calendly_703"),
]
for p, cat, actor, title, atype, status, ts, details, ref in calendly_events:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 8-11. Task tools: Linear, Trello, Asana, Monday (3-4 each)
task_events = [
    # Linear
    ("linear", "dev", "alice", "Implement Teams notification webhook", "issue", "In Progress", now - timedelta(hours=10),
     "Build webhook endpoint for Teams outgoing notifications. POST /api/teams/webhook. Payload format TBD. Estimate: 3 days. Priority: P1.", "linear_801"),
    ("linear", "dev", "bob", "Fix database connection pool exhaustion", "issue", "Done", now - timedelta(days=1),
     "Increase pool size, add retry logic, add monitoring alert. Reference: post-mortem doc. Estimate: 1 day.", "linear_802"),
    ("linear", "dev", "carol", "Add SSO login flow for enterprise customers", "issue", "Backlog", now - timedelta(days=3),
     "Implement SAML-based SSO. Supported providers: Okta, Azure AD, Google Workspace. Must support IdP-initiated and SP-initiated flows. Estimate: 2 weeks. Priority: P0.", "linear_803"),
    # Trello
    ("trello", "dev", "tharu", "Design new onboarding flow mockups", "card", "In Progress", now - timedelta(hours=24),
     "Figma mockups for 3-step onboarding. Remove credit card requirement. Add product tour video. Due: July 15.", "trello_901"),
    ("trello", "dev", "dave", "Write API documentation for v2", "card", "Not Started", now - timedelta(hours=48),
     "Document all REST endpoints, WebSocket events, and GraphQL schema. Use OpenAPI 3.0 format. Include example requests/responses.", "trello_902"),
    ("trello", "dev", "eve", "Performance audit: frontend bundle size", "card", "Done", now - timedelta(days=5),
     "Analyze webpack bundle, identify large dependencies, propose code splitting strategy. Findings: moment.js (500KB) → replace with date-fns (50KB).", "trello_903"),
    # Asana
    ("asana", "dev", "alice", "Set up CI/CD pipeline for mobile app", "task", "In Progress", now - timedelta(days=2),
     "Configure GitHub Actions for iOS and Android builds. Add test stage, code signing, and App Store/Play Store deployment. Target: fully automated release.", "asana_1001"),
    ("asana", "dev", "bob", "Conduct security audit of payment flow", "task", "Not Started", now - timedelta(days=4),
     "Third-party security review of payment processing. Scope: Stripe integration, PCI compliance, data encryption. Vendor: SecurityFirst Inc. Cost: $15k.", "asana_1002"),
    ("asana", "dev", "carol", "Migrate legacy API endpoints to v2", "task", "In Progress", now - timedelta(days=7),
     "Migration plan: /v1/* → /v2/*. Deprecate v1 after 3 months. Current progress: 12/25 endpoints migrated. ETA: 3 weeks.", "asana_1003"),
    # Monday
    ("monday", "dev", "tharu", "Prepare investor data room", "item", "Working on it", now - timedelta(hours=12),
     "Compile documents for Series A due diligence: financial models, cap table, customer contracts, IP portfolio, team bios. Deadline: July 20.", "monday_1101"),
    ("monday", "dev", "dave", "Set up SOC2 compliance tracking", "item", "Not Started", now - timedelta(days=2),
     "Create compliance checklist, assign owners, set up monitoring. Vendor: Vanta. Controls: 45 total across security, availability, confidentiality.", "monday_1102"),
]
for p, cat, actor, title, atype, status, ts, details, ref in task_events:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 12-13. CRM: HubSpot, Pipedrive (3-4 each)
crm_events = [
    # HubSpot deals
    ("hubspot", "crm", "Acme Corp", "HubSpot Deal: Acme Corp Enterprise", "deal", "negotiations", now - timedelta(hours=8),
     "Amount: $120000 | Stage: negotiations | Close date: Q3 2026 | Contact: Sarah Chen, VP Eng. Decision needed: offer volume discount for multi-year commitment?", "hubspot_1201"),
    ("hubspot", "crm", "Startup.io", "HubSpot Deal: Startup.io Growth Plan", "deal", "contractsent", now - timedelta(days=1),
     "Amount: $24000 | Stage: contractsent | Annual plan sent for signature. Follow-up: check in with CEO if not signed within 5 business days.", "hubspot_1202"),
    ("hubspot", "crm", "DataCorp", "HubSpot Deal: DataCorp Partnership", "deal", "closedwon", now - timedelta(days=3),
     "Amount: $60000 | Stage: closedwon | Won! Integration partnership. Revenue share: 80/20. Launch date: September 2026.", "hubspot_1203"),
    ("hubspot", "crm", "TechGlobal Inc", "HubSpot Deal: TechGlobal Pilot", "deal", "pipeline", now - timedelta(days=7),
     "Amount: $5000 | Stage: pipeline | Initial pilot for 50 users. Contact: Mike Johnson, CTO. Interest: mobile app and SSO features.", "hubspot_1204"),
    # Pipedrive deals
    ("pipedrive", "crm", "Omega Corp", "Pipedrive Deal: Omega Corp Consulting", "deal", "open", now - timedelta(hours=5),
     "Value: $45000 | Status: Open | Contact: Jane Smith, Director of Ops. Need: custom reporting dashboard. Stage: lead qualification.", "pipedrive_1301"),
    ("pipedrive", "crm", "Nova Systems", "Pipedrive Deal: Nova Systems Platform License", "deal", "won", now - timedelta(days=1),
     "Value: $85000 | Status: Won | Closed! Deal size: 200 seats at $425/seat/year. Onboarding starts next month.", "pipedrive_1302"),
    ("pipedrive", "crm", "BluePeak Ventures", "Pipedrive Deal: BluePeak Ventures Assessment", "deal", "lost", now - timedelta(days=4),
     "Value: $30000 | Status: Lost | Lost to competitor. Reason: faster time-to-market for their MVP requirements. Lesson: need to improve onboarding speed for early-stage startups.", "pipedrive_1303"),
]
for p, cat, actor, title, atype, status, ts, details, ref in crm_events:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, False))

# 14. Analytics (3 — should be noise-gated)
analytics_events = [
    ("mixpanel", "analytics", "system", "Dashboard Viewed", "page_viewed", None, now - timedelta(hours=1),
     "User viewed /dashboard. Duration: 45s. Referrer: direct.", "mixpanel_1401"),
    ("amplitude", "analytics", "system", "User Signed In", "auth", None, now - timedelta(hours=2),
     "User logged in from Chrome on Windows, IP range: 203.x.x.x", "amplitude_1402"),
    ("posthog", "analytics", "system", "Feature Flag Evaluated", "feature_flag", None, now - timedelta(hours=3),
     "Feature flag 'new_onboarding_flow' evaluated for user 42. Result: true.", "posthog_1403"),
]
for p, cat, actor, title, atype, status, ts, details, ref in analytics_events:
    events.append((p, cat, actor, title, atype, status, ts, details, ref, True))

# ── Insert all activity events ──
print(f"Inserting {len(events)} ActivityEvents...")
for p, cat, actor, title, atype, status, ts, details, ref, is_mock in events:
    cur.execute("""
        INSERT INTO activity_events (workspace_id, provider, category, actor, title, activity_type, status, external_timestamp, details, raw_ref, is_mock, fetched_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (workspace_id, provider, raw_ref) DO NOTHING
    """, (ws_id, p, cat, actor, title, atype, status, ts, details, ref, is_mock, now))

conn.commit()

# Verify
cur.execute("SELECT provider, COUNT(*) FROM activity_events WHERE workspace_id=%s GROUP BY provider ORDER BY provider", (ws_id,))
print("\n=== ActivityEvents by source ===")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

cur.close()
conn.close()
print("\nDone. ActivityEvents inserted.")
