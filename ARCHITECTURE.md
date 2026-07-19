# Architecture Documentation

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│                    Browser (Chrome/Firefox/Safari)                           │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │ HTTPS
┌───────────────────────────────────▼──────────────────────────────────────────┐
│                        FRONTEND (Vite + React 19)                            │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                        React Router                                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │  Landing  │ │  Login   │ │Dashboard │ │  Plan    │ │ Execute  │  │    │
│  │  │  Page    │ │  (OAuth) │ │  Page   │ │  Page   │ │  Page    │  │    │
│  │  └──────────┘ └──────────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌────┴─────┐ ┌────┴─────┐ ┌────┴─────┐  │    │
│  │  │  Memory  │ │ Settings │ │ Goals    │ │ Kanban   │ │  List    │  │    │
│  │  │  Page   │ │  Page    │ │ Cascade  │ │ Board    │ │  View    │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     COMPONENT LAYER                                    │    │
│  │  Layout │ Sidebar │ Navbar │ Card │ BentoGrid │ CommandPalette       │    │
│  │  ProtectedRoute │ NotificationBell │ AuthModal │ CommandBar         │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     STATE & UTILITY LAYER                              │    │
│  │  Context (Auth, Workspace) │ Hooks (useApi, useAuth) │ API Client    │    │
│  │  Amplitude Tracking │ localStorage Persistence                        │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │ REST API (JSON over HTTPS)
                                    │ axios calls to /api/*
┌───────────────────────────────────▼──────────────────────────────────────────┐
│                         BACKEND (Flask + Gunicorn)                           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     FLASK BLUEPRINTS (41 routes)                     │    │
│  │                                                                      │    │
│  │  CORE:                        INTEGRATIONS:                           │    │
│  │  ├── /auth                    ├── /api/google                         │    │
│  │  ├── /api/tasks               ├── /api/linear                         │    │
│  │  ├── /api/goals               ├── /api/trello                         │    │
│  │  ├── /api/standups            ├── /api/asana                          │    │
│  │  ├── /api/decisions           ├── /api/monday                         │    │
│  │  ├── /api/meeting-notes       ├── /api/github                         │    │
│  │  ├── /api/blockers            ├── /api/slack                          │    │
│  │  ├── /api/dashboard           ├── /api/notion                         │    │
│  │  ├── /api/workspaces          ├── /api/hubspot                        │    │
│  │  ├── /api/integrations        ├── /api/pipedrive                      │    │
│  │  ├── /api/billing             ├── /api/calendly                       │    │
│  │  ├── /api/developer           ├── /api/mixpanel/amplitude/posthog    │    │
│  │  ├── /api/feed                └── /api/zoho                           │    │
│  │  └── /api/knowledge                                                    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     SERVICE LAYER (22 services)                     │    │
│  │                                                                      │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                    │    │
│  │  │ Integration Svcs    │  │ Core Services        │                   │    │
│  │  │ ├── Google (OAuth)  │  │ ├── Activity Compiler│                   │    │
│  │  │ ├── Linear          │  │ ├── Briefing Engine   │                   │    │
│  │  │ ├── Slack           │  │ ├── Decision Engine   │                   │    │
│  │  │ ├── HubSpot         │  │ ├── Notification Eng  │                   │    │
│  │  │ └── ... (15 more)  │  │ └── Calendar Defense   │                   │    │
│  │  └─────────────────────┘  └─────────────────────┘                    │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     PATTERN ENGINE (AI/LLM Pipeline)                 │    │
│  │                                                                      │    │
│  │  RawEvent Ingestion → Dedup → Extraction → Tagging → Classification │    │
│  │       ↓                                                              │    │
│  │  Task Creation │ Decision Log │ Meeting Notes │ Knowledge Items     │    │
│  │       ↓                                                              │    │
│  │  LLM Client (Ollama → Groq → OpenRouter)                            │    │
│  │       ↓                                                              │    │
│  │  Standup Compiler → Blocker Detection → Follow-up Tracking          │    │
│  │       ↓                                                              │    │
│  │  Chronicle Events │ Activity Feed                                   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │                     AUTH & UTILITY LAYER                              │    │
│  │  JWT Auth │ Rate Limiter │ Crypto │ Error Logger │ Workspace Auth   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────┬──────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼──────────────────────────────────────────┐
│                         DATABASE (PostgreSQL 16)                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  USERS & WORKSPACES:                      │ TASKS & GOALS:            │    │
│  │  ├── users                                │ ├── tasks                 │    │
│  │  ├── workspaces                           │ ├── goals                 │    │
│  │  ├── workspace_members                    │ ├── goal_decisions (M2M)  │    │
│  │  ├── workspace_notifications              │ └── phase_templates       │    │
│  │  └── refresh_tokens                       │                           │    │
│  │                                           │ MEETINGS & DECISIONS:     │    │
│  │  INTEGRATIONS & EVENTS:                   │ ├── meeting_notes         │    │
│  │  ├── user_integrations                    │ ├── decision_logs         │    │
│  │  ├── raw_events                           │ └── knowledge_items       │    │
│  │  ├── activity_events                      │                           │    │
│  │  └── chronicle_events                     │ TRACKING & ANALYTICS:     │    │
│  │                                           │ ├── blockers              │    │
│  │  STANDUPS & BRIEFINGS:                    │ ├── follow_ups            │    │
│  │  ├── standups                             │ ├── recurring_workflows  │    │
│  │  └── dismissed_calendar_alerts           │ ├── pinned_items          │    │
│  │                                           │ └── ai_feedback           │    │
│  │  BILLING & AUTH:                          │                           │    │
│  │  ├── invoices                             │ LLM & MONITORING:         │    │
│  │  ├── api_keys                             │ ├── llm_usage_logs        │    │
│  │  ├── api_key_audit_logs                   │ ├── provider_usage        │    │
│  │  └── error_logs                           │ ├── pattern_corrections   │    │
│  │                                           │ └── email_notifications   │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ORM: SQLAlchemy with Alembic migrations                                    │
│  Pool: 10 connections, recycle at 300s, pre-ping enabled                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### Flask Blueprints (Route Organization)

The backend uses Flask Blueprints to organize 40+ route files into logical groups:

| Blueprint Group | Prefix | Files | Purpose |
|----------------|--------|-------|---------|
| Auth | `/auth`, `/api` | `auth.py`, `users.py` | Authentication & user management |
| Core Data | `/api` | `tasks.py`, `goals.py`, `standups.py`, `decisions.py`, `meeting_notes.py`, `blockers.py` | Primary data entities |
| Workspace | `/api` | `workspaces.py`, `team_space.py`, `notifications.py` | Workspace & team management |
| Dashboard | `/api` | `dashboard.py`, `feed.py`, `briefing_routes.py`, `calendar_defense.py` | Aggregated views |
| Integrations | `/api` | `google_data.py`, `linear_data.py`, `slack_service.py` (via routes) | External data sync |
| AI | `/api` | `ai_layer.py`, `pattern_engine_routes.py` | AI features |
| Billing | `/api` | `billing.py` | Payment processing |
| Developer | `/api` | `developer.py`, `templates.py` | API & extensions |
| Memory | `/api` | `memory.py`, `knowledge_routes.py`, `follow_ups.py` | Knowledge management |

### Service Layer

Integration services implement a common pattern:
1. **OAuth flow** — Obtain and store access/refresh tokens
2. **Data fetching** — Sync data from external APIs
3. **Normalization** — Convert to uniform RawEvent format
4. **Pipeline processing** — Feed into pattern engine

### Pattern Engine

The pattern engine is the AI core, processing raw events through a multi-stage pipeline:

```
RawEvent → Dedup (exact/similar/dismissed)
         → Extraction (LLM classifies: task/decision/meeting/none)
         → Tagging (apply metadata labels)
         → Record Creation (Task, DecisionLog, MeetingNotes, KnowledgeItem)
         → Cross-linking (meeting→decision, decision→goal, standup→blocker)
         → Chronicle (activity history)
         → Standup Compilation
         → Feed Compilation
```

---

## Frontend Architecture

### Component Tree

```
<App>
  ├── <Landing />             (public)
  ├── <Login />               (public, Google OAuth)
  ├── <GoogleCallback />      (public)
  ├── <ProtectedRoute>
  │   └── <Layout>
  │       ├── <Sidebar />     (navigation, workspace info)
  │       ├── <Navbar />      (search, notifications, user menu)
  │       └── <Outlet>
  │           ├── <Dashboard />      (activity feed, KPIs)
  │           ├── <Execute />        (Kanban board + List view)
  │           ├── <Goals />          (Goal Cascade)
  │           ├── <Memory />         (Meetings + Decisions)
  │           ├── <Settings />       (Integrations, Profile, Billing)
  │           └── <Billing />        (Subscription management)
  └── <Navigate to="/" />    (catch-all)
```

### Routing

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | `Landing` | No |
| `/login` | `Login` | No |
| `/auth/callback` | `GoogleCallback` | No |
| `/dashboard` | `Dashboard` | Yes |
| `/plan` | `Goals` | Yes |
| `/execute` | `Execute` (Kanban/List) | Yes |
| `/memory` | `Memory` | Yes |
| `/settings` | `Settings` | Yes |
| `/billing` | `Billing` | Yes |

### State Management

- **Local state** — `useState` for component-local data
- **Context** — Auth context for user session, workspace context for active workspace
- **LocalStorage** — Persisted auth token, user data, workspace ID
- **API client** — Axios instance with JWT interceptor

---

## Database: Key Models & Relationships

```
User ──< WorkspaceMember >── Workspace
 │                               │
 ├──< Task                    ├──< Goal (self-referential parent_id)
 ├──< DecisionLog             │    └──< goal_decisions (M2M) >── DecisionLog
 ├──< MeetingNotes            │    └──< Task (goal_id)
 ├──< Standup                 ├──< Standup
 ├──< UserIntegration         ├──< Blocker
 ├──< FollowUp                ├──< MeetingNotes
 ├──< KnowledgeItem           ├──< KnowledgeItem
 └──< RefreshToken            ├──< RawEvent
                              ├──< ActivityEvent
                              ├──< ChronicleEvent
                              ├──< FollowUp
                              └──< PhaseTemplate
                                   ├──< PhaseTemplateGoal
                                   └──< PhaseTemplateTask
```

---

## Integration Providers

| Provider | Auth Type | Sync Strategy | Data Collected |
|----------|-----------|---------------|----------------|
| Google (Gmail/Calendar) | OAuth 2.0 | Polling + Webhook | Emails, calendar events |
| Linear | OAuth 2.0 | Polling | Issues, projects |
| Trello | API Token | Polling | Cards, lists |
| Asana | OAuth 2.0 | Polling | Tasks, projects |
| Monday.com | OAuth 2.0 | Polling | Items, boards |
| GitHub | OAuth 2.0 | Polling | Issues, PRs, commits |
| Slack | OAuth 2.0 | Event API | Messages, files |
| Notion | API Token | Polling | Database pages |
| HubSpot | API Key | Polling | Deals, contacts |
| Pipedrive | OAuth 2.0 | Polling | Deals, activities |
| Calendly | OAuth 2.0 | Webhook | Scheduled events |
| Mixpanel/Amplitude/PostHog | API Key | Polling | Events, analytics |

---

## Security Architecture

```
┌──────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Browser  │────▶│  Nginx/CORS      │────▶│  Flask App       │
│          │     │  (origin check)  │     │  ├── Rate Limit  │
│          │     │  (HTTPS)         │     │  ├── CSRF Guard │
│          │     │                  │     │  ├── JWT Verify │
│          │     │                  │     │  └── Input Val  │
└──────────┘     └──────────────────┘     └────────┬─────────┘
                                                    │
                                           ┌────────▼─────────┐
                                           │  SQLAlchemy ORM   │
                                           │  (SQL injection   │
                                           │   prevention)     │
                                           └──────────────────┘
```

---

## Data Flow: Event → Action

```
External API (Gmail, Linear, etc.)
       │
       ▼
ActivityEvent (stored in DB)
       │
       ▼
RawEvent (created by pipeline)
       │
       ▼
Pattern Engine Pipeline
       │
       ├──→ Task created/updated
       ├──→ Decision logged
       ├──→ Meeting note created
       ├──→ Blocker detected
       ├──→ Knowledge item stored
       ├──→ Standup compiled
       └──→ Feed updated
       │
       ▼
Frontend (React queries /api/*)
       │
       ▼
User views and interacts
```
