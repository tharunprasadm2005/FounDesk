# End-to-End Data Lineage Audit Report

## Integration Data Flow Matrix

Each row traces one integration's data from fetch → ActivityEvent → feed → briefing → dashboard.

| Integration | Real Timestamps | → ActivityEvent | → Feed (`/unified-feed`) | → Briefing Context | → Dashboard |
|---|---|---|---|---|---|
| **Slack** | ✅ Real `msg.ts` | ✅ provider=`slack` | ✅ source=`slack` | ✅ `communications[]` (from AE) | ✅ digest count |
| **Gmail** | ✅ Real `internalDate` | ✅ provider=`gmail` | ✅ source=`gmail` | ✅ `communications[]` (DIRECT API) | ✅ digest count |
| **Google Calendar** | ✅ Real start time | ✅ provider=`google_calendar` | ✅ source=`calendar` | ✅ `schedule[]` (DIRECT API, today only) | ✅ cal conflicts (DIRECT API) |
| **Google Meet** | ✅ Real start time | ✅ provider=`google_meet` | ✅ source=`calendar` | ❌ **Not referenced** | ❌ Not in digest |
| **GitHub** | ✅ Real `updated_at` | ✅ provider=`github` | ✅ source=`github` | ✅ `dev_activity[]` (DIRECT API) | ✅ digest count |
| **Google Docs** | ✅ Real `modifiedTime` | ✅ provider=`google_docs` | ✅ source=`docs` | ✅ `docs_knowledge[]` (DIRECT API) | ✅ digest count |
| **Notion** | ✅ Real timestamp | ✅ provider=`notion` | ✅ source=`notion` | ✅ `docs_knowledge[]` (DIRECT API) | ✅ digest count |
| **Calendly** | ✅ Real `start_time` | ✅ provider=`calendly` | ✅ source=`calendar` | ❌ **Not referenced** | ✅ digest count |
| **Trello** | ✅ Real `dateLastActivity` | ✅ provider=`trello` | ✅ source=`trello` | ❌ **Not referenced** | ✅ digest count |
| **Asana** | ✅ Real `modified_at` | ✅ provider=`asana` | ✅ source=`asana` | ❌ **Not referenced** | ✅ digest count |
| **Linear** | ✅ Real `updatedAt` | ✅ provider=`linear` | ✅ source=`linear` | ❌ **Not referenced** | ✅ digest count |
| **Monday.com** | ❌ `utcnow()-12h` **FAKE** | ✅ provider=`monday` | ✅ source=`monday` | ❌ **Not referenced** | ✅ digest count |
| **HubSpot** | ❌ `utcnow()` **LOST** | ✅ provider=`hubspot` | ✅ source=`hubspot` | ✅ `sales_pipeline[]` (from AE) | ✅ digest count |
| **Pipedrive** | ❌ `utcnow()` **LOST** | ✅ provider=`pipedrive` | ✅ source=`pipedrive` | ✅ `sales_pipeline[]` (from AE) | ✅ digest count |
| **Zoho CRM** | ❌ `utcnow()` **LOST** | ✅ provider=`zoho_crm` | ✅ source=`zoho_crm` | ✅ `sales_pipeline[]` (from AE) | ✅ digest count |
| **Mixpanel** | N/A | ❌ Returns `[]` | ❌ No data | ❌ Queries AE → empty | ❌ Excluded from digest |
| **Amplitude** | N/A | ❌ Returns `[]` | ❌ No data | ❌ Queries AE → empty | ❌ Excluded from digest |
| **PostHog** | N/A | ❌ Returns `[]` | ❌ No data | ❌ Queries AE → empty | ❌ Excluded from digest |
| **GAnalytics** | ✅ Real date | ✅ provider=`google_analytics` | ✅ source=`analytics` | ❌ **Not referenced** | ❌ Excluded from digest |

## Data Loss Points by Severity

### CRITICAL — Real timestamps lost for CRM providers

**Files:** `providers.py:870,893,908` (HubSpot), `providers.py:946` (Pipedrive), `providers.py:981,994,1008` (Zoho), `providers.py:340` (Monday)

All CRM events (HubSpot contacts/deals/companies, Pipedrive deals, Zoho contacts/deals/leads) and Monday items set `external_timestamp` to `datetime.utcnow()` at compile time instead of the actual creation/update time from the source API. This means:
- Every compile creates "new" events for all CRM records
- The feed shows all CRM items as "just happened"
- 2-hour dedup window in `get_normalized_feed_data` (line 272) catches only within 2 hours
- CRM records with real timestamps >2h ago will appear as duplicates on every compile

Monday.com uses `datetime.utcnow() - timedelta(hours=12)` — a fake timestamp that changes every compile, guaranteeing every item appears as new every time.

### HIGH — 4 task providers invisible in briefing

**File:** `briefing.py`

Trello, Asana, Linear, and Monday.com all compile into ActivityEvent (appear in feed) but are **never queried by the briefing**. The `tasks_feed` array is initialized as `[]` at line 244 and **never populated** — it's always empty. The LLM context has zero task data from any provider. The `ai_synthesis` section gets `helpful_tasks`, `distractions`, `blocked_items` from the internal `Task` model only (user-created tasks, not integration-synced).

### HIGH — Calendly data descriptive, not transactional

**File:** `briefing.py`

Calendly data (scheduled events with join URLs) compiles into ActivityEvent and appears in the feed, but is never included in the briefing. Briefing only handles calendar via direct Google Calendar API call. Calendly meetings are invisible to the LLM.

### MEDIUM — Briefing uses DIRECT API calls instead of ActivityEvent

**Files:** `briefing.py:262-310` (Calendar), `briefing.py:325-358` (Gmail), `briefing.py:411-427` (GitHub), `briefing.py:440-470` (Notion, Docs)

The briefing makes **separate direct API calls** for Gmail, Calendar, GitHub, Notion, and Google Docs instead of querying the `ActivityEvent` table. This means:
- Each briefing call makes 2-5 API requests
- The briefing bypasses the compiler entirely for these providers
- Data that was filtered/deduped by the compiler is re-fetched raw
- These calls are **independent** from the compile pipeline — they may return different data

### MEDIUM — Google Meet fetches are duplicate

**Files:** `providers.py:359-412` (getMeetData), `providers.py:139-189` (getCalendarData)

`getMeetData()` calls the exact same Google Calendar API with the same time window as `getCalendarData()`, then filters for events with meet links. This duplicates the API call. The same events are processed twice — once as `google_calendar` and once as `google_meet`.

### MEDIUM — Briefing `tasks_feed` always empty

**File:** `briefing.py:754`

The `tasks_feed` field in the briefing response is initialized to `[]` at line 244 and never populated. The API response always returns `"tasks_feed": []`.

### LOW — Slack pinned items not fetched

**File:** `providers.py:232-281` (getSlackData)

Only regular channel messages are fetched. Pinned messages, files, and bookmarks are never retrieved from Slack.

### LOW — Monday.com group data stored in details, not structured

**File:** `providers.py:341`

Group and board info stored as string in `details` field: `"Board: {board}, Group: {group}"`. Cannot be queried or filtered by board/group.

### LOW — Asana section/column data lost

**File:** `providers.py:609-637`

Asana tasks compiled with status `"Done"` or `"Active"` — the original section/column name (e.g., "In Progress", "Review", "Backlog") is lost.

## Pipeline Architecture Issues

### 1. Dual-fetch pattern
Gmail, Calendar, GitHub, Notion, and Google Docs are fetched **twice**: once by the compiler (into ActivityEvent) and once by the briefing (direct API). These are independent HTTP requests and may return different results.

### 2. Cooldown-based stale data
`_COMPILE_COOLDOWN_SECONDS = 300` means the feed shows data that's up to 5 minutes old. The briefing's direct API calls always get fresh data, but the feed is stale between compiles.

### 3. No pagination support
Every provider fetch caps at 200 items with `[:200]`. No cursor/offset pagination for providers that support it (GitHub, Gmail, Linear, etc.). Users with >200 items only see the first 200.

### 4. Analytics tools fully dead
`getMixpanelData`, `getAmplitudeData`, `getPosthogData` all return `[]`. Their code paths in both compiler and briefing exist but never produce data. Google Analytics is the only one with implementation, but it's excluded from briefing and dashboard digest.

### 5. Single-user architecture
`compile_activity_feed` uses `workspace.creator_id` to find integrations (`compiler.py:64`). Workspace members with their own integrations are invisible — only the workspace creator's integrations are compiled.

## Recommended Fix Priority

1. **Fix real timestamps** for HubSpot, Pipedrive, Zoho, Monday — pull actual `created_at`/`updated_at` from API responses
2. **Wire task providers into briefing** — query ActivityEvent for trello/asana/linear/monday → populate `tasks_feed`
3. **Wire Meet and Calendly into briefing** — query ActivityEvent or direct API
4. **Eliminate dual-fetch** — have briefing read from ActivityEvent instead of making separate API calls
5. **Eliminate Google Meet duplicate fetch** — merge into calendar fetch with meet-link filter
6. **Fix Monday.com fake timestamp** — extract real timestamp from API response
7. **Implement analytics providers** or remove dead code paths for mixpanel/amplitude/posthog
