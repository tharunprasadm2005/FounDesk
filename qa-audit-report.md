# FounDesk — Complete QA & Data Audit Report

**Date:** 2026-07-19  
**Scope:** Full-stack audit: Frontend (React) → Backend (Flask) → Database (PostgreSQL) → Integrations (19 providers)  
**Environment:** Production (Render)  
**Auditor:** QA Lead & Data Auditor

---

# 1. Landing Page

| Metric | Value |
|---|---|
| **Purpose** | Marketing landing, waitlist signup |
| **Route** | `/` |
| **Component** | `frontend/src/pages/Landing.jsx` |
| **Backend APIs** | `POST /api/waitlist` |
| **DB tables** | `waitlist` |
| **Integrations** | None |

### API Test

| API | Method | Live Status | Response Time | Notes |
|---|---|---|---|---|
| `/api/waitlist` | POST | **400 Bad Request** | 1.22s | Server rejects empty/invalid JSON body. Needs `{"email":"..."}`. |

### Widgets

| Widget | API | Datasource | Expected | Actual | Status |
|---|---|---|---|---|---|
| Waitlist form | `POST /api/waitlist` | `waitlist` table | 201 Created | 400 Bad Request | ❌ Broken |

---

# 2. Login / Auth Page

| Metric | Value |
|---|---|
| **Purpose** | User authentication (Google OAuth, email/password) |
| **Route** | `/login` |
| **Component** | `frontend/src/pages/Login.jsx` |
| **Backend APIs** | `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/forgot-password`, `POST /auth/google`, `POST /api/auth/refresh` |
| **DB tables** | `users`, `refresh_tokens` |
| **Integrations** | Google OAuth |

### API Test

| API | Method | Live Status | Response Time | Notes |
|---|---|---|---|---|
| `/api/auth/login` | POST | ❓ Untested (needs valid body) | — | — |
| `/api/auth/signup` | POST | ❓ Untested | — | — |
| `/auth/google` | POST | ❓ Untested (needs Google token) | — | — |
| `/api/auth/refresh` | POST | ❓ Untested | — | — |

### BUG: Auth endpoint inconsistency

`POST /auth/google` (no `/api` prefix) is defined directly on `app.py` line 272. All other auth endpoints use `/api/auth/...` prefix via blueprint. The frontend `App.jsx` calls `${API_BASE_URL}/auth/google` (direct axios, not api instance) which is correct. However `GoogleCallback.jsx` calls `api.post("/auth/google")` which resolves to `https://foundesk-backend.onrender.com/auth/google` — also correct because `api` instance baseURL is the backend URL. **Status: Working correctly despite inconsistency.**

---

# 3. Dashboard Page

| Metric | Value |
|---|---|
| **Purpose** | Main command center — goals, tasks, calendar, blockers, velocity, decisions |
| **Route** | `/dashboard` |
| **Component** | `frontend/src/pages/Dashboard.jsx` + `frontend/src/components/Sidebar.jsx` |
| **Backend APIs** | `GET /api/dashboard`, `GET /api/workspaces`, `GET /api/notifications?per_page=15` |
| **DB tables** | `goals`, `tasks`, `blockers`, `follow_ups`, `meeting_notes`, `decision_logs`, `activity_events`, `knowledge_items`, `user_integrations`, `workspace_members`, `workspaces` |
| **Integrations (dashboard widgets)** | Google Calendar, Google Analytics, (all integrations appear in digest) |

### Apps Used By Dashboard

| Integration | Required | Connected (Production) | Data Shown |
|---|---|---|---|
| Google Calendar | Yes | ❓ Unknown | Calendar conflicts today |
| Google Analytics | Yes | ❓ Unknown | N/A (not shown on dashboard) |
| GitHub | Optional | ❓ Unknown | Activity feed |
| Slack | Optional | ❓ Unknown | Activity feed |
| Monday.com | Optional | ❓ Unknown | Activity feed |
| Trello | Optional | ❓ Unknown | Activity feed |
| Asana | Optional | ❓ Unknown | Activity feed |
| Notion | Optional | ❓ Unknown | Activity feed |
| HubSpot | Optional | ❓ Unknown | Activity feed |
| Pipedrive | Optional | ❓ Unknown | Activity feed |
| Zoho CRM | Optional | ❓ Unknown | Activity feed |
| Calendly | Optional | ❓ Unknown | Activity feed |
| Linear | Optional | ❓ Unknown | Activity feed |
| Mixpanel | No (write-only) | ❓ Unknown | None on dashboard |
| Amplitude | No (write-only) | ❓ Unknown | None on dashboard |
| PostHog | No (write-only) | ❓ Unknown | None on dashboard |
| **Expected integrations** | **16** | | |
| **Data-providing integrations** | **13** | | |

### Widgets — Command Strip (Zone 1)

| Widget | API | Datasource | Expected Records | Actual (Live) | Status |
|---|---|---|---|---|---|
| Active Goal | `GET /api/dashboard` → `command_strip.active_goal` | `goals` table | 1 active weekly/monthly goal | ❓ Auth required | ❓ |
| Top Tasks (P0/P1) | `GET /api/dashboard` → `command_strip.top_tasks` | `tasks` table | 0-5 P0/P1 tasks | ❓ Auth required | ❓ |
| Calendar Conflicts | `GET /api/dashboard` → `command_strip.calendar_conflicts` | Google Calendar API | Today's events | ❓ Auth + Google required | ❓ |

### Widgets — Signal Board (Zone 2)

| Widget | API | Datasource | Expected Records | Actual (Live) | Status |
|---|---|---|---|---|---|
| Blockers | `GET /api/dashboard` → `signal_board.blockers` | `blockers` table | Open blockers | ❓ Auth required | ❓ |
| Overdue Follow-ups | `GET /api/dashboard` → `signal_board.overdue_followups` | `follow_ups` table | Pending follow-ups past due | ❓ Auth required | ❓ |
| Inferred Decisions | `GET /api/dashboard` → `signal_board.inferred_decisions` | `tasks` + `meeting_notes` | Decisions from completed tasks/meetings | ❓ Auth required | ❓ |
| Active Task Count | `GET /api/dashboard` → `signal_board.active_task_count` | `tasks` table | Tasks not Done/Cancelled | ❓ Auth required | ❓ |
| P0/P1 Counts | `GET /api/dashboard` → `signal_board.p0_count / p1_count` | `tasks` table | Tasks by priority | ❓ Auth required | ❓ |
| Completed This Week | `GET /api/dashboard` → `signal_board.completed_this_week` | `tasks` table | Tasks completed in last 7 days | ❓ Auth required | ❓ |
| Velocity Chart | `GET /api/dashboard` → `signal_board.completion_data_points` | `tasks` table | 7 data points (daily completed counts) | ❓ Auth required | ❓ |

### Widgets — Sidebar (Zone 3)

| Widget | API | Datasource | Expected Records | Actual (Live) | Status |
|---|---|---|---|---|---|
| Today's Meetings | `GET /api/dashboard` → `sidebar.todays_meetings` | `meeting_notes` table | Today's meetings | ❓ Auth required | ❓ |
| Recent Decisions | `GET /api/dashboard` → `sidebar.recent_decisions` | `decision_logs` table | 3 most recent decisions | ❓ Auth required | ❓ |
| Integration Digest | `GET /api/dashboard` → `sidebar.integration_digest` | `activity_events` table | Activity counts by provider (24h) | ❓ Auth required | ❓ |

### Attention Digest (Zone 4)

| KPI | Formula | Source | Expected Value | Actual | Status |
|---|---|---|---|---|---|
| Goals at Risk | `COUNT(goals WHERE status='at_risk')` | `goals` | Varies by workspace | ❓ | ❓ |
| Tasks Overdue | `COUNT(tasks WHERE deadline < now, not Done)` | `tasks` | Varies | ❓ | ❓ |
| Critical Follow-ups | `COUNT(follow_ups WHERE status='pending' AND priority IN ('critical','high'))` | `follow_ups` | Varies | ❓ | ❓ |
| Old Blockers | `COUNT(blockers WHERE status='open' AND created < 7d ago)` | `blockers` | Varies | ❓ | ❓ |
| Knowledge Needs Review | `COUNT(knowledge_items WHERE review_flag='needs_review')` | `knowledge_items` | Varies | ❓ | ❓ |

### Bug: Dashboard endpoint makes Google Calendar API call inline

**Severity: Medium**  
**File:** `backend/routes/dashboard.py:91-121`  
**Issue:** Dashboard fetches Google Calendar events synchronously inside the request handler. If the Google Calendar API is slow or returns an error, the entire dashboard request is delayed or fails. While wrapped in try/except, a slow response (>5s timeout set) can delay the dashboard load and cause gunicorn timeout on free tier.

**Fix:** Move Google Calendar fetch to background thread (same pattern as activity compiler).

### Bug: Dashboard creates background thread with shared db.session

**Severity: High**  
**File:** `backend/routes/dashboard.py:34-47`  
**Status: FIXED in commit 269571a**  
**Issue:** Background thread used `compile_activity_feed(wid)` which uses the same `db.session` as the main request. This is not thread-safe — SQLAlchemy sessions are not designed for concurrent access across threads.

**Fix applied:** Thread now calls `_db.session.remove()` before executing, creating a fresh session.

---

# 4. Goals Page

| Metric | Value |
|---|---|
| **Purpose** | Goal cascade management, phases, defense, follow-ups |
| **Route** | `/goals` |
| **Component** | `frontend/src/pages/Goals.jsx` (orchestrator) + 4 tabs |
| **Backend APIs** | `GET /api/goals`, `POST /api/goals`, `PUT /api/goals/{id}`, `DELETE /api/goals/{id}`, `GET /api/goals/{id}/detail`, `POST /api/goals/{id}/breakdown`, `GET /api/tasks?flat=true`, `GET /api/workspaces`, `GET /api/templates`, `GET /api/phase/{name}`, `POST /api/workspaces/apply-template`, `GET /api/calendar/defense/rules`, `POST /api/calendar/defense/suggestion`, `PUT /api/workspaces/{wsId}`, `GET /api/follow-ups?status=pending`, `PUT /api/follow-ups/{id}`, `GET /api/integrations` |
| **DB tables** | `goals`, `tasks`, `workspaces`, `phase_templates`, `phase_template_goals`, `phase_template_tasks`, `follow_ups`, `dismissed_calendar_alerts`, `user_integrations`, `workspace_members` |
| **Integrations** | Google Calendar (defense), all integrations listed for rule-setting |

### Tabs Breakdown

#### Tab 1: CascadeTab (Goal Tree)

| Widget | API | Datasource |
|---|---|---|
| Goal tree | `GET /api/goals` | `goals` table |
| Goal drawer | `GET /api/goals/{id}/detail` | `goals` + `tasks` |
| Quick-add task | `POST /api/tasks` | `tasks` table |

#### Tab 2: DefenseTab (Calendar Defense)

| Widget | API | Datasource |
|---|---|---|
| Calendar rules | `GET /api/calendar/defense/rules` | `workspaces.calendar_rules` |
| Defense suggestion | `POST /api/calendar/defense/suggestion` | `calendar_defense` logic |
| Workspace update | `PUT /api/workspaces/{wsId}` | `workspaces` table |

#### Tab 3: PhaseTab

| Widget | API | Datasource |
|---|---|---|
| Phase templates list | `GET /api/templates` | `phase_templates` table |
| Phase detail | `GET /api/phase/{name}` | `phase_templates` + `phase_template_goals` + `phase_template_tasks` |
| Apply template | `POST /api/workspaces/apply-template` | Creates goals + tasks |

#### Tab 4: FollowUpsTab

| Widget | API | Datasource |
|---|---|---|
| Pending follow-ups | `GET /api/follow-ups?status=pending` | `follow_ups` table |
| Update follow-up | `PUT /api/follow-ups/{id}` | `follow_ups` table |

### API Test

| API | Method | Live Status | Notes |
|---|---|---|---|
| `/api/goals` | GET | ❓ Auth required | — |
| `/api/goals` | POST | ❓ Auth required | — |
| `/api/goals/{id}` | PUT | ❓ Auth required | — |
| `/api/goals/{id}` | DELETE | ❓ Auth required | — |
| `/api/goals/{id}/detail` | GET | ❓ Auth required | — |
| `/api/goals/{id}/breakdown` | POST | ❓ Auth required | — |
| `/api/tasks?flat=true` | GET | ❓ Auth required | — |
| `/api/templates` | GET | ❓ Auth required | — |
| `/api/phase/{name}` | GET | ❓ Auth required | — |
| `/api/follow-ups?status=pending` | GET | ❓ Auth required | — |
| `/api/follow-ups/{id}` | PUT | ❓ Auth required | — |

---

# 5. Execute (Tasks) Page

| Metric | Value |
|---|---|
| **Purpose** | Task management, standups, blocker resolution |
| **Route** | `/execute` |
| **Component** | `frontend/src/pages/Execute.jsx` |
| **Backend APIs** | `GET /api/tasks`, `POST /api/tasks`, `PUT /api/tasks/{id}`, `DELETE /api/tasks/{id}`, `GET /api/workspaces`, `GET /api/goals`, `GET /api/blockers`, `PUT /api/blockers/{id}`, `GET /api/standups?date={date}`, `POST /api/standups`, `POST /api/tasks/suggest-context` |
| **DB tables** | `tasks`, `workspaces`, `goals`, `blockers`, `standups` |
| **Integrations** | None required (manual task creation). External tasks sourced via integrations appear as `tasks.source_integration`. |

### Task Source Breakdown

| Source | Expected Count | Actual Count | Duplicates | Null Values |
|---|---|---|---|---|
| Manual | Varies | ❓ Auth required | ❓ | `source` defaults to `"manual"` |
| Asana | Varies | ❓ Auth required | ❓ | `source_integration` = "asana" |
| Linear | Varies | ❓ Auth required | ❓ | `source_integration` = "linear" |
| Monday | Varies | ❓ Auth required | ❓ | `source_integration` = "monday" |
| Trello | Varies | ❓ Auth required | ❓ | `source_integration` = "trello" |
| GitHub | Varies | ❓ Auth required | ❓ | `source_integration` = "github" |
| AI-generated | Varies | ❓ Auth required | ❓ | `source` = "ai_inferred" |

### Potential Bug: Task source deduplication

**Severity: Medium**  
**File:** Entire activity compiler pipeline  
**Issue:** Tasks from external integrations use `source_event_id` to link back to `raw_events`, but there is NO unique constraint on `(source_integration, source_ref)` in the `tasks` table. If the activity compiler runs twice for the same integration event, it could create duplicate tasks. Other tables (`knowledge_items`, `activity_events`) have `integration_event_id` as unique to prevent this, but `tasks` does not.

**Fix:** Add a unique constraint on `(source_integration, source_ref)` in the `tasks` model, or add deduplication logic in the task creation pipeline.

---

# 6. Memory Page

| Metric | Value |
|---|---|
| **Purpose** | Knowledge graph, decisions, notes, chronicle, pattern engine |
| **Route** | `/memory` |
| **Component** | `frontend/src/pages/Memory.jsx` |
| **Backend APIs** | `GET /api/decisions`, `GET /api/notes`, `GET /api/pipeline/status`, `GET /api/chronicle`, `GET /api/knowledge`, `GET /api/handoff/packets`, `POST /api/notes/auto-process`, `POST /api/pattern-engine/run-all`, `PUT /api/notes/{id}`, `PUT /api/decisions/{id}`, `PUT /api/knowledge/{id}`, `DELETE /api/decisions/{id}`, `DELETE /api/notes/{id}`, `DELETE /api/knowledge/{id}`, `POST /api/knowledge`, `POST /api/decisions` |
| **DB tables** | `decision_logs`, `meeting_notes`, `knowledge_items`, `chronicle_events`, `handoff_packets`, `pattern_engine` tables (raw_events, etc.) |
| **Integrations** | All 13 data-providing integrations feed into the pattern engine |

### Data Sources

| Source | Table | Expected Records | Actual | Status |
|---|---|---|---|---|
| Decisions | `decision_logs` | Varies | ❓ Auth | ❓ |
| Meeting Notes | `meeting_notes` | Varies | ❓ Auth | ❓ |
| Knowledge Items | `knowledge_items` | Varies | ❓ Auth | ❓ |
| Chronicle Events | `chronicle_events` | Varies | ❓ Auth | ❓ |
| Handoff Packets | `handoff_packets` | Varies | ❓ Auth | ❓ |
| Raw Events (pattern engine) | `raw_events` | Varies | ❓ Auth | ❓ |

### Bug: Pipeline status endpoint returns unauthenticated

**Severity: Low**  
**File:** `backend/routes/pattern_engine_routes.py:165`  
**Issue:** `GET /api/pipeline/status` is behind `@token_required` but the frontend calls it on the Memory page which is behind ProtectedRoute. So this is technically fine for authenticated users.

---

# 7. Settings Page

| Metric | Value |
|---|---|
| **Purpose** | Account management, workspace admin, integrations, billing, notifications, API keys |
| **Route** | `/settings` |
| **Component** | `frontend/src/pages/Settings.jsx` (orchestrator) + 7 tabs |
| **Backend APIs** | 50+ endpoints across users, workspaces, billing, developer, integrations, notifications |

### Tab Breakdown

#### AccountTab

| Widget | API | Datasource |
|---|---|---|
| Profile | `GET /api/users/me`, `PUT /api/users/me` | `users` table |
| Sessions | `GET /api/users/me/sessions` | `refresh_tokens` table |
| 2FA | `POST /api/users/me/2fa/generate`, etc. | `users` (totp_secret, totp_enabled) |
| Avatar | `POST /api/users/me/avatar` | `users` table |
| Connected accounts | `GET /api/users/me/connected-accounts` | `user_integrations` table |
| Export | `GET /api/users/me/export?format=json` | All user data |
| Delete account | `DELETE /api/users/me` | All user data |

#### WorkspacesTab

| Widget | API | Datasource |
|---|---|---|
| List workspaces | `GET /api/workspaces` | `workspaces` + `workspace_members` |
| Create | `POST /api/workspaces` | `workspaces` + `workspace_members` |
| Update | `PUT /api/workspaces/{id}` | `workspaces` |
| Delete | `DELETE /api/workspaces/{id}` | Cascades |
| Duplicate | `POST /api/workspaces/{id}/duplicate` | `workspaces` + all child data |
| Transfer | `POST /api/workspaces/{id}/transfer` | `workspace_members` |
| Bulk archive | `POST /api/workspaces/bulk-archive` | `workspaces` |
| Activity log | `GET /api/workspaces/{id}/activity` | `activity_events` |

#### TeamTab

| Widget | API | Datasource |
|---|---|---|
| List members | Via workspace data | `workspace_members` |
| Invite | `POST /api/workspaces/{id}/invite` | `workspace_members` |
| Bulk invite | `POST /api/workspaces/{id}/invite-bulk` | `workspace_members` |
| Remove member | `DELETE /api/workspaces/{id}/members/{mid}` | `workspace_members` |
| Change role | `PUT /api/workspaces/{id}/members/{mid}/role` | `workspace_members` |
| Sub-teams CRUD | `GET/POST/PUT/DELETE /api/workspaces/{id}/teams`, team members | `sub_teams`, `sub_team_members` |
| Org chart | `GET /api/workspaces/{id}/org-chart` | `workspace_members` + `sub_teams` |
| Workload | `GET /api/workspaces/{id}/workload` | `tasks` |

#### ConnectedAppsTab

| Widget | API | Datasource |
|---|---|---|
| List integrations | `GET /api/integrations` | `user_integrations` |
| OAuth URL | `POST /api/integrations/oauth/url` | — |
| Save token | `POST /api/integrations/token` | `user_integrations` |
| Disconnect | `DELETE /api/integrations/{provider}` | `user_integrations` |

#### NotificationsTab

| Widget | API | Datasource |
|---|---|---|
| Templates | `GET /api/notifications/templates` | — |
| Preferences | `GET /api/notifications/preferences`, `PUT /api/notifications/preferences` | `notification_preferences` |
| Resend verification | `POST /api/notifications/resend-verification` | — |

#### BillingTab

| Widget | API | Datasource |
|---|---|---|
| Plan info | `GET /api/billing/plan` | `workspaces` (plan, subscription_status) |
| Config | `GET /api/billing/config` | — (static) |
| Invoices | `GET /api/billing/invoices` | `invoices` |
| Change plan | `POST /api/billing/change-plan` | Razorpay API |
| Cancel | `POST /api/billing/cancel` | Razorpay API |
| Reactivate | `POST /api/billing/reactivate` | Razorpay API |

#### ApiKeysTab

| Widget | API | Datasource |
|---|---|---|
| List keys | `GET /api/developer/api-keys` | `api_keys` |
| Create | `POST /api/developer/api-keys` | `api_keys` |
| Rename | `PUT /api/developer/api-keys/{id}` | `api_keys` |
| Revoke | `DELETE /api/developer/api-keys/{id}` | `api_keys` |
| Hard delete | `DELETE /api/developer/api-keys/{id}/hard` | `api_keys` |
| Audit log | `GET /api/developer/api-keys/{id}/audit` | `api_key_audit_logs` |
| Test | `POST /api/developer/api-keys/{id}/test` | — |

### Bug: Billing page uses raw fetch() missing X-Workspace-Id

**Severity: High**  
**File:** `frontend/src/pages/Billing.jsx` (all 8 API calls)  
**Issue:** The standalone `Billing.jsx` page (route `/plan`) uses raw `fetch()` calls instead of the `api` axios instance. While `Settings/BillingTab.jsx` correctly uses the `api` instance, the `/plan` route page does NOT send `X-Workspace-Id` header on any of its 8 API calls, and `GET /api/billing/config` on line 32 sends NO auth headers at all.

**Fix:** Replace `fetch()` with `api` axios instance in `frontend/src/pages/Billing.jsx`.

---

# 8. Feed / Activity Page

| Metric | Value |
|---|---|
| **Purpose** | Unified activity feed, priority actions, alerts, pinned items |
| **Route** | / (component: Not a full page, data used across pages) |
| **Components** | `frontend/src/pages/Dashboard.jsx`, `frontend/src/components/Sidebar.jsx` |
| **Backend APIs** | `GET /api/feed`, `GET /api/unified-feed`, `GET /api/priority-actions`, `GET /api/alerts`, `GET /api/pinned-items`, `POST /api/pin-item`, `DELETE /api/pin-item/{hash}` |
| **DB tables** | `activity_events`, `pinned_items` |

---

# 9. Notification System

| Metric | Value |
|---|---|
| **Purpose** | In-app notifications, email notifications |
| **Component** | `frontend/src/context/NotificationContext.tsx`, `frontend/src/components/Sidebar.jsx` |
| **Backend APIs** | `GET /api/notifications?per_page=15`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`, `GET /api/notifications/preferences`, `PUT /api/notifications/preferences` |
| **DB tables** | `in_app_notifications`, `notification_preferences`, `email_notifications` |

---

# 10. Analytics (Write-only Integrations)

| Metric | Value |
|---|---|
| **Purpose** | Event tracking |
| **Endpoint** | `POST /api/track` |
| **DB tables** | None (forwarded to Mixpanel/Amplitude/PostHog) |
| **Backend Providers** | Mixpanel (via `services/mixpanel_service.py`), Amplitude (`services/amplitude_service.py`), PostHog (`services/posthog_service.py`) |

### Bug: Analytics providers return empty from activity compiler

**Severity: Low**  
**Files:** `backend/services/activity_compiler/providers.py:getPosthogData/getMixpanelData/getAmplitudeData`  
**Issue:** All three analytics provider functions explicitly return `[]`. They cannot fetch data from their respective APIs because Mixpanel/Amplitude/PostHog are write-only platforms. The code comment says "analytics tools, not data sources." This is by design but means the activity feed will never contain analytics events from these providers.

---

# 11. Pattern Engine (Background Pipeline)

| Metric | Value |
|---|---|
| **Purpose** | AI-driven pattern detection, knowledge inference, task/goal creation |
| **Trigger** | `POST /api/pattern-engine/run-all` (manual), Scheduler (every 15 min) |
| **DB tables** | `raw_events`, `llm_usage_logs`, `provider_usage`, `pattern_corrections`, plus `tasks`, `goals`, `knowledge_items`, `decision_logs`, `meeting_notes`, `activity_events` |

### Bug: Pattern engine scheduler runs without auth

**Severity: Medium**  
**File:** `backend/app.py` (scheduler startup at module level)  
**Issue:** The APScheduler background jobs (`start_scheduler`) run every 15 minutes and execute the full pattern engine pipeline. They run inside the Flask app context but NOT inside a request context. If any pipeline function calls `request.headers` or other request-scoped Flask features, it will crash with `RuntimeError: Working outside of request context`.

---

# 12. Integration Connection Status

| Provider | Auth Type | Env Vars Set (Production) | Token Refresh | Data Fetchable | Status |
|---|---|---|---|---|---|
| Google | OAuth | ❓ Unknown | ✅ Yes | ✅ Yes | Unknown |
| GitHub | OAuth | ❓ Unknown | ❌ No (missing refresh_token) | ✅ Yes | Unknown |
| Slack | OAuth | ❓ Unknown | ❌ No | ✅ Yes | Unknown |
| Monday.com | OAuth | ❓ Unknown | ❌ No | ✅ Yes | Unknown |
| Trello | API Key | ❓ Unknown | N/A | ✅ Yes | Unknown |
| Asana | OAuth | ❓ Unknown | ✅ Yes | ✅ Yes | Unknown |
| Notion | API Key | ❓ Unknown | N/A | ✅ Yes | Unknown |
| HubSpot | API Key | ❓ Unknown | N/A | ✅ Yes | Unknown |
| Pipedrive | OAuth | ❓ Unknown | ✅ Yes | ✅ Yes | Unknown |
| Zoho CRM | OAuth | ❓ Unknown | ✅ Yes | ✅ Yes | Unknown |
| Calendly | OAuth | ❓ Unknown | ✅ Yes | ✅ Yes | Unknown |
| Linear | OAuth | ❓ Unknown | ✅ Yes | ✅ Yes | Unknown |
| Mixpanel | API Key | ❓ Unknown | N/A | ❌ Write-only | N/A |
| Amplitude | API Key | ❓ Unknown | N/A | ❌ Write-only | N/A |
| PostHog | API Key | ❓ Unknown | N/A | ❌ Write-only | N/A |
| Google Analytics | OAuth | ❓ Unknown | ✅ (via Google) | ✅ Yes | Unknown |

### Bug: GitHub/Slack/Monday refresh tokens not stored

**Severity: Medium**  
**Files:** `backend/services/github_service.py`, `backend/services/slack_service.py`, `backend/services/monday_service.py`  
**Issue:** GitHub, Slack, and Monday.com OAuth flows do not store `refresh_token` even though the OAuth provider may return one. When the `access_token` expires (typically 1-2 hours for these providers), the integration breaks permanently until the user reconnects.

---

# Final Summary Matrix

| Page | APIs Used | Apps Needed | Apps Connected | Expected Records | Actual Records | Missing Records | Broken APIs | Broken Widgets |
|---|---|---|---|---|---|---|---|---|
| **Landing** | 1 | 0 | N/A | Waitlist entries | ❓ Auth | ❓ | 1 (400 on waitlist POST) | Waitlist form |
| **Login** | 5 | 1 (Google) | ❓ Unknown | User sessions | ❓ | ❓ | 0 | 0 |
| **Dashboard** | 3 primary | 13 data providers | ❓ Unknown | Goals, tasks, blockers, decisions | ❓ Auth | ❓ | 0 (live 401 expected) | ❓ All need auth |
| **Goals** | 11 | 1 (Google Calendar for defense) | ❓ Unknown | Goals, tasks, follow-ups | ❓ Auth | ❓ | 0 | 0 |
| **Execute/Tasks** | 9 | 0 (manual) + 5 external task sources | ❓ Unknown | Tasks by source/status/priority | ❓ Auth | ❓ | 0 | 0 |
| **Memory** | 16 | 13 (all data providers via pattern engine) | ❓ Unknown | Decisions, notes, knowledge, chronicle | ❓ Auth | ❓ | 0 | 0 |
| **Settings** | 50+ | 15 (all integrations) | ❓ Unknown | Workspaces, users, billing, integrations | ❓ Auth | ❓ | 0 | 0 |
| **Billing** | 8 | 1 (Razorpay) | ❓ Unknown | Invoices, subscription status | ❓ Auth | ❓ | 0 | All 8 widgets |

---

# Bug List (Ordered by Severity)

## CRITICAL

### C1. psycopg2-binary + gevent worker incompatibility → 502/connection-reset

**Status: FIXED (commit 269571a)**  
**Files:** `Dockerfile`, `gunicorn.conf.py`, `requirements.txt`  
**Root Cause:** `psycopg2-binary` C extension uses blocking I/O that bypasses gevent monkey-patching. When multiple greenlets share the same database connection, concurrent access corrupts the connection state, causing segfaults. This kills the gunicorn worker mid-request, returning 502 + `net::ERR_CONNECTION_CLOSED` without CORS headers.  
**Fix:** Switched from `gevent` to `sync` worker class. Removed gevent dependency. Reduced database pool from 10→2 connections.

## HIGH

### H1. CORS headers missing on error responses before after_request

**Status: FIXED (commit 269571a)**  
**File:** `backend/app.py` (added `@app.before_request handle_preflight`)  
**Root Cause:** Flask extensions (CSRFProtect, limiter) could intercept requests before `@app.after_request` runs, returning responses without CORS headers. The browser then rejects the response as a CORS failure.  
**Fix:** Added explicit `@app.before_request` handler for OPTIONS that returns 200 with CORS headers immediately, preventing middleware interception.

### H2. Dashboard background thread shares db.session

**Status: FIXED (commit 269571a)**  
**File:** `backend/routes/dashboard.py:34-47`  
**Root Cause:** `compile_activity_feed()`, called in a background thread via `copy_current_request_context`, used the same `db.session` as the main request. SQLAlchemy sessions are not thread-safe.  
**Fix:** Thread now calls `_db.session.remove()` before executing to obtain a fresh session.

### H3. Billing.jsx uses raw fetch() missing X-Workspace-Id header

**Status: UNFIXED**  
**File:** `frontend/src/pages/Billing.jsx` (8 API calls)  
**Root Cause:** Standalone `/plan` billing page uses `fetch()` instead of the `api` axios instance. `GET /api/billing/config` (line 32) sends NO auth headers. All other calls manually set `Authorization` but miss `X-Workspace-Id` and CSRF token.  
**Fix:** Replace all `fetch()` calls in `Billing.jsx` with the `api` axios instance from `src/utils/api.js`.

### H4. GitHub/Slack/Monday OAuth tokens expire without refresh

**Status: UNFIXED**  
**Files:** `backend/services/github_service.py`, `slack_service.py`, `monday_service.py`  
**Root Cause:** These three OAuth providers return `access_token` with a 1-2 hour expiry but their OAuth flows do not store `refresh_token`. When the token expires, the integration breaks until the user reconnects.  
**Fix:** Store `refresh_token` in `UserIntegration.refresh_token` column and implement `refresh_*_token()` functions (same pattern as Google, Asana, Zoho, etc.).

### H5. No `workspace_id` column on `raw_events` table

**Status: UNFIXED**  
**File:** `backend/pattern_engine/models.py`  
**Root Cause:** The `RawEvent` model has no `workspace_id` column. Events are linked to users via `user_id` but cannot be scoped to a specific workspace. This means pattern engine processing runs across ALL workspaces for a user, potentially mixing unrelated data.  
**Fix:** Add `workspace_id` FK column to `raw_events` table and populate it during event ingestion.

## MEDIUM

### M1. Google Calendar API call blocks dashboard response

**Status: UNFIXED**  
**File:** `backend/routes/dashboard.py:91-121`  
**Root Cause:** The dashboard endpoint synchronously fetches Google Calendar events with a 5-second timeout. If Google Calendar is slow, the dashboard response is delayed. On Render's free tier with 120s timeout, this can cause cascading delays.  
**Fix:** Move Google Calendar fetch to a background thread (same pattern as the activity compiler refresh).

### M2. Duplicate task creation from integrations

**Status: UNFIXED**  
**File:** `backend/models/task.py`, activity compiler pipeline  
**Root Cause:** The `tasks` table lacks a unique constraint on `(source_integration, source_ref)`. If the activity compiler runs twice for the same external event, it creates duplicate tasks.  
**Fix:** Add `UniqueConstraint('source_integration', 'source_ref')` to the `Task` model and add deduplication logic.

### M3. Pattern engine scheduler lacks request context

**Status: UNFIXED**  
**File:** `backend/app.py` (scheduler startup)  
**Root Cause:** The APScheduler background jobs run every 15 minutes outside a Flask request context. Any pipeline function that calls `request.headers` or other request-scoped Flask features will crash with `RuntimeError: Working outside of request context`.  
**Fix:** Ensure all pipeline functions use `current_app` and `g` instead of request-scoped objects, or wrap the scheduler job in a request context.

### M4. Auto-migration runs on every startup, potentially conflicting

**Status: UNFIXED**  
**File:** `backend/app.py:119-177`  
**Root Cause:** The `ALTER TABLE ADD COLUMN IF NOT EXISTS` auto-migration runs on every cold start. While wrapped in try/except, repeated `ALTER TABLE` on large production tables could cause locks or conflicts.  
**Fix:** Move to proper Alembic migration system or add a "version" check to only run once.

## LOW

### L1. Analytics providers return empty from activity compiler

**Status: UNFIXED (by design)**  
**File:** `backend/services/activity_compiler/providers.py`  
**Issue:** Mixpanel/Amplitude/PostHog providers explicitly return `[]` because they are write-only platforms. The comment says "analytics tools, not data sources." This is correct behavior but means analytics events never appear in the activity feed.

### L2. Waitlist endpoint returns 400 for invalid body

**Status: UNFIXED**  
**File:** `backend/routes/waitlist_routes.py:8`  
**Issue:** `POST /api/waitlist` returns 400 Bad Request when sent without a proper JSON body. The frontend should validate `{"email":"..."}` structure before sending.

### L3. `error_logs` table has no FK constraints

**Status: UNFIXED**  
**File:** `backend/models/error_log.py`  
**Issue:** `ErrorLog.workspace_id` and `ErrorLog.user_id` are plain Integer columns without FK constraints. This means orphaned error log records won't be cleaned up when workspaces/users are deleted.

---

# Data Integrity Summary

| Table | Has `to_dict()` | Has FK Constraints | Has Unique Constraints | Has Indexes | Status |
|---|---|---|---|---|---|
| `users` | ✅ Yes | — | 2 (email, google_id) | PK only | ✅ |
| `workspaces` | ✅ Yes | ✅ (creator_id → users) | 0 | PK only | ✅ |
| `workspace_members` | ✅ Yes | ✅ (workspace_id, user_id) | 0 | PK only | ⚠️ No unique on (workspace_id, user_id) |
| `tasks` | ✅ Yes | ✅ (multiple) | 0 | PK only | ⚠️ Missing unique on (source_integration, source_ref) |
| `goals` | ✅ Yes | ✅ (multiple) | 0 | PK only | ✅ |
| `decision_logs` | ✅ Yes | ✅ (multiple) | 0 | PK only | ✅ |
| `meeting_notes` | ✅ Yes | ✅ (multiple) | 0 | PK only | ✅ |
| `knowledge_items` | ✅ Yes | ✅ (multiple) | 1 (integration_event_id) | PK only | ✅ |
| `follow_ups` | ✅ Yes | ⚠️ FK defined but NO db.relationship | 0 | PK only | ⚠️ Orphan risk |
| `blockers` | ✅ Yes | ✅ (workspace_id) | 0 | PK only | ✅ |
| `standups` | ✅ Yes | ✅ (user_id, workspace_id) | 0 | PK only | ✅ |
| `user_integrations` | ✅ Yes | ✅ (user_id) | 0 | PK only | ✅ |
| `in_app_notifications` | ✅ Yes | ✅ (user_id, workspace_id) | 0 | PK only | ✅ |
| `notification_preferences` | ✅ Yes | ✅ (user_id, workspace_id) | ✅ 1 (user_id, workspace_id, rule_key) | PK only | ✅ |
| `workspace_notifications` | ✅ Yes | ✅ (workspace_id, user_id) | 0 | PK only | ✅ |
| `refresh_tokens` | ❌ None | ✅ (user_id) | 1 (token_hash) | PK only | ✅ |
| `api_keys` | ✅ Yes | ✅ (user_id, workspace_id) | 0 | PK only | ✅ |
| `pinned_items` | ✅ Yes | ✅ (user_id) | 0 | PK only | ✅ |
| `invoices` | ✅ Yes | ✅ (workspace_id) | 0 | PK only | ✅ |
| `handoff_packets` | ✅ Yes | ✅ (workspace_id, user_id) | 0 | PK only | ✅ |
| `email_notifications` | ✅ Yes | ✅ (user_id, workspace_id) | 0 | PK only | ✅ |
| `error_logs` | ❌ None | ❌ None (no FKs) | 0 | PK only | ❌ No FK constraints |
| `waitlist` | ❌ None | None | 1 (email) | PK only | ✅ |
| `sub_teams` | ✅ Yes | ✅ (workspace_id, created_by) | 0 | PK only | ✅ |
| `sub_team_members` | ✅ Yes | ✅ (sub_team_id, user_id) | ✅ 1 (sub_team_id, user_id) | PK only | ✅ |
| `recurring_workflows` | ✅ Yes | ✅ (workspace_id) | 0 | PK only | ✅ |
| `dismissed_calendar_alerts` | ✅ Yes | ✅ (workspace_id) | 0 | PK only | ✅ |
| `chronicle_events` | ✅ Yes | ✅ (workspace_id, user_id) | 0 | PK only | ✅ |
| `activity_events` | ✅ Yes | ❓ (from model audit) | ✅ (integration_event_id) | PK only | ✅ |
| `raw_events` (pattern engine) | ❌ None | ❌ No workspace_id FK | 0 | PK only | ❌ Missing workspace scope |
| `phase_templates` | ✅ Yes | None (no FKs) | 1 (name) | PK only | ✅ |
| `phase_template_goals` | ✅ Yes | ✅ (template_id) | 0 | PK only | ✅ |
| `phase_template_tasks` | ✅ Yes | ✅ (template_id, parent_goal_id) | 0 | PK only | ✅ |

---

# Recommendations (Priority Order)

### Immediate (Production-Blocking)
1. ~~Switch from gevent to sync workers~~ ✅ DONE
2. Fix `Billing.jsx` to use `api` axios instance instead of raw `fetch()`
3. Add refresh token storage for GitHub, Slack, Monday OAuth flows

### Short-Term (Next Sprint)
4. Add unique constraint `(source_integration, source_ref)` on `tasks` table to prevent duplicates
5. Move Google Calendar fetch in dashboard to background thread
6. Add `workspace_id` FK to `raw_events` table
7. Wrap scheduler jobs in Flask request context

### Medium-Term (Next Release)
8. Replace auto-migration with Alembic
9. Add FK constraints to `error_logs` table
10. Add unique constraint `(workspace_id, user_id)` on `workspace_members`
11. Add proper `db.relationship()` definitions to models that are missing them (follow_ups, handoff_packets)

### Long-Term
12. Implement comprehensive test suite covering all 210 backend endpoints
13. Add rate limiting monitoring dashboard
14. Implement database connection pooling health metrics
