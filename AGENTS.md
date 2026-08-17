# FounDesk — Agent & Contributor Guide

This file documents everything a new developer (or AI agent like Antigravity) needs to know to continue working on FounDesk without breaking production. Read this **before** making any changes.

---

## 1. Architecture Overview

```
Frontend (React/Vite)           Backend (Flask/Python)          Database
https://foundesk.onrender.com → https://foundesk-backend.onrender.com → Neon PostgreSQL
         │                              │
         └── SPA served by Render       └── Gunicorn WSGI in Docker
             static service                 No migrations at startup
```

### Services (render.yaml)
| Service | Type | URL |
|---------|------|-----|
| Backend | Docker (Flask + Gunicorn) | `https://foundesk-backend.onrender.com` |
| Frontend | Static site (Vite build) | `https://foundesk.onrender.com` |
| Database | Neon PostgreSQL | `postgresql://neondb_owner:...@ep-soft-heart-...neon.tech/neondb` |
| Cron Job | Render Cron Job | Hits `/api/internal/run-pipeline` every 15 min |

---

## 2. 🔴 CRITICAL: Neon DB Schema Management

**The Neon database was created by `db.create_all()` from the model definitions — NOT by Alembic migrations.**

This means:
- When you add a new column to a model, `db.create_all()` does NOT add it to the existing Neon DB — it only creates tables that don't exist yet.
- If you add a column to the SQLAlchemy model, **every SELECT query on that table will crash** with:
  ```
  column "xxx" of relation "table_name" does not exist
  ```
- The Alembic migration files exist in `backend/alembic/versions/` but they have **never been run** on Neon. The `Dockerfile` starts gunicorn directly — no `alembic upgrade head`.

### How to safely add a column to Neon

```python
# Option 1: Use raw SQL (simplest for small changes)
# In a migration script or one-time execution:
ALTER TABLE workspace_members ADD COLUMN invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

# Option 2: Add to model + add to db.create_all() flow
# Then run db.create_all() which will skip existing tables but... won't add the column
# to existing tables. You still need ALTER TABLE.

# Option 3: Set up proper Alembic on Neon
# 1. alembic stamp head  (marks current state)
# 2. Add column to model
# 3. alembic autogenerate  (creates migration)
# 4. alembic upgrade head  (runs on Neon)
```

---

## 3. 🔴 Lessons Learned (What Broke Production)

### Mistake #1: Adding `invited_by` to WorkspaceMember model
**What happened:** We added `invited_by = db.Column(...)` to `models/workspace_member.py`. SQLAlchemy then generated `SELECT invited_by FROM workspace_members` on EVERY query. Neon didn't have this column → **every endpoint crashed with 500**.

**Affected endpoints:** ALL of them. `GET /api/workspaces`, `GET /api/dashboard`, `GET /api/notifications` — anything that queried `WorkspaceMember` (which is almost everything via `get_current_workspace_id()`).

**Fix:** Removed the column from the model. Used `getattr(member, 'invited_by', None)` as a safety net.

**Rule:** Never add a column to an existing model without ALTER TABLE on Neon first.

### Mistake #2: Adding `alembic upgrade head` to Dockerfile CMD
**What happened:** Changed `CMD ["gunicorn", ...]` to `CMD alembic upgrade head && gunicorn ...`. On build, `alembic upgrade head` tried to `CREATE TABLE users` — but the table already exists → **deploy failed, container never started**.

**Fix:** Reverted Dockerfile CMD back to plain `CMD ["gunicorn", ...]`.

**Rule:** The Dockerfile should ONLY start gunicorn. Never run Alembic migrations on startup.

---

## 4. All Production Bugs Fixed (This Session)

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `POST /api/track` 500 | `request.get_json()` returns `None` on non-JSON content-type, `data.get("event")` crashes | `request.get_json(silent=True)` guard + per-provider try/except |
| `GET /api/decisions` 502 | `selectinload` crashes on broken FK relationships; `d.to_dict()` fails on None | Global try/except + `_safe_to_dict()` serializer |
| `GET /api/pipeline/status` 502 | `LLMUsageLog.query` crashes if table doesn't exist | Every query in its own try/except |
| `GET /api/notifications` 502 | Unhandled exception in unauthenticated flow | Global try/except |
| `GET /api/notes` 502 | `n.to_dict()` crashes on broken relationships | Per-note safe serialization + try/except |
| Goals page infinite loading | `(t.completed_at or t.updated_at) >= datetime.utcnow()` crashes when both are None | None guard + timezone-safe comparison |
| Compiler lock crash | `release()` called on unacquired `asyncio.Lock` | `lock_acquired` flag — only release if acquired |
| Pipeline picked up other workspaces' events | `_unprocessed_events_for_workspace` filtered globally, not by workspace | Match `RawEvent.source_id` against that workspace's `activity_events` ids |
| Pipeline re-polled terminal events forever | Events kept `processing`/`pending` after their stage ran | `_drain_noise_events` finalizes `done/skipped/failed` events older than lock TTL; also finalizes analytics (amplitude/mixpanel/posthog) events that no AI stage consumes |
| `import os` missing in followups.py / blockers.py | `os.environ` used without import → NameError, stages died silently | Added `import os` to both |
| LLM person_name = "Unknown" for Gmail | LLM prompt had no actor/from | Prepend `From: {actor}` to the LLM event text in follow-up + decision inference |
| Analytics noise starved AI batch | decision/knowledge candidates sliced by count before filtering noise | Pre-filter candidates (exclude ANALYTICS/TASK_ONLY/MEETING_ONLY sources, require title/details) before `[:N]` slicing |
| Duplicate follow-ups per event | no dedup check on `(workspace_id, source, source_event_id)` | Skip if a FollowUp already exists for that raw event |
| GitHub hardcoded date | `2026-01-01` would stop returning results in Jan 2026 | Changed to `30 days ago` relative date |
| Calendly timestamp parse | `.split("+")[0]` truncates timezone info | `fromisoformat` + proper UTC conversion |
| Zoho debug leaks | `validate_zoho_token()` prints full URL + response body | Removed all 3 print() statements |
| Trello debug prints | 8 print() statements in production code | Removed all |
| `decision_engine.py` timezone | Naive vs aware datetime comparison raises TypeError | Proper UTC conversion before comparison |
| Global 502/CORS | Any unhandled exception returns HTML → Render nginx strips CORS headers | `@app.errorhandler(Exception)` catches ALL routes, returns JSON |

### Key pattern added to every vulnerable endpoint:
```python
import traceback
try:
    # ... endpoint logic ...
except Exception as e:
    print(f"GET /xxx error: {e}\n{traceback.format_exc()}")
    return jsonify({"error": "Failed to ...", "message": str(e)}), 500
```

### Global safety net (app.py):
```python
@app.errorhandler(Exception)
def handle_all_exceptions(e):
    import traceback
    print(f"Unhandled exception: {e}\n{traceback.format_exc()}")
    return jsonify({"error": "Internal server error", "message": str(e)}), 500
```

---

## 5. Deployment

### How to deploy
1. Changes are committed to `main` branch on GitHub
2. Render auto-deploys from `main` (via GitHub integration)
3. Docker build runs, then `CMD ["gunicorn", ...]` starts the app
4. No database migrations run on startup

### To trigger a manual deploy
```
git commit --allow-empty -m "trigger redeploy"
git push origin main
```
Or use Render Dashboard → foundesk-backend → Manual Deploy → Deploy latest commit

### Verify deployment
1. Check `https://foundesk-backend.onrender.com/api/health` → should return 200 JSON
2. Check Render dashboard → deploy should show "Live" green status
3. Frontend at `https://foundesk.onrender.com` → open browser console → no 500 or CORS errors

### Environment variables (set in render.yaml or Render dashboard)
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon PostgreSQL URL (set in Render dashboard, not in render.yaml) |
| `SECRET_KEY` | Set in Render dashboard |
| `FRONTEND_URL` | `https://foundesk.onrender.com` |
| `APP_ENV` | `production` |
| `BILLING_ENFORCEMENT_ENABLED` | `false` |
| `SKIP_SCHEDULER` | `1` (cron job handles scheduling) |

---

## 6. CORS Configuration

CORS is handled **manually** (not via flask-cors library) in `backend/app.py`:

```python
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://foundesk.onrender.com")
CORS_ORIGINS = [FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"]

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        origin = request.headers.get("Origin")
        if origin and origin in CORS_ORIGINS:
            response = jsonify({"status": "ok"})
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRFToken, X-Workspace-ID"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            return response

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin and origin in CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        ...
    return response
```

**CORS errors = backend crash.** If the backend throws an unhandled exception, Flask's error handler returns HTML (without CORS headers). The browser sees a missing `Access-Control-Allow-Origin` header and blocks the request. Fix the backend crash, and CORS follows automatically.

---

## 7. Key Files

| File | Purpose |
|------|---------|
| `backend/app.py` | Flask app factory, global error handlers, CORS config, blueprint registration |
| `backend/Dockerfile` | Container: installs deps, starts gunicorn (NO migrations) |
| `backend/render.yaml` | Render service definitions (backend Docker, frontend static, env vars) |
| `backend/models/workspace_member.py` | **WARNING:** Do NOT add columns here without ALTER TABLE on Neon |
| `backend/routes/tracking.py` | Analytics tracking — must NEVER break UI (silent failure) |
| `backend/routes/decisions.py` | Uses `_safe_to_dict()` pattern for resilient serialization |
| `backend/services/activity_compiler/compiler.py` | Activity compiler with per-workspace lock (lock_acquired flag) |
| `backend/services/activity_compiler/providers.py` | Provider integrations (GitHub, Calendly, etc.) — date handling fixes |
| `backend/services/zoho_service.py` | Zoho integration — no print() statements |
| `backend/alembic/env.py` | Supports `DATABASE_URL` env var override |
| `backend/alembic/versions/` | Migration files (not used on Neon, kept for reference) |
| `backend/config/database.py` | SQLAlchemy init — `init_db()` does NOT call `create_all()` |
| `backend/utils/auth.py` | JWT token verification + billing enforcement |
| `backend/utils/workspace_auth.py` | `get_current_workspace_id()` — queries WorkspaceMember |

---

## 8. DO NOT DO List

1. **Do NOT add columns to existing models** without running `ALTER TABLE` on Neon first. SQLAlchemy will include the column in SELECT queries and crash.

2. **Do NOT add `alembic upgrade head` to Dockerfile CMD.** The Neon DB already has all tables. Migrations have never been run on it. This will crash with "relation already exists".

3. **Do NOT assume `request.get_json()` returns a dict.** It returns `None` if Content-Type is not `application/json`. Always use `request.get_json(silent=True)` or wrap in try/except.

4. **Do NOT compare naive and aware datetimes.** `datetime.utcnow()` returns naive; PostgreSQL returns aware. Use `.replace(tzinfo=None)` or `.astimezone(timezone.utc)`.

5. **Do NOT use `print()` for debugging in production code.** It leaks to stdout and can expose sensitive data. Use `logging` or remove before committing.

6. **Do NOT let analytics failures break the UI.** Every analytics/tracking call must be wrapped in try/except with silent failure.

7. **Do NOT return HTML from API endpoints.** Every endpoint must return `jsonify(...)`. The global `@app.errorhandler(Exception)` catches anything missed.

---

## 9. How to Test Locally

```bash
cd backend
python -m pytest tests/ -v    # 14 tests should pass
```

The tests use an in-memory SQLite database. They test:
- Auth (signup, login, validation)
- Health endpoints
- Model creation (User, Workspace, WorkspaceMember)
- Workspace API (unauthenticated access)

---

## 10. Cron Job

A Render Cron Job runs every 15 minutes and hits:
```
GET /api/internal/run-pipeline
```

This triggers the pattern engine to process new raw events. The pipeline is also triggered on dashboard load (via background thread in dashboard endpoint).

---

## 11. Common Console Errors & Their Fixes

| Console Error | Likely Cause | Fix |
|---------------|-------------|-----|
| `Failed to load resource: 500 ()` | Backend exception — check Render logs | Add try/except to the failing endpoint |
| `CORS policy: No 'Access-Control-Allow-Origin'` | Backend crashed before returning response — nginx returns error without CORS | Fix the backend crash, not the CORS config |
| `Failed to fetch notifications: 500` | `InAppNotification` or `WorkspaceMember` query failed | Check if model has columns that don't exist in Neon |
| `POST /api/track 500` | Analytics crash — should be fixed (see tracking.py) | If new, check `request.get_json(silent=True)` |
| `Dashboard fetch error: 500` | Dashboard endpoint crashed | Check `get_current_workspace_id()` → WorkspaceMember query |
