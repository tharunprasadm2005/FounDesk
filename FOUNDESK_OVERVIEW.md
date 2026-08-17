# FounDesk — Complete Product Overview

> *Intelligent Workspace Coordinator for Startup Founders*

---

## 1. What Is FounDesk?

FounDesk is an **AI-powered operations platform** purpose-built for startup founders and engineering teams. It integrates calendar events, emails, code commits, project management, goals, tasks, meeting notes, standups, and AI-driven pattern recognition into a **single unified workspace**.

Think of it as a **command center for your startup** — it replaces the chaos of juggling 15+ tools with one panoramic view of your entire operation.

**Live URLs:**
- Frontend: https://foundesk.onrender.com
- Backend API: https://foundesk-backend.onrender.com

---

## 2. The Problem It Solves

Startup founders face a specific set of operational challenges that general-purpose tools don't address:

| Problem | How FounDesk Solves It |
|---------|------------------------|
| **Tool overload** — 15+ SaaS tools with no single source of truth | Centralized dashboard pulling from all integrations |
| **Context switching** — constantly jumping between GitHub, Linear, Slack, Gmail, etc. | Unified activity feed compiled from every connected service |
| **Decision amnesia** — decisions made in meetings get lost | AI-powered decision extraction from calendar events and notes |
| **Goal fragmentation** — weekly goals disconnected from daily work | Goal Cascade (monthly → weekly → daily hierarchy with task linkage) |
| **Standup overhead** — manual standups waste time | Automated AI-compiled standups from real activity data |
| **Blind spots** — no visibility into blockers, overdue follow-ups, or calendar conflicts | Priority Signal Board with auto-detected blockers and conflicts |
| **Integration fatigue** — each new tool requires custom setup | 15+ pre-built integrations with OAuth-based one-click connect |

---

## 3. Architecture Overview

### Three-Tier System

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 + Vite 8)                    │
│  Single-page application served by Render as a static site        │
│  Hosted at: https://foundesk.onrender.com                         │
│                                                                    │
│  Pages: Landing → Login → Dashboard → Goals → Execute (Kanban)    │
│         → Memory (Meetings/Decisions) → Settings → Billing        │
└──────────────────────────────────┬───────────────────────────────┘
                           │ REST API (JSON)
                           │ HTTPS via Render
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   BACKEND (Flask 3.1 + Gunicorn)                   │
│  Docker container on Render. Hosted at: https://foundesk-backend   │
│  .onrender.com                                                     │
│                                                                    │
│  41 Route Blueprints         22 Integration Services               │
│  ┌──────────────────┐       ┌────────────────────────┐            │
│  │ auth             │       │ google_service.py      │            │
│  │ tasks            │       │ github_service.py      │            │
│  │ goals            │       │ slack_service.py       │            │
│  │ standups         │       │ linear_service.py      │            │
│  │ dashboard        │       │ notion_service.py      │            │
│  │ decisions        │       │ calendly_service.py    │            │
│  │ meeting-notes    │       │ hubspot_service.py     │            │
│  │ blockers         │       │ ... 15 more services   │            │
│  └──────────────────┘       └────────────────────────┘            │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              PATTERN ENGINE (AI/LLM Pipeline)                  │  │
│  │  fetch → extract → tag → dedup → save                         │  │
│  │  Extracts: tasks, decisions, goals, blockers, follow-ups,      │  │
│  │  meetings, knowledge items, standups from raw events           │  │
│  │  Runs: every 15 min via Render Cron Job, on dashboard load     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              ACTIVITY COMPILER                                 │  │
│  │  Pulls data from all connected integrations (GitHub, Linear,   │  │
│  │  Slack, Gmail, Google Calendar, Trello, Asana, Notion, etc.)  │  │
│  │  Compiles into unified ActivityEvent feed with dedup           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────┬───────────────────────────────┘
                           │ SQLAlchemy ORM
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                DATABASE (Neon PostgreSQL)                          │
│  31 tables including:                                              │
│  users · workspaces · workspace_members · tasks · goals            │
│  standups · blockers · decision_logs · meeting_notes ·             │
│  activity_events · follow_ups · integrations · api_keys            │
│  invoices · notification_preferences · knowledge_items ·           │
│  refresh_tokens · error_logs · pattern_engine tables               │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User connects integrations → Activity Compiler fetches data →
Pattern Engine processes raw events → Extracted entities stored in DB →
Dashboard queries all models → UI renders unified view
```

---

## 4. Key Features (Detailed)

### 4.1 Smart Dashboard
The dashboard is the **command center**. It loads in zones:
- **Command Strip** — active weekly/monthly goal + top P0/P1 priority tasks linked to it
- **Priority Signal Board** — blockers (auto-detected from integrations), blocked tasks (24h+ rule), overdue follow-ups, calendar conflicts (from Google Calendar)
- **Activity Feed** — compiled from all connected integrations (GitHub PRs, Linear issues, Slack messages, Gmail, calendar events, etc.)
- **Quick Stats** — task completion rates, standup status, integration health

The activity feed refreshes in a background thread on every dashboard load. It's also compiled every 15 minutes via a Render Cron Job (`GET /api/internal/run-pipeline`).

### 4.2 Goal Cascade
Hierarchical goal system:
- **Monthly goals** → parent level
- **Weekly goals** → child of monthly, linked to daily tasks
- **Daily tasks** → atomic units with P0–P3 priority

Each goal has a progress bar, status tracking (pending/in_progress/done), and task count. The system automatically promotes the active weekly or monthly goal to the command strip.

### 4.3 Kanban Board (Execute)
Drag-and-drop task management with:
- Columns: Backlog → To Do → In Progress → Review → Done
- Priority badges (P0–P3 with color coding)
- Deadline tracking
- Blocker linking
- Edit-in-place task cards

### 4.4 AI-Powered Standups
Automated daily standups compiled from:
- GitHub commits and PRs
- Linear/Asana/Trello ticket updates
- Google Calendar meetings attended
- Calendly events
- Slack activity

AI (via Ollama/Groq/OpenRouter) rewrites raw data into a cohesive standup narrative. Users can submit manual standups too.

### 4.5 Memory Module
Two sub-sections:
- **Meeting Notes** — searchable archive with AI-extracted summaries
- **Decision Log** — timestamped decisions with context, extractable from calendar events and meeting notes

### 4.6 Pattern Engine (AI Pipeline)
The core differentiator. A **multi-stage pipeline** that turns raw event data into structured entities:

```
Raw Events → Fetch (from integrations)
           → Extract (LLM parses task, decision, goal, blocker, etc.)
           → Tag (classify by type, priority, project)
           → Deduplicate (prevent duplicates across sources)
           → Save (to appropriate model tables)
```

LLM providers used: **Ollama** (local Qwen 2.5 7B), **Groq** (cloud), **OpenRouter** (fallback). Routing strategy is configurable.

### 4.7 Activity Compiler
Pulls data from 15+ integrations and compiles into a unified `ActivityEvent` feed:
- GitHub: commits, PRs, reviews
- Linear: issues, updates
- Slack: messages, threads
- Gmail: email count, threads
- Google Calendar: events, meetings
- Calendly: scheduled events
- Trello/Asana/Monday.com: card/task updates
- Notion: page updates
- HubSpot/Pipedrive: deal changes
- Zoho: CRM updates

Per-workspace lock with 5-minute cooldown prevents thundering herd.

### 4.8 Calendar Defense
Protects focus time by:
- Detecting calendar conflicts
- Surfacing meeting overload
- Suggesting focus blocks

### 4.9 Blockers Panel
Tracks and resolves blockers with:
- Severity levels (critical, major, minor)
- Source integration tracking
- Auto-detection from task descriptions
- 24-hour staleness rule for blocked tasks

### 4.10 Integrations (15+)
OAuth-based one-click connect for:

| Category | Providers |
|----------|-----------|
| **Code & Dev** | GitHub, Linear |
| **Project Mgmt** | Trello, Asana, Monday.com |
| **Communication** | Gmail, Slack |
| **Calendar** | Google Calendar, Calendly |
| **CRM** | HubSpot, Pipedrive, Zoho |
| **Docs & Knowledge** | Google Docs, Notion |
| **Analytics** | Amplitude, Mixpanel, PostHog |
| **Auth** | Google OAuth, Slack OAuth |

### 4.11 Billing
Razorpay subscription integration with:
- Tiered plans (Starter, Pro, Enterprise)
- Trial management
- Invoice generation
- Usage-based billing support

### 4.12 Developer API
RESTful API with:
- API key management with permissions
- Usage audit logging
- Rate limiting (via Flask-Limiter)
- JWT authentication
- CSRF protection

---

## 5. Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| Vite | 8.0 | Build tool & dev server |
| React Router | 7.17 | Client-side routing |
| Tailwind CSS | 3.4 | Utility-first styling |
| Framer Motion | 12.40 | Animations |
| GSAP | 3.15 | Splash/intro animations |
| Three.js | 0.184 | 3D rendering |
| Spline | 4.1 | 3D interactive scenes |
| Lenis | 1.3 | Smooth scrolling |
| Axios | 1.17 | HTTP client |
| Lucide React | 1.21 | Icon library |
| Radix UI | — | Headless UI primitives (Dialog, Label, Slot) |
| CVA + clsx | — | Component variants |
| Tailwind Merge | 3.6 | Class conflict resolution |
| TypeScript | 6.0 | Type safety (dev dependency) |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.11 | Runtime |
| Flask | 3.1 | Web framework |
| Gunicorn | 23.0 | WSGI server |
| SQLAlchemy | 2.0 | ORM |
| Alembic | 1.14 | DB migrations (reference only) |
| PostgreSQL 16 | — | Production database (Neon) |
| SQLite | — | Development/testing database |
| JWT (PyJWT) | 2.10 | Token auth |
| bcrypt | 4.3 | Password hashing |
| APScheduler | 3.11 | Background scheduler |
| OpenAI | 1.65 | LLM client |
| Google Auth | 2.38 | Google OAuth verification |
| Sentry SDK | 2.22 | Error monitoring |
| Razorpay | 1.4 | Payment processing |
| Flask-Limiter | 3.10 | Rate limiting |
| Flask-WTF | 1.2 | CSRF protection |
| python-dotenv | 1.1 | Env variable management |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Render | Hosting (backend Docker + frontend static) |
| Neon | Serverless PostgreSQL |
| Docker | Containerization |
| Nginx | Reverse proxy / static serving |
| Sentry | Error monitoring |
| Render Cron Jobs | 15-min pipeline trigger |

---

## 6. How It Was Built

### Development Phases

**Phase 1 — Foundation (Weeks 1-3)**
- Flask app setup with SQLAlchemy ORM
- PostgreSQL schema design (31 models)
- JWT authentication with Google OAuth
- Basic workspace CRUD
- Frontend scaffold with Vite + React + Tailwind

**Phase 2 — Core Features (Weeks 4-8)**
- Dashboard with real-time data aggregation
- Goal Cascade (hierarchical goals with progress)
- Kanban board with drag-and-drop
- Standup system (manual + auto-compiled)
- Activity compiler with integration framework

**Phase 3 — AI Integration (Weeks 9-12)**
- Pattern Engine: LLM-powered extraction pipeline
- Multi-provider LLM routing (Ollama, Groq, OpenRouter)
- AI standup rewriting
- Decision extraction from calendar events
- Meeting notes with AI summaries

**Phase 4 — Integrations (Weeks 13-18)**
- OAuth flows for 15+ providers
- Data fetching services with token refresh
- Activity event normalization
- Webhook support
- Rate limit handling per provider

**Phase 5 — Production Hardening (Weeks 19-22)**
- Docker containerization
- Render deployment configuration
- Neon PostgreSQL migration
- Error handling rewrite (all endpoints wrapped in try/except)
- Global CORS configuration
- Auto-migration for schema changes
- Health checks and monitoring
- Billing integration (Razorpay)

**Phase 6 — Polish (Weeks 23+)**
- Premium landing page redesign (Spline 3D scene)
- Japandi design system → Premium dark theme
- Floating glass cards, orbital rings, volumetric lighting
- Magnetic buttons, staggered animations, aurora backgrounds
- Performance optimization
- Testing infrastructure

### Key Architectural Decisions

1. **Flask blueprints** — each route group is modular, 41 blueprints
2. **No Alembic on production** — `db.create_all()` + ALTER TABLE via startup script
3. **Per-workspace compile lock** — prevents thundering herd on activity compiler
4. **Multi-provider LLM routing** — Ollama for dev, Groq for prod, OpenRouter fallback
5. **Background threads** — pipeline runs async on dashboard load
6. **Safe serialization** — `_safe_to_dict()` pattern prevents broken FK crashes
7. **Error boundary** — `@app.errorhandler(Exception)` catches all unhandled exceptions
8. **Static site deployment** — frontend built with Vite, served directly by Render

---

## 7. Deployment

### Production Environment

| Component | URL / Location | How It Runs |
|-----------|---------------|-------------|
| Frontend | https://foundesk.onrender.com | Vite build → Render static site |
| Backend | https://foundesk-backend.onrender.com | Docker container → Gunicorn WSGI |
| Database | Neon PostgreSQL (cloud) | Serverless, auto-scaling |
| Cron | Render Cron Job | Hits `/api/internal/run-pipeline` every 15 min |

### Deployment Flow
1. Push to `main` branch on GitHub
2. Render auto-detects changes via GitHub integration
3. Docker build runs for backend
4. Vite build runs for frontend
5. No database migrations run on startup

### Environment Variables
Key variables (set in Render dashboard):
- `DATABASE_URL` — Neon PostgreSQL connection string
- `SECRET_KEY` — JWT signing secret
- `FRONTEND_URL` — https://foundesk.onrender.com
- `GOOGLE_INTEGRATION_CLIENT_ID` / `SECRET` — Google OAuth
- `OPENROUTER_API_KEY` — LLM fallback provider
- `RAZORPAY_KEY_ID` / `SECRET` — Payment processing
- `ADMIN_API_TOKEN` — Admin endpoint protection
- `SENTRY_DSN` — Error monitoring (optional)
- `APP_ENV` — `production`
- `BILLING_ENFORCEMENT_ENABLED` — `false`
- `SKIP_SCHEDULER` — `1` (cron handles scheduling)

---

## 8. Database Schema (31 Tables)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| **User** | User accounts | email, name, google_id, avatar, token_version |
| **Workspace** | Startup workspace | name, stage, plan, subscription_status |
| **WorkspaceMember** | User-workspace membership | role, status, email |
| **Task** | Individual tasks | title, priority(P0-P3), status, deadline, goal_id |
| **Goal** | Monthly/weekly goals | title, goal_type, status, progress, parent_id |
| **Standup** | Daily standups | content, date, source, ai_rewritten |
| **Blocker** | Blocked items | description, severity, status, source_integration |
| **DecisionLog** | Tracked decisions | title, context, date, tags |
| **MeetingNotes** | Meeting records | title, content, date, participants |
| **ActivityEvent** | Unified activity feed | provider, event_type, title, external_timestamp |
| **FollowUp** | Follow-up tracking | contact, last_contact_date, status |
| **UserIntegration** | OAuth connections | provider, access_token, connected_email |
| **ApiKey** | Developer API keys | key_hash, name, permissions, last_used |
| **Invoice** | Billing records | amount, status, razorpay_id |
| **InAppNotification** | User notifications | type, message, read |
| **KnowledgeItem** | Knowledge base | title, content, source, tags |
| **RecurringWorkflow** | Scheduled automations | name, trigger, action, schedule |
| **RefreshToken** | JWT refresh tokens | token, expires_at, user_agent |
| + 13 more | Pattern engine, audit logs, etc. |

---

## 9. API Endpoints (41 Route Groups)

| Group | Base Path | Description |
|-------|-----------|-------------|
| `auth` | `/api/auth/google` | Google OAuth login |
| `users` | `/api/users` | User profile management |
| `workspaces` | `/api/workspaces` | Workspace CRUD |
| `dashboard` | `/api/dashboard` | Aggregated dashboard data |
| `tasks` | `/api/tasks` | Task CRUD |
| `goals` | `/api/goals` | Goal hierarchy management |
| `standups` | `/api/standups` | Daily standup submissions |
| `decisions` | `/api/decisions` | Decision log |
| `notes` | `/api/meeting-notes` | Meeting notes |
| `blockers` | `/api/blockers` | Blocker tracking |
| `follow-ups` | `/api/follow-ups` | Follow-up management |
| `notifications` | `/api/notifications` | In-app notifications |
| `integrations` | `/api/integrations` | OAuth connect/disconnect |
| `tracking` | `/api/track` | Analytics event tracking |
| `billing` | `/api/billing` | Subscription management |
| `developer` | `/api/developer` | API key management |
| `feed` | `/api/feed` | Activity feed |
| `memory` | `/api/memory` | Knowledge items |
| `briefing` | `/api/briefing` | Daily briefing |
| `calendar-defense` | `/api/calendar-defense` | Calendar conflict mgmt |
| `templates` | `/api/templates` | Phase/workflow templates |
| `ai` | `/api/ai` | AI layer queries |
| `knowledge` | `/api/knowledge` | Knowledge base |
| `team-space` | `/api/team-space` | Team collaboration |
| `pattern-engine` | `/api/pattern-engine` | Pipeline status |
| Internal | `/api/internal/run-pipeline` | Cron-triggered pipeline |
| Admin | `/api/admin/db-status` | DB inspection |
| Health | `/api/health` | Health check |
| + 15 integration routes | `/api/{provider}-data` | Per-provider data sync |

---

## 10. Integrations (22 Service Files)

Each integration service handles:
- OAuth token management (refresh, revoke)
- Data fetching (API calls with rate limiting)
- Response normalization (mapping provider data to ActivityEvent format)
- Error handling (per-provider try/except)

**Integration architecture:**
```
routes/{provider}_data.py → services/{provider}_service.py → Provider API
```

**Activity compiler orchestration:**
```
compiler.py → providers.py → {provider}_service.py
```

All 15 providers listed in Section 4.10.

---

## 11. Why FounDesk Matters

### For Startup Founders

1. **Save 5+ hours/week** — no more context switching between 15 tools
2. **Never miss a decision** — AI extracts and logs every decision from meetings
3. **Always know what matters** — Priority Signal Board surfaces blockers, conflicts, and overdue items
4. **Automated standups** — no manual updates, AI compiles from real activity
5. **Goal alignment** — every daily task rolls up to a weekly goal, which rolls up to a monthly goal
6. **One source of truth** — activity feed from all integrations in one timeline

### For Engineering Teams

1. **GitHub + Linear + Slack in one view** — no jumping between tools
2. **Blocker auto-detection** — PRs stuck for 24h+ surface automatically
3. **Code commit → standup** — commits automatically feed into daily standups
4. **PR review tracking** — activity compiler surfaces review requests and status

### The Competitive Difference

| Feature | FounDesk | Generic PM Tools |
|---------|----------|------------------|
| Integration depth | 15+ two-way syncs | Limited API connectors |
| AI extraction | Pattern Engine extracts tasks, decisions, blockers from any event | Basic NLP or none |
| Startup-specific | Goal Cascade, Standups, Calendar Defense for founders | Generic project management |
| Activity compiler | Cross-provider unified feed with dedup | Per-tool silos |
| Auto-migration | Schema adapts at startup without downtime | Manual migrations required |
| Error resilience | Every endpoint wrapped, global error handler | Standard error handling |

---

## 12. Target Audience

**Primary:** Startup founders (pre-seed to Series A) who:
- Run engineering-first companies
- Use 10+ SaaS tools
- Need daily/weekly operational clarity
- Want AI to handle the overhead of context switching

**Secondary:** Engineering leaders and technical co-founders who:
- Want automated standups
- Need blocker visibility
- Care about goal-task alignment
- Value integration depth over breadth

**Tertiary:** Small engineering teams (2-20 people) that:
- Use GitHub, Linear, Slack, Google Workspace
- Have outgrown manual tracking
- Need a single pane of glass

---

## 13. Current Status & Roadmap

### Done
- Complete backend with 41 route groups, 22 services, 31 models
- Pattern Engine with multi-provider LLM support
- Activity Compiler with 15+ provider fetch
- Premium landing page with Spline 3D scene
- Full auth system (Google OAuth, JWT, refresh tokens)
- Kanban board, Goal Cascade, Standups, Memory module
- Billing integration (Razorpay)
- Developer API with key management
- Production deployment on Render + Neon

### In Progress / Planned
- Landing page hero section refinement (3D robot, orbital rings, volumetric lighting)
- AI briefing enhancements
- Mobile responsiveness improvements
- Performance optimization (chunk splitting, lazy loading)
- Testing coverage expansion

---

*Document prepared July 2026. For the latest status, visit https://foundesk.onrender.com or check the GitHub repository.*