# Changelog

All notable changes to FounDesk are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc.1] — 2026-07-19

### Added

#### Core Platform
- Flask backend with 40+ route blueprints covering all major features
- React 19 frontend with Vite 8, Tailwind CSS, and Framer Motion
- SQLAlchemy ORM with 31 models and Alembic migration framework
- PostgreSQL 16 production support with SQLite development fallback
- Google OAuth 2.0 authentication with JWT session management

#### Task Management
- Kanban board with drag-and-drop across 5 columns (Not Started, In Progress, Blocked, Done, Cancelled)
- List view with flat table, bulk operations, and inline editing
- Task filtering by status, priority, phase tag, assignee, and goal
- Priority system (P0–P3) with visual badges
- Sub-tasks, phase tags, and source tracking
- 75+ tasks synced from Linear, Trello, Asana, Monday.com

#### Goal Cascade
- Hierarchical goals (monthly → weekly → daily) with self-referential tree
- Progress computation (server-side) with percentage and task counting
- At-risk detection with overdue, stalled, and no-progress heuristics
- Progress trend analysis (accelerating, stalling, steady)
- Smart sorting (at-risk first, then by deadline)
- Source badge mapping (manual, meeting, AI, integration)

#### Daily Standups
- AI-powered daily standup compilation from 6 data categories
- Deterministic compiler (`_compile_daily_briefing`) with zero LLM involvement
- LLM rewrite of standup narratives (2–4 sentence summaries)
- 5-section card design (AI Summary, Yesterday, Today, Risks, Business)
- Date navigation with relative labels and "Back to Today"
- Non-responder detection and automatic standup creation
- Cross-linking standup blockers to blocker records

#### Pattern Engine
- AI pipeline with multi-stage processing (32+ stages)
- Raw event ingestion from 15+ integration providers
- LLM-powered extraction of tasks, decisions, meetings, knowledge
- Deduplication (exact, similarity, and previously dismissed)
- Tagging, classification, and promotional content filtering
- LLM client with multi-tier routing (Ollama → Groq → OpenRouter)
- Quota management and daily limits
- Deadlock retry logic with exponential backoff
- Scheduler for automated pipeline execution

#### Integrations (15 Connected)
- Google (Gmail, Calendar, Docs, Analytics) — OAuth
- Linear — OAuth with full sync
- Trello — API token sync
- Asana — OAuth sync
- Monday.com — OAuth sync
- GitHub — OAuth with event processing
- Slack — OAuth with message parsing
- Notion — API token integration
- HubSpot — CRM deal tracking
- Pipedrive — CRM pipeline management
- Calendly — Meeting scheduling sync
- Mixpanel, Amplitude, PostHog — Analytics integration
- Zoho CRM — API connection

#### Memory Module
- Meeting notes with AI extraction and classification
- Decision logs with confidence scoring and enrichment
- Knowledge items with staleness detection
- Cross-module linking (meetings → decisions → tasks)
- Chronicle events for activity history

#### Blockers Panel
- Blocker tracking with severity levels (high/medium/low)
- Automatic resolution detection
- Fallback synthesis from stalled blocked tasks
- Standup blocker cross-linking

#### Dashboard & Analytics
- Central dashboard with KPIs and activity feed
- Amplitude analytics integration
- Activity feed compiler with 30+ event types

#### Billing
- Razorpay subscription integration
- Trial management (14-day default)
- Starter plan with plan management
- Webhook handling for payment events

#### Developer API
- RESTful API with admin endpoints
- API key management with audit logging
- Pipeline trigger endpoints
- DB status monitoring

#### Infrastructure
- Docker Compose with PostgreSQL, backend, and frontend services
- Dockerfiles with multi-stage builds and health checks
- Nginx configuration for frontend serving
- Gunicorn with Gevent workers for production
- Sentry error monitoring (opt-in)

### Changed
- Consolidated project structure into `backend/` and `frontend/` directories
- Migrated from JSON snapshot storage to live PostgreSQL database
- Replaced manual progress prompts with server-side computation
- Improved goal cascade with at-risk detection and progress trends
- Redesigned standup cards with 5 expandable sections
- Enhanced Kanban with drag-and-drop and visual priority badges

### Fixed
- Cross-source duplicate detection for meeting notes
- Deadlock handling in pattern engine pipeline
- Non-responder detection in daily standups
- CORS configuration for production environments
- Token refresh and session management

### Security
- JWT-based API authentication with token versioning
- Rate limiting on authentication endpoints
- CSRF protection enabled
- CORS restricted to frontend origin
- Admin API token for privileged operations
- Non-root user in Docker containers
- Environment variable validation on startup

### Production Hardening
- Phase 1: Foundational API hardening — error handling, input validation, logging
- Phase 2: Security & rate limiting — JWT enforcement, CORS, CSRF
- Phase 3: Database hardening — connection pooling, migrations, auto-migration
- Phase 4: Frontend hardening — lazy loading, error boundaries, build optimization
- Phase 5: Backend hardening — Sentry, health checks, graceful degradation
- Phase 6: Docker & deployment — multi-stage builds, health checks, Docker Compose
- Phase 7: Monitoring & logging — structured logging, error tracking, LLM usage monitoring
- Phase 8: Testing & CI/CD — Playwright E2E tests, linting, build validation
- Phase 9: Repository standardization — comprehensive documentation
- Phase 10: Final release preparation — release notes, migration guide, checklists
