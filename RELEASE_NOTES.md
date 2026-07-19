# Release Notes — v1.0.0-rc.1

**Release Date:** July 19, 2026

---

## Overview

FounDesk v1.0.0-rc.1 is the first release candidate of the intelligent workspace coordinator for startup founders. This release represents the culmination of the initial development phase, delivering a comprehensive platform that integrates task management, goal tracking, AI-powered daily standups, 15+ external integrations, and intelligent pattern recognition into a unified experience.

---

## What's New

### Core Platform
- Complete Flask backend with 40+ API route blueprints serving a React 19 frontend
- SQLAlchemy ORM with 31 models and Alembic migration framework
- PostgreSQL 16 production support with SQLite development fallback

### Task Management
- Full Kanban board with drag-and-drop across 5 columns
- List view with inline editing, bulk operations, and advanced filtering
- Priority system (P0–P3) with visual badges and phase tagging
- Source tracking across Linear, Trello, Asana, Monday.com, and manual creation

### Goal Cascade
- Hierarchical goal system (monthly → weekly → daily) with self-referential tree
- Server-side progress computation with auto-status updates
- At-risk detection using deadline proximity and task completion heuristics
- Progress trend analysis (accelerating, stalling, steady)

### AI-Powered Daily Standups
- Deterministic compiler that selects 43 records across 6 categories — zero LLM involvement
- LLM rewrite for natural language summaries (2–4 sentences)
- 5-section card design with date navigation and non-responder detection
- Automatic standup creation from integration events

### Pattern Engine
- Multi-stage AI pipeline with 32+ processing stages
- LLM-based extraction of tasks, decisions, meetings, and knowledge from raw events
- Multi-tier LLM routing (Ollama → Groq → OpenRouter) with quota management
- Intelligent deduplication (exact, similarity, previously-dismissed)
- Promotional content filtering and noise reduction

### Integrations (15)
Google (Gmail, Calendar, Docs, Analytics), Linear, Trello, Asana, Monday.com, GitHub, Slack, Notion, HubSpot, Pipedrive, Calendly, Mixpanel, Amplitude, PostHog, Zoho CRM

### Additional Features
- Memory module with meeting notes, decision logs, and knowledge items
- Blockers panel with severity tracking and resolution management
- Calendar defense for focus time protection
- Activity feed with 30+ event types
- Razorpay billing integration with trial management
- Developer API with key management and audit logging
- Sentry error monitoring (opt-in)

---

## Breaking Changes

- **Database migration required**: All data must be migrated from JSON snapshots to PostgreSQL. See [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md) for details.
- **Environment variables restructured**: All configuration is now via `.env` file. Previous configuration methods are deprecated.
- **API endpoint changes**: All endpoints are now under `/api/` prefix. Old endpoint paths are not supported.
- **OAuth flow updated**: Google OAuth now requires the integration client ID. Previous token-based auth is deprecated.

---

## Bug Fixes

- Cross-source duplicate detection for meeting notes
- Deadlock handling in pattern engine pipeline with exponential backoff retry
- Non-responder detection in daily standups
- CORS configuration for cross-origin requests in production
- Token refresh and session persistence across page reloads
- Empty state handling for all data views
- Rate limiting edge cases on authentication endpoints

---

## Performance Improvements

- Server-side goal progress computation (eliminates client-side prompts)
- Database connection pooling with pre-ping and recycle configuration
- Lazy-loaded frontend components with Suspense boundaries
- Optimistic UI updates for task status changes
- Efficient raw event processing with batch operations
- LLM quota management to prevent API cost overruns

---

## Known Issues

1. **Task–Goal linking**: 0 tasks are currently linked to goals in the database. Tasks need to be re-connected to the goal cascade for progress tracking to reflect real task completion.
2. **Migration framework**: Schema management uses ad-hoc ALTER TABLE scripts in `app.py` rather than full Alembic flow for some columns. All new migrations should use Alembic exclusively.
3. **Scheduler in production**: The built-in APScheduler is disabled in production (`SKIP_SCHEDULER=1`). An external cron-based trigger should be configured for the pattern engine pipeline.
4. **Ollama dependency**: Local LLM inference requires Ollama with Qwen 2.5 7B. Without it, the system falls back to Groq/OpenRouter which may have associated costs.
5. **No automated backups**: The deployment does not include automated database backup scripts. Administrators should configure their own backup strategy.

---

## Contributors

- **Tharun Prasad** — Lead developer, architecture, backend, frontend, AI pipeline
- Open source contributors and community members

---

## Links

- **Documentation**: [README.md](README.md)
- **Migration Guide**: [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Issue Tracker**: [GitHub Issues](https://github.com/your-org/foundesk/issues)
