# Migration Guide — v1.0.0-rc.1

This guide covers migrating from pre-release versions of FounDesk to v1.0.0-rc.1.

---

## Database Migration Steps

### 1. Back Up Your Existing Data

```bash
# If using PostgreSQL
pg_dump -h localhost -U postgres foundesk_db > foundesk_backup_$(date +%Y%m%d).sql

# If using SQLite
cp foundesk.db foundesk_backup_$(date +%Y%m%d).db
```

### 2. Update Database URL

Ensure your `.env` file has the correct `DATABASE_URL`:

```bash
# PostgreSQL (production)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/foundesk_db

# SQLite (development)
DATABASE_URL=sqlite:///foundesk.db
```

### 3. Run Alembic Migrations

```bash
cd backend
alembic upgrade head
```

The migration system handles schema changes including new columns and tables. The application also includes an auto-migration step on startup for any missing columns.

### 4. Verify Migration

```bash
# Check database tables and row counts
curl -H "X-Admin-Token: your-token" http://localhost:5000/api/admin/db-status
```

Expected tables: users, workspaces, workspace_members, tasks, goals, goal_decisions, standups, meeting_notes, decision_logs, blockers, follow_ups, knowledge_items, raw_events, activity_events, chronicle_events, user_integrations, and more.

---

## Configuration Changes

### New Required Environment Variables

| Variable | Notes |
|----------|-------|
| `SECRET_KEY` | Must be set to a secure random string |
| `DATABASE_URL` | Connection string for your database |
| `GOOGLE_INTEGRATION_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_INTEGRATION_CLIENT_SECRET` | Google OAuth client secret |

### Deprecated Variables

| Old Variable | Replacement |
|-------------|-------------|
| `FLASK_SECRET_KEY` | `SECRET_KEY` |
| `DB_URL` | `DATABASE_URL` |
| `GOOGLE_CLIENT_ID` | `GOOGLE_INTEGRATION_CLIENT_ID` |
| `GOOGLE_CLIENT_SECRET` | `GOOGLE_INTEGRATION_CLIENT_SECRET` |

### New Variables for Production

```bash
APP_ENV=production
SKIP_SCHEDULER=1              # Use external cron instead of APScheduler
LLM_DAILY_LIMIT=500           # Adjust based on your LLM budget
FRONTEND_URL=https://your-domain.com
BILLING_ENFORCEMENT_ENABLED=true
```

---

## API Changes

### New Prefix

All API endpoints now use the `/api/` prefix:

| Endpoint | Old Path | New Path |
|----------|----------|----------|
| Tasks | `/tasks` | `/api/tasks` |
| Goals | `/goals` | `/api/goals` |
| Standups | `/standups` | `/api/standups` |
| Decisions | `/decisions` | `/api/decisions` |
| Meeting Notes | `/notes` | `/api/meeting-notes` |
| Blockers | `/blockers` | `/api/blockers` |

### Authentication

```bash
# OLD: Token-based auth
POST /auth/google { token: "..." }

# NEW: Same endpoint, but now requires GOOGLE_INTEGRATION_CLIENT_ID
POST /auth/google { token: "..." }
```

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/db-status` | Database table status (admin token required) |
| GET | `/api/admin/llm-usage` | Daily LLM usage statistics |
| POST | `/api/internal/run-pipeline` | Trigger pattern engine pipeline |
| GET | `/api/health/ready` | Readiness check with database connectivity |
| GET | `/api/health/live` | Liveness check |

---

## Data Migration (JSON Snapshots to Database)

If you have existing data in JSON snapshot files (`goals.json`, `dash.json`, `briefing.json`, etc.):

### 1. Check Existing Snapshots

```bash
ls *.json  # Look for snapshot files in project root
```

### 2. Import Snapshots to Database

The system does not include an automated import script. Manual steps:

1. Start the application to initialize the database schema
2. Write a one-time script to read JSON files and insert via the API

Example Python import script:

```python
import json
import requests

API_BASE = "http://localhost:5000/api"
TOKEN = "your-auth-token"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Import goals
with open("goals.json") as f:
    goals = json.load(f)
    for goal in goals:
        requests.post(f"{API_BASE}/goals", json=goal, headers=HEADERS)
```

### 3. Verify Import

Use the admin endpoint to verify row counts:
```bash
curl -H "X-Admin-Token: your-token" http://localhost:5000/api/admin/db-status
```

---

## Verification Steps

### 1. Health Check

```bash
curl http://localhost:5000/api/health
# Expected: {"status":"ok","uptime":...,"service":"foundesk-api"}
```

### 2. Database Connectivity

```bash
curl http://localhost:5000/api/health/ready
# Expected: {"status":"ready","database":"connected"}
```

### 3. Authentication

Test the OAuth flow by navigating to `http://localhost:5173/login` and signing in with Google.

### 4. Core Features

Verify each major feature:

- **Dashboard**: Loads without errors, shows activity feed
- **Kanban**: Tasks display in correct columns, drag-and-drop works
- **Goals**: Goal hierarchy renders, progress bars show
- **Standups**: Daily standup compiles and displays
- **Blockers**: Blocker panel shows open blockers
- **Integrations**: Connected integrations show in Settings

### 5. Pattern Engine (if enabled)

```bash
curl -X POST -H "X-Admin-Token: your-token" http://localhost:5000/api/internal/run-pipeline
# Expected: {"status":"accepted"}
```

---

## Rollback

If migration fails:

```bash
# 1. Stop the application
docker-compose down

# 2. Restore database from backup
psql -h localhost -U postgres foundesk_db < foundesk_backup.sql

# 3. Checkout previous version
git checkout <previous-tag>

# 4. Restart
docker compose -f infra/docker-compose.yml up -d
```
