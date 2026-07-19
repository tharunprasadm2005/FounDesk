# FounDesk — System Summary for Claude

## Project Overview

FounDesk is a solo-founder AI-powered operations platform. PostgreSQL (`foundesk_db`) on `localhost:5432`. Backend Flask on `:5000`, frontend Vite on `:5173`. LLM routing uses Ollama (Qwen 2.5 7B local) with Groq/OpenRouter fallback. Auth via Google OAuth.

**Current user:** Tharun Prasad (ID 653, founder) in "Tharun's Workspace" (ID 384, stage=Build).

---

## 1. Daily Standups

### Process Flow

```
External integrations (Gmail/Linear/Slack/etc.)
  → RawEvent (688 in DB)
  → Pattern Engine pipeline (cron-driven)
  → _compile_daily_briefing() — deterministic SQL-only (zero LLM)
  → _generate_standup_from_compiled() — builds text fields + calls LLM for rewrite
  → Standup saved with compiled_json + narrative text
  → GET /api/standups?date=YYYY-MM-DD returns submissions + non_responders
  → Frontend renders 5 expandable sections
```

### Deterministic Compiler (`_compile_daily_briefing`)

Selects exactly 43 records across 6 categories — **all by code, zero LLM involvement**:

| Section | Sub-key | Source Table | Max | Selection Criteria |
|---------|---------|-------------|-----|-------------------|
| **Yesterday** | completed_tasks | Task | ∞ | status=Done, updated yesterday |
| | meetings | MeetingNotes | ∞ | date yesterday |
| | decisions | DecisionLog | ∞ | created yesterday |
| | goals_completed | Goal | ∞ | status=completed, updated yesterday |
| **Today** | priority_tasks | Task | 10 | status=In Progress, ordered by priority |
| | due_today | Task | ∞ | deadline=today, not Done |
| | upcoming_meetings | MeetingNotes | ∞ | date today |
| | goal_progress | Goal | ∞ | status in_progress/pending |
| **Risks** | overdue_tasks | Task | ∞ | deadline past, not Done |
| | blocked_tasks | Task | ∞ | status=Blocked |
| | blockers | Blocker | ∞ | open, ordered by severity |
| | unresolved_decisions | DecisionLog | 5 | pending_confirmation |
| | goals_at_risk | Goal | ∞ | at_risk |
| **Business** | crm_updates | ActivityEvent | 10 | hubspot/pipedrive/zoho |
| | important_emails | ActivityEvent | 5 | gmail |

**Source refs:** All record IDs collected into `task_ids`, `blocker_ids`, `meeting_ids`, `decision_ids`, `goal_ids`, `activity_ids`.

### LLM Role (Rewrite Only)

`rewrite_standup_narrative()` receives bullet-point facts from compiled dict. System prompt: *"NEVER add facts not in input. Use 'You' not 'John'. Output JSON with single 'summary' field, 2-4 sentences."* Temperature 0.2. Failure is non-fatal (summary stays empty).

### Data Flow: Auto Standup Triggers

```
Pipeline runs (via cron or on integration events):
  → _auto_standup(workspace_id)         — creates standup for workspace creator
  → _auto_standup_for_all_members()     — creates for every active member
  → _cross_link_standup_blockers()      — parses q3_blockers text, links/creates blocker records
```

### Frontend: 5 Redesigned Sections

Each standup card renders from `compiled_json`:

| Section | Icon | Color | Contents |
|---------|------|-------|----------|
| AI Summary | 🤖 | Blue | 2-4 sentence LLM rewrite at top |
| 📋 Yesterday | ✅ | Green/positive | Completed tasks, meetings, decisions, completed goals |
| 📅 Today | 📅 | Ember/orange | Priority tasks (with P0/P1 badges), due-today items, meetings |
| ⚠️ Risks & Blockers | ⚠️ | Warning/red | Overdue tasks (X days), blocked tasks, blockers (severity badge + age), at-risk goals |
| 💼 Business | 💼 | Amber | CRM updates, important emails |

**Click-to-navigate:** Tasks → Kanban, Blockers → Blocker Panel, Goals → /plan, Meetings/Decisions → /memory, CRM → /dashboard

**Date navigation:** Relative labels (Yesterday/Tomorrow/Day Before/Last Week), "Back to Today" button when viewing other dates, "Today" badge when on current date.

### Data in DB

- 3 standup records total, 1 for today (2026-07-07)
- 4 open blockers tracked (see below for details)
- Non-responders detected by diffing active members vs submissions

---

## 2. Goal Cascade

### Goal Hierarchy (Self-referential Tree)

```
Monthly Milestone (goal_type='monthly', parent_id=NULL)
  ├── Weekly Action Step (goal_type='weekly', parent_id=milestone.id)
  │     ├── Task (task.goal_id=weekly.id)
  │     ├── Decision (via goal_decisions M2M)
  │     └── Daily Step (goal_type='daily', parent_id=weekly.id)
  │           ├── Task (task.goal_id=daily.id)
  │           └── Decision (via goal_decisions M2M)
  └── Weekly (standalone, parent_id=NULL)
```

### Model: Goal (`backend/models/goal.py`)

| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| title | String(255) | NOT NULL |
| goal_type | String(50) | monthly / weekly / daily |
| status | String(50) | pending / in_progress / completed / failed / at_risk / duplicate |
| parent_id | FK→goals.id | Self-referential, CASCADE |
| due_date | Date | Added via migration; preferred over generic `date` |
| source | String(100) | manual / meeting / ai / extraction / integration |
| source_integration | String(100) | e.g. monday.com, trello |
| confidence_score | Float | 0-100 |
| workspace_id | FK→workspaces.id | CASCADE |
| user_id | FK→users.id | CASCADE |

**Relationships:** `sub_goals` (self-ref cascade), `tasks` (via Task.goal_id SET NULL), `linked_decisions` (via goal_decisions M2M)

### Progress Computation (Server-side in to_dict)

- If linked tasks/decisions exist: `(done_tasks + confirmed_decisions) / (total_tasks + total_decisions) * 100`
- Fallback: time-based (elapsed days between created_at and deadline)
- **Weekly goals:** auto-update status on every GET based on progress (100%→completed, >0%→in_progress, 0%→pending)

### At-Risk Detection (`compute_goal_risk`)

| Condition | Reason |
|-----------|--------|
| due_date past | "Overdue by Xd" |
| due within 3d, <50% tasks done | "Due in Xd, only Y/Z done" |
| due within 7d, 0 linked tasks | "Due in Xd with no linked tasks" |
| No done tasks in 14d (but some exist) | "No progress in 14 days" |
| 0 done, created >14d ago | "No tasks started in 14 days" |

### Progress Trend (`compute_progress_trend`)

- Compares tasks completed last 7 days vs 7-14 days ago
- Returns: `accelerating` / `stalling` / `steady`

### Source Badge Mapping

| source | Icon | Label |
|--------|------|-------|
| manual | 🔧 | Manual |
| meeting | 📋 | From Meeting |
| decision | 💡 | From Decision |
| ai / extraction | 🤖 | AI Generated |
| integration | 🔗 | From {integration_name} |

### Smart Sorting

At-risk goals first (risk=0), then by due_date ascending.

### GET /api/goals/{id}/detail Endpoint

Returns: `{ goal, tasks, decisions, sub_goals, source_meeting, recent_activity (last 20, 30d) }`

### Frontend: Goals.jsx

- **4 tabs:** Goal Cascade (default), Calendar Defense, Active Phase, Follow-ups
- **Stats row:** Roadmap Goals count, Active Milestones, Unlinked Tasks count
- **Filters:** Status (all/pending/in_progress/completed/failed), Sort (newest/oldest/deadline)
- **Auto progress bars:** X/Y task count replacing old manual prompt
- **At-risk banners:** Red background + AlertTriangle icon + reason text
- **Trend arrows:** 📈 accelerating (green), 📉 stalling (yellow), ➡️ steady (gray)
- **Goal detail drawer:** 480px slide-in panel with status selector, linked tasks (clickable→/execute?task=X), linked decisions, sub-goals, recent activity, delete
- **URL param handler:** `/execute?task=X` opens task drawer directly

### Data in DB

- 2 goals (vs 9 in older JSON snapshots):
  - ID 70: "Finalize Calendly Replacement" — weekly, in_progress, manual
  - ID 71: "Hiring Backend Engineer" — daily, pending, manual
- **0 tasks linked to goals** (goal_id is NULL on all 75 tasks)
- 0 at-risk goals

---

## 3. Kanban Board

### Backend: Task Model (`backend/models/task.py`)

| Field | Type | Notes |
|-------|------|-------|
| id | Integer PK | |
| title | String(255) | NOT NULL |
| description | Text | nullable |
| priority | String(50) | P0 / P1 / P2 / P3, default P2 |
| status | String(50) | "Not Started" / "In Progress" / "Blocked" / "Done" / "Cancelled" |
| deadline | DateTime | nullable due date |
| assignee_id | FK→users.id | SET NULL |
| goal_id | FK→goals.id | SET NULL (for linking to Goal Cascade) |
| user_id | FK→users.id | CASCADE, creator |
| workspace_id | FK→workspaces.id | CASCADE |
| blocked_at | DateTime | set when status="Blocked" |
| blocker_description | Text | why blocked |
| estimated_hours | Integer | |
| phase_tag | String(100) | e.g. "Sprint-1" |
| source | String(100) | manual / linear / trello / asana / monday / github / ai_pattern_engine |
| source_ref | String(255) | external ID |
| source_integration | String(100) | integration name |
| parent_id | FK→tasks.id | sub-tasks |
| linked_decision_id | FK→decision_logs.id | |
| linked_meeting_id | FK→meeting_notes.id | |

**to_dict() includes:** `is_blocked`, `active_blocker_ids`, `blocker_count`, `linked_task_ids`, `sub_tasks`

### Routes (`backend/routes/tasks.py`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/tasks | List (flat or nested), filters: status, priority, goal_id, source |
| POST | /api/tasks | Create (auto-sets blocked_at/started_at) |
| PUT | /api/tasks/:id | Update (auto-syncs timestamps, creates ChronicleEvent on Done) |
| GET | /api/tasks/:id/detail | Rich detail with linked entities |
| DELETE | /api/tasks/:id | Delete |
| POST | /api/tasks/suggest-context | AI keyword-matching suggestions |

### Frontend: Kanban Rendering

**5 columns with drag-and-drop:**
| Column | Color | Card Badges |
|--------|-------|-------------|
| Not Started | Graphite | Priority (P0/P1 orange, P2 blue, P3 gray), phase tag |
| In Progress | Ember-light | Same + assignee avatar (first letter) |
| Blocked | Warning (red) | Same + blocker count, overdue deadline in red |
| Done | Positive (green) | Strikethrough title |
| Cancelled | Graphite-dim | Dimmed |

**Drag-and-drop:** HTML5 native, calls `PUT /api/tasks/:id { status: newStatus }`

**Filters:** Search text, status, priority, phase tag, assignee, goal (Kanban only)
**Group by:** None, Status, Assignee, Phase, Priority (Kanban only)
**Sort by:** Default, Priority, Deadline, Newest

### Data in DB: 75 Tasks

| Source | Total | In Progress | Not Started | Done | Blocked | Cancelled |
|--------|-------|------------|-------------|------|---------|-----------|
| **linear** | 20 | 10 | 5 | 5 | 0 | 0 |
| **trello** | 15 | 10 | 5 | 0 | 0 | 0 |
| **asana** | 15 | 8 | 4 | 3 | 0 | 0 |
| **monday** | 15 | 6 | 9 | 0 | 0 | 0 |
| **manual** | 9 | 1 | 7 | 1 | 0 | 0 |
| **ai_pattern** | 1 | 0 | 1 | 0 | 0 | 0 |
| **Total** | **75** | **35** | **31** | **9** | **0** | **0** |

**By Priority:** P0=2, P1=14, P2=58, P3=1
**Linked to goals:** 0 (all tasks have goal_id=NULL)
**Assignee:** All unassigned

**P0 tasks:** "FOU-11 Improve User Onboarding Flow" (In Progress), "FOU-6 Implement Microsoft Teams Integration" (In Progress)

### Data Origins (3 Sources)

1. **External Integrations** (Linear/Trello/Asana/Monday.com → OAuth sync → RawEvent → Task)
2. **AI Pattern Engine** (infers tasks from raw emails/communications)
3. **Manual creation** (via POST endpoint in frontend)

---

## 4. List View

### Frontend: Same File (Execute.jsx, lines 391-447)

- **Flat table:** Status dot + title + priority badge + deadline + action buttons
- **Left border indicator:** Red stripe if overdue or blocked
- **Inline expand:** Click title to expand description, goal, assignee, estimated hours, phase tag
- **Bulk operations:** Checkboxes + multi-select
- **Inline actions:** Done/Reopen toggle, Edit (opens form modal), Delete (with confirm)
- **Status dropdown:** All 5 statuses changeable inline
- **Empty state:** "No tasks match your filters."

### Backend: Same Task model/routes. Same GET /api/tasks?flat=true endpoint for flat list.

---

## 5. Blockers

### Backend: Blocker Model (`backend/models/blocker.py`)

| Field | Type | Default |
|-------|------|---------|
| id | Integer PK | auto |
| workspace_id | FK→workspaces.id | CASCADE, NOT NULL |
| title | String(255) | NOT NULL |
| description | Text | nullable |
| severity | String(50) | 'medium' (high/medium/low) |
| status | String(50) | 'open' (open/resolved) |
| source_provider | String(100) | e.g. gmail, slack |
| task_id | FK→tasks.id | SET NULL |
| assigned_to | FK→users.id | SET NULL |
| source_integration | String(100) | |
| created_at | DateTime | utcnow |
| resolved_at | DateTime | nullable |

### Routes (`backend/routes/dashboard.py`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/blockers | List open blockers + fallback (tasks blocked 24h+ with no Blocker row) |
| PUT | /api/blockers/:id | Resolve (status: open→resolved, sets resolved_at) |

**Fallback logic:** Tasks with `blocked_at` set 24+ hours ago AND `blocker_description` populated are synthesized into blocker objects (severity=medium, status=open).

### Frontend: Blocker Panel

**Two-column layout:**

Left column — Blocker cards:
- 3px left border colored by severity (high=red, medium=orange, low=gray)
- Severity badge
- Blocker description (warning-styled block if task has blocker_description)
- "Resolve" button (calls PUT)
- Task link ("View" icon + title if linked)
- Source label (integration name)
- Created date

Right column — Summary cards:
- Open count (HeroNumber, orange if >0)
- Resolved count (HeroNumber, green if >0)
- By Severity grid (High/Medium/Low color-coded counts)

**Empty states:** "No blocked tasks today. All clear." / "No resolved blockers."

### Data in DB: 4 Blockers (all open)

| ID | Title | Severity | Source | Created |
|----|-------|----------|--------|---------|
| 70 | Untitled Blocker | medium | slack | ~Jul 2026 |
| 71 | Acme deal needs Teams integration to close | high | hubspot | ~Jul 2026 |
| 72 | Acme deal needs Enterprise SSO to close | high | hubspot | ~Jul 2026 |
| 73 | Nexora Solutions deal requires SSO to close | high | pipedrive | ~Jul 2026 |

**By severity:** 3 high + 1 medium, all open, 0 resolved
**Linked tasks:** None (all task_id=NULL)

### Blocker Detection Flow

```
Option A: Integration pipeline detects blocking language in raw events
  → _process_blocker_events()
  → Blocker record created (severity inferred by AI)

Option B: User marks task as "Blocked" in Kanban
  → blocked_at timestamp set
  → Frontend shows in "Blocked" column
  → GET /api/blockers fallback detects 24h+ stalled tasks → synthesized blockers

Option C: Standup cross-linker
  → _cross_link_standup_blockers() parses q3_blockers text
  → Matches existing blockers by title (SequenceMatcher > 0.6)
  → Or creates new Blocker (severity=medium, source=standup)
```

---

## 6. Integrations: 15 Connected

| Provider | Type | Status |
|----------|------|--------|
| Google (Gmail/Calendar/Docs/Analytics) | OAuth | ✅ Connected |
| Linear | OAuth | ✅ Connected |
| Trello | API token | ✅ Connected |
| Asana | OAuth | ✅ Connected |
| Monday.com | OAuth | ✅ Connected |
| GitHub | OAuth | ✅ Connected |
| Slack | OAuth | ✅ Connected |
| Notion | API token | ✅ Connected |
| HubSpot | API key | ✅ Connected |
| Pipedrive | OAuth | ✅ Connected |
| Calendly | OAuth | ✅ Connected |
| Mixpanel | API key | ✅ Connected |
| Amplitude | API key | ✅ Connected |
| PostHog | API key | ✅ Connected |
| Google Calendar | OAuth | ✅ Connected |

**Not connected (env vars present but no DB record):** Zoho CRM, Razorpay
**Pipeline runs:** ~134 Ollama requests + 37 Groq + 30 OpenRouter today (2026-07-07)

---

## 7. Key Discrepancies (JSON Snapshots vs Live DB)

| Metric | Snapshots | Live DB | Note |
|--------|-----------|---------|------|
| Tasks | 128-133 | 75 | Snapshots are older state |
| Goals | 9 (incl. "Close Seed Round of $1.5M" hierarchy) | 2 | Snapshots had real milestone data |
| Blockers | 1 | 4 | Live has more current blockers |
| Task→Goal links | 4 linked | 0 | Must re-connect tasks to goals |
| Workspaces | 2 (IDs 342, 343) | 1 (ID 384) | DB was reset at some point |
| User ID | 593 | 653 | Different after reset |

**Snapshots located at:** `goals.json`, `dash.json`, `briefing.json`, `feed.json`, `feed2.json`, `workspaces.json`, `priority*.json` in project root.

---

## 8. Key Architectural Notes

1. **No migration framework.** Schema managed via `db.create_all()` + ad-hoc ALTER TABLE scripts in `migrate_schema.py`.
2. **One standup per user per day.** Enforced both server-side (route check) and pipeline-side (skip if exists).
3. **LLM is NEVER the source of truth in standups.** Compiler selects facts; LLM only rewrites existing data.
4. **Goal progress is computed server-side.** Frontend no longer prompts users for percentage.
5. **At-risk detection is pure SQL/date math.** No LLM involvement in determining if a goal is at risk.
6. **Cascade delete:** Deleting a monthly milestone cascade-deletes all weekly/daily sub-goals. Tasks get goal_id=NULL (SET NULL).
7. **0 tasks currently linked to goals** — this is the main gap between the Goal Cascade page (shows 2 goals with 0 progress) and the full task list (75 tasks).
