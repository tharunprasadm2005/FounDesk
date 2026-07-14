# FounDesk — Premium Design System v4 (Branding Orange Palette)

> Single source of truth for Antigravity. This replaces the v3 (navy/gold) design.md. The palette below is the founder's own brand colors, used exactly as supplied — nothing altered, nothing substituted. Everything else (materials, type, motion, component specs, architecture) is built to make that exact palette read as premium rather than as a generic dark-mode-with-orange-accent template.

---

## 0. Creative Direction

**Concept: Ignition.** FounDesk's brand color is a hot, confident orange on black — that's an energetic, founder-facing identity, closer to a performance instrument (a dashboard warning light, a tachometer redline, molten metal) than a boutique finance product. The design should lean into that: precise, high-contrast, a little dangerous-feeling in a controlled way — not soft, not pastel, not corporate-safe.

**Why this won't read as generic:** a black background with a single orange accent is one of the most common "AI-generated SaaS" defaults. What separates premium from generic here is everything *around* the color choice — the four-stop branding gradient (Section 1) used as a genuine signature element instead of a flat accent, a disciplined three-tier material system (Section 4) instead of uniform flat cards, a real type pairing instead of a default system font, and restraint: orange appears on purpose or not at all.

**Effect stack** (from the reference guide, combined deliberately):
1. **Dark Luxury** as the base atmosphere — near-black background, one true accent, low-opacity borders.
2. **Glassmorphism** for floating surfaces only (modals, drawers, command palette, scrolled nav).
3. **Neumorphism** for physical controls (buttons, toggles, the Gauge bezel) — same-color-as-background dual shadows.
4. **Bento Grid** for the landing page and Dashboard KPI row — varied tile sizes instead of a uniform 3-column grid.

Signature element: **the Ember Gradient** (Section 1) — the brand's own 4-stop gradient (black → deep red → orange → warm tan), used as the fill for the Gauge System's arc sweep, the hero headline's accent word, and any "in progress / active" state. This is what makes the product visually FounDesk's, not "a dark SaaS app with an orange button."

---

## 1. Color System — Exact Brand Palette

**Core palette, used exactly as supplied:**

| Token | Hex | RGB | Role |
|---|---|---|---|
| `--primary` | `#000000` | 0,0,0 | Page background |
| `--brand-orange` | `#E85002` | 232,80,20 | The single accent — CTAs, active states, focus rings, links |
| `--white` | `#F9F9F9` | 249,249,249 | Primary text on dark surfaces |
| `--light-gray` | `#A7A7A7` | 167,167,167 | Secondary text, muted icons |
| `--gray` | `#646464` | 100,100,100 | Tertiary text, disabled states |
| `--dark-gray` | `#333333` | 51,51,51 | Panel/card surfaces, elevated backgrounds, borders base |

**Ember Gradient — the signature (exact stops as supplied):**
```css
--gradient-ember: linear-gradient(
  90deg,
  #000000 0%,
  #C10801 38%,
  #F16001 72%,
  #D9C3AB 100%
);
```
Used only for: the Gauge System's arc fill, one accent word in the landing hero headline, the "active/in-progress" state sweep on progress indicators, and the depth-glow behind the hero section. Never used as a full section background — it's a highlight, not wallpaper.

**Derived surface tones** (built from `--dark-gray` at different opacities, so the panel hierarchy has depth without introducing new hues):
```css
--surface-0: #000000;              /* page background */
--surface-1: rgba(51,51,51,0.55);  /* panel */
--surface-2: rgba(51,51,51,0.85);  /* raised/hover panel */
--edge: rgba(232,80,20,0.14);      /* hairline border, orange-tinted */
--edge-strong: rgba(232,80,20,0.35); /* hover/active/focus border */
```

**Functional status colors — flagged addition:** the supplied palette has no green/blue, and a dashboard needs to distinguish success from error from informational at a glance without relying on the single brand accent for all three. I've added three muted tones in the same family logic (desaturated, jewel-toned, not stock RGB) so the interface stays legible. These are NOT part of your brand palette — flag if you'd rather these come from the gradient stops only (e.g. `#C10801` for error) instead:

| Token | Hex | Role |
|---|---|---|
| `--success` | `#3E8E5A` | Confirmed / on-track (muted olive-green) |
| `--error` | `#C10801` | Blocked / overdue — reuses gradient stop 2, stays in-palette |
| `--warning` | `#F16001` | Pending / needs review — reuses gradient stop 3 |
| `--info` | `#A7A7A7` | Informational — reuses light-gray, no new hue |

**60/30/10 rule:** 60% `--primary` (black), 30% `--surface-1`/`--surface-2` (dark gray panels), 10% `--brand-orange` + Ember Gradient. If orange shows up decoratively rather than on a CTA/active-state/focus-ring/gauge, that's a violation.

**Accessibility note:** `--white` and `--light-gray` on `--primary`/`--surface-1` pass AA/AAA comfortably. `--brand-orange` (#E85002) on pure black has a contrast ratio around 4.6:1 — sufficient for large text (≥18px) and UI components, but avoid small orange body text; use white/light-gray for small copy and reserve orange for buttons, icons, borders, and large numerals.

---

## 2. Typography — Premium Pairing for a Bold Brand

Given the brand is bold and energetic rather than editorial-quiet, the type pairing shifts from a delicate serif to a **confident contemporary display face** — this is the "Modern Startup" pairing direction (bold display + clean grotesk), which suits vivid orange-on-black far better than a serif would.

| Role | Typeface | Used for |
|---|---|---|
| **Display** | Clash Display (Fontshare) | Landing hero, section titles, big stat callouts — bold, geometric, confident |
| **Interface** | Satoshi (Fontshare) | All UI — nav, buttons, body copy, forms, tables |
| **Instrument** | JetBrains Mono | All numerals — currency, percentages, IDs, timestamps, table data (tabular-nums) |

**Type scale:**
```css
--font-display: clamp(56px, 7vw, 104px); font-weight: 700; letter-spacing: -0.03em; line-height: 0.98;
--font-h1: clamp(32px, 4vw, 48px); font-weight: 600; letter-spacing: -0.02em;
--font-h2: 26px; font-weight: 600;
--font-h3: 19px; font-weight: 600;
--font-body: 15px; font-weight: 440; line-height: 1.6; color: var(--white);
--font-small: 13px; font-weight: 440; color: var(--light-gray);
--font-data: 14px; font-family: var(--font-instrument); font-variant-numeric: tabular-nums; letter-spacing: 0.02em;
```

**Gradient text** (the one dramatic move, used once per page maximum): apply `--gradient-ember` to a single accent word in the hero headline —
```css
.gradient-word {
  background: var(--gradient-ember);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

**Hierarchy priority:** size → weight → color, in that order — never signal importance with color alone (Section 10). Dashboard/table pages follow an F-pattern (primary content and actions top-left); the landing page follows a Z-pattern (centered hero, alternating sections below).

---

## 3. Spacing

4px base grid, no arbitrary values in component code:
```css
--space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
--space-5: 24px; --space-6: 32px; --space-8: 48px; --space-10: 64px; --space-12: 96px;
```
12-column grid, 24px gutter, minimum 32px page margin — content never touches the viewport edge.

---

## 4. Material System — Three Tiers

### Tier 1 — Solid Panel (default; tables, lists, kanban cards, content cards)
```css
.panel {
  background: var(--surface-1);
  border: 1px solid var(--edge);
  border-radius: 10px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.5), 0 16px 36px rgba(0,0,0,0.4);
  padding: var(--space-5);
}
.panel:hover { border-color: var(--edge-strong); }
```

### Tier 2 — Neumorphic Control (buttons, toggles, checkboxes, gauge bezel, KPI tiles)
Element and background share `--dark-gray`; the raised/pressed illusion comes from a near-black shadow paired with a faint lighter highlight:
```css
.neu-control {
  background: #262626; /* dark-gray, slightly darker than panel for separation */
  border-radius: 14px;
  box-shadow:
    6px 6px 14px rgba(0,0,0,0.6),
    -6px -6px 14px rgba(100,100,100,0.10); /* --gray tinted highlight */
  transition: box-shadow 0.15s ease, transform 0.1s ease;
}
.neu-control:active, .neu-control.pressed {
  box-shadow:
    inset 4px 4px 10px rgba(0,0,0,0.6),
    inset -4px -4px 10px rgba(100,100,100,0.08);
  transform: translateY(1px);
}
```

### Tier 3 — Glass Overlay (modals, drawers, command palette, scrolled nav, dropdowns)
```css
.glass-panel {
  background: rgba(51,51,51,0.5);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid var(--edge);
  border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(249,249,249,0.06), 0 24px 48px rgba(0,0,0,0.5);
}
```
**Rule:** content the founder works with continuously → Tier 1. A control they press → Tier 2. Anything floating temporarily above the page → Tier 3. Never mix tiers on one element.

---

## 5. Component Library

### Buttons
| Variant | Spec |
|---|---|
| Primary | Tier-2 neumorphic base; on hover/active, fills with `--brand-orange`, text becomes `--primary` (black) for contrast |
| Secondary | Tier-1 panel, `--edge` border, `--white` text, border brightens on hover |
| Ghost | Transparent, `--light-gray` text, `--surface-1` fill on hover only |
| Destructive | Transparent, `--error` border and text — never solid fill |
All: `border-radius: 8px`, min 44×44px touch target, `aria-label` required on icon-only buttons, focus-visible ring `2px solid var(--brand-orange)` with 2px offset.

### Forms
- Inputs: Tier-1 flat, `--edge` border, focus → `--brand-orange` border + `0 0 0 3px rgba(232,80,20,0.15)` glow.
- Checkbox/toggle: Tier-2 neumorphic, checked state fills `--brand-orange` at 20% + orange check glyph.
- Validation: error border `--error` + inline text message + icon (never color alone). Success border `--success`.

### Tables
- Sticky header, `--font-small` uppercase `--light-gray`, `letter-spacing: 0.04em`.
- Alternating row tint (`--surface-0`/`--surface-1` at 4% difference), hover → `--surface-2`.
- Numeric columns right-aligned, `--font-data` (tabular-nums).
- Row actions appear on hover only, right-aligned.
- Sort: orange chevron on active column header.
- Mobile: collapses to stacked cards below 768px.

### Cards
- Standard: Tier-1 panel.
- Interactive/selectable: Tier-1 + hover lift `translateY(-3px)` + `--edge-strong` border.
- KPI/stat card: Tier-2 neumorphic housing a Gauge + `--font-data` value + `--font-small` label.

### Modals / Drawers
Tier-3 glass, scale+fade (modal) or slide-from-right (drawer), focus-trapped, Escape to close, body scroll locked.

### Status Badges
Pill, `--font-small`, `border-radius: 999px`, background = status color at 14% opacity, text = status color full opacity, border = status color at 30%. Tokens: `--success`, `--error`, `--warning`, `--info`.

---

## 6. The Gauge System (Signature Component)

- Neumorphic Tier-2 bezel containing an SVG arc: background track `--gray` at 25% opacity, foreground arc filled with `--gradient-ember`, proportional to value.
- Centered `--font-data` readout, tick mark at current position.
- Sweeps 0→value over 600ms ease-out on load and on every value change.
- Two sizes: Gauge L (96px — KPI cards) and Gauge S (32px — inline in tables/lists/kanban headers).
- Replaces every flat progress bar, percentage badge, or colored dot: goal completion, workload, decision confidence, schedule health, integration sync freshness.
- `aria-valuenow`/`aria-valuemin`/`aria-valuemax` exposed alongside the visual.

Build once as `components/ui/Gauge.tsx`.

---

## 7. Navigation

- **Sidebar:** fixed 240px (72px collapsed), `--surface-1` fill, hairline `--edge` right border. Active item: 2px `--brand-orange` left bar, icon shifts `--light-gray` → `--brand-orange`. Workspace switcher/logout in a Tier-2 neumorphic footer control.
- **Top bar:** page title left-anchored (F-pattern), primary action right-anchored, breadcrumbs in `--font-small`/`--light-gray` for nested pages.
- **Tabs:** animated orange underline sliding between selections, 250ms transform, arrow-key navigable.
- **Landing navbar:** transparent at top → Tier-3 glass past 60px scroll.
- **Mobile:** sidebar → fullscreen `--primary` overlay, 44px+ touch targets, hamburger animates to X.

---

## 8. Dashboard Experience

Bento-style KPI row (varied tile sizes, not uniform), F-pattern priority:
1. Top-left, largest: Active Goal — Gauge L in a Tier-2 KPI card.
2. Top row, secondary: Schedule Health, Priority Tasks — Gauge S KPI cards.
3. Left column below: Velocity chart (Tier-1 panel, Ember-gradient line fill), Active Blockers.
4. Right column: Meetings, Recent Decisions, Integration Digest — smaller text, `--light-gray`.

---

## 9. Motion

- Panel/section entry: stagger fade-up (`translateY(20px)→0`, 80ms stagger, 320ms), section-level only.
- Gauges: 600ms ease-out sweep on load and value change.
- Hover glow: `box-shadow: 0 0 0 1px var(--edge-strong), 0 0 20px rgba(232,80,20,0.15)`.
- Modal/drawer: scale+fade / slide-from-right, 250ms.
- Sitewide Lenis smooth scroll, disabled inside fixed-height containers (modals, drawers, kanban columns, table bodies).
- `prefers-reduced-motion`: disables all sweep/stagger/scroll motion, keeps instant state changes only.

---

## 10. Accessibility

- Contrast: white/light-gray on black/dark-gray passes AA/AAA. Brand orange reserved for large text (≥18px), icons, borders, button fills with black text on top — never small orange body text.
- Status never signaled by color alone — always paired with icon/text.
- Visible focus ring (`2px solid var(--brand-orange)`, 2px offset) on every interactive element.
- Full keyboard navigation; modals trap focus; Escape closes overlays.
- 44×44px minimum touch targets.
- Icon-only buttons get `aria-label`; gauges expose `aria-valuenow/min/max`.

---

## 11. Frontend Architecture & Component Reusability

- TypeScript adoption starting with `src/design/tokens.ts` and the shared UI library, then page-by-page migration.
- Design tokens as code: Section 1 values become CSS custom properties + a TS constants file; Tailwind config extends from the same source — retiring the per-page inline `C = {...}` objects.
- Shared component library (`src/components/ui/`): Button, Input, Select, Checkbox, Card, Table, Modal, Drawer, Badge, Gauge, Tabs, GlassPanel.
- Decompose the four 2000+ line pages (Goals, Execute, Memory, Settings) into feature-folder sub-components; page files become composition + data-fetching only.
- Consolidate the three duplicate notification-polling implementations into one `useNotifications` hook.
- Standardize on lucide-react everywhere, retiring the three competing custom icon lookups.
- Preserve all existing functionality and API contracts — this is a visual/structural upgrade, not a feature rewrite.

---

## 12. Page-by-Page Content Specifications

This section documents every component, data field, API endpoint, and UI structure present in each page. The current codebase uses inline `C = {...}` objects per page with slight inconsistencies (e.g., Login uses `#FF6B2B` while Dashboard/Execute/Settings use `#ff751f` for the accent). These specs define what *exists*; a v5 refactor should extract shared tokens into the design system (Section 1-5).

### 12.1 Login / Landing (`Login.jsx`)

**Purpose:** Marketing page + authentication gateway. Includes a splash intro animation.

**Splash (PageIntro):** Logo fade-in → accent line → "FounDesk" text → "founders ecosystem" tagline. Duration ~1.2s. Z-index 9999 overlay, auto-dismisses with `onDone` callback.

**Custom Cursor:** Three-layer system (dot, ring, glow) on desktop only. `(pointer: coarse)` media query disables. The dot is a fixed 6px orange circle; ring is a 24px border circle that expands on hover over interactive elements; glow is an 80px radial gradient blur. Tracks with sub-frame interpolation (12% lerp ring, 4% lerp glow).

**Floating Glass Nav (fixed top):** Backdrop-blur pill container, max-width 800px, centered. Scroll progress bar at bottom (orange gradient fill, scaled from 0-1). Logo, nav links (Showcase, Features, Integrations, FAQ), "Sign In" button (Mag component with parallax tilt). Nav shrinks to scale(0.98) when scrolled past 30px.

**Hero Section:** Two-column grid (0.95:1.45). Left column:
- Early access badge (pulsing dot + "FounDesk early access v1.0" in mono)
- Headline: "Build faster,\n*one decision*\nat a time." — uses three font treatments (light sans, italic serif with animated gradient flow, bold orange)
- Subtext: value proposition paragraph
- Two CTA buttons: "Explore Workspace" (orange filled + Mag parallax) and "Connected Tools" (ghost)
- Stats bar (3 items): "20+ Integrations connected", "v2 Current build version", "Early Access Platform access status"

**Right Column:**
- Spline 3D scene (SplineScene component, scene URL: `kZDDjO5HuC9GJUM2`)
- Concentric backdrop portal: 4 nested div layers (ping animation, pulse, blur-3xl gradient, spinning dashed border)
- Floating widgets: "⚡ 10ms Sync Latency" (top left, float-up animation) and "📊 19 Integrations Supported" (bottom right, float-down animation)

**Trust Bar:** Centered row of 4 items ("Built for Build founders", "Solo devs", "Agency owners", "Angel investors") with alternating pulsing dots.

**Platform Showcase (id="showcase"):** Two-column interactive preview (controls side + screen side). Three tabs:
1. **Unified Focus Feed** — "Daily Focus Goal: Refactor Auth API" + 3 task items (Review Linear Issue #204, Push production build, Log decision) with status badges
2. **Two-way Sync Hub** — 2×2 grid of integration cards (Linear Sync, GitHub Hooks, Notion Docs, Slack Alerts) with status/latency
3. **Decisions Registry** — 3 decision cards (FD-DEC-012, FD-DEC-011, FD-DEC-010) with code, title, author, date

Active tab highlighted with orange left bar + glow.

**Marquee Strip (id="integrations"):** Double-row scrolling brand logos (Linear, Asana, Trello, Notion, Slack, GitHub, Google, Figma, Jira). Row 1 scrolls left, Row 2 scrolls right. Mask-image fade at edges.

**Bento Feature Grid (id="features"):** 3 cards: "Goal Cascading Engine", "Decisions Log Archive", "Command Center Hub". Each with icon, gradient hover glow, hover lift translateY(-4px).

**How It Works (id="how-it-works"):** 3-step grid: Connect, Extract, Act. Step numbers in mono, icons, descriptions.

**FAQ (id="faq"):** Accordion-style FAQ list. Questions stored in array, onClick toggle with openFaqIndex state.

**Auth Modal (AuthModal component):** Tier-3 glass overlay. Handles `handleSuccess`, `authError`, `onClearError` props. Escape key closes.

### 12.2 Dashboard (`Dashboard.jsx`)

**Purpose:** Main command center showing workspace snapshot.

**Data Sources (fetched every 60s):**
- `GET /api/dashboard` — returns `command_strip` (active_goal, top_tasks, calendar_conflicts) and `signal_board` (blockers, inferred_decisions, active_task_count) and `sidebar` (todays_meetings, recent_decisions, integration_digest)
- `GET /api/notifications` — returns alerts for unlinked tasks

**Welcome Header:** "Welcome back, {user.name}" + formatted current date.

**KPI Strip (3-col grid):**
1. **Active Goal** — Icon + "Active Goal" label, circular progress gauge (SVG ring, 42px), goal title or "No active roadmap milestone. Add goal" link
2. **Focus Checklist** — Icon + "Focus Checklist" label, large count of P0/P1 items, "Open tasks workspace →" link
3. **Schedule Defense** — Icon + "Schedule Defense" label, conflict count (red) or "No Conflicts" (green), description text

**Two-Column Layout (1.55:1.35):**

*Left Column:*
1. **Velocity Trend** — SVG line/area chart with cubic bezier curves, gradient fill (accent at 28% → 0%), 7 data points (Mon-Sun), interactive hover with crosshair + glass tooltip showing value. Gridlines at 0/50/100%.
2. **Active Blockers** — Red-tinted card when blockers present. List of blocker items: title, hours blocked, source badge, "Unblock" link → `/execute?task={id}`
3. **Inferred Decisions** — Up to 3 decision cards with 100-char truncated text, context, "Confirm log" and "Edit" buttons → `/memory?decision={text}`

*Right Column:*
1. **Meetings Timeline** — Calendar events with time, conflict indicators. "Prep notes attached" label if meeting has notes.
2. **Recent Decisions** — Last 3 decisions with 80-char truncation, relative date (Today/Yesterday/N days ago), "Record a decision" link
3. **Integration Digest (24h)** — Provider → count pairs, "View more sources →" link, "Connect sources" link
4. **Workload** — "Active tasks" count display

**States:** Loading (animated "Fd" logo with "Synchronizing dashboard..." text), Empty (each card falls through to its default empty state with CTA link).

### 12.3 Goals / Plan (`Goals.jsx`)

**Purpose:** Roadmap planning with cascade goals, calendar defense, active phase tracking, and follow-ups.

**Data Sources:**
- `GET /api/goals`
- `GET /api/tasks?flat=true`
- `GET /api/workspaces`
- `GET /api/calendar/defense/rules`
- `GET /api/templates`
- `GET /api/follow-ups?status=pending`
- `PUT/POST/DELETE /api/goals/:id`, `/api/tasks/:id`

**Header:** "Plan" title + "Map your startup roadmap and defend operational focus." subtitle. "+ Add Milestone" button (cascade tab only).

**Segmented Tab Bar** (inline-flex pill, 4 items):
1. **Goal Cascade** — Expandable three-level hierarchy (Monthly → Weekly → Daily)
   - Filter/Sort bar: status select (All/Pending/In Progress/Completed/Failed), sort select (Newest/Oldest/Deadline), goal count
   - **Monthly goals** (orange-tinted "Monthly" badge): expandable cards with health indicator (overdue/due), status dropdown, delete ✕, title, owner, progress bar (clickable prompt to set 0-100), description (expand only), "Add Weekly Action Step" link
   - **Weekly goals** (blue-tinted "Weekly" badge): nested under monthly, same expand pattern, task count (done/total), inline status change, "Add Daily Step" link
   - **Daily goals** (green-tinted "Daily" badge): nested under weekly, dashed left border, task progress, @assignee
   - **Tasks** per goal: checkbox toggle (done = strikethrough + green check icon), priority badge (P0=red, P1=orange, P2=blue, P3=gray), status label
   - **Quick-add task forms** (inline input + "+" button per goal)
   - **Standalone weekly goals** section for goals without a parent monthly
   - Empty state: "No milestones mapped for this phase. Create First Goal"

2. **Calendar Defense**
   - Connected status indicator
   - Working hours config: start_hour/end_hour number inputs, Save button
   - Existing defense rules list
   - Suggestions from AI: each with "Approve" / "Dismiss" actions, start_time/end_time
   - Fetched on tab activate

3. **Active Phase**
   - Phase template selection (pre_seed, fundraising_sprint, product_launch_week, hiring_push, post_launch_recovery)
   - Apply phase button
   - Phase detail: template name, description, checklist items (toggle completion, stored in localStorage per template, not API)
   - "Create Task from Checklist" action for each item
   - Auto-selects active template on load

4. **Follow-ups**
   - Pending follow-ups list from API
   - Each item: title, context text, contact info, scheduled date, relative age (today/yesterday/N days ago)
   - Status toggle: pending → completed/dismissed via `PUT /api/follow-ups/:id`

**Goal Create Modal:** Form fields — title, description, goal_type (monthly/weekly/daily), parent_id, due_date, assignee_id. Inline state, no external drawer/modal library.

### 12.4 Execute (`Execute.jsx`)

**Purpose:** Task management with kanban, list view, blocker panel, and daily standups.

**Data Sources:**
- `GET /api/tasks?flat=true`, `GET /api/goals`, `GET /api/workspaces`
- `GET /api/decisions`, `GET /api/notes`
- `GET /api/standups?date={date}`
- `PUT/POST/DELETE /api/tasks/:id`
- `PUT/POST /api/standups`

**Header:** "Execute" title + "Execute active milestone sprints and check-in daily." subtitle. "+ New Task" button.

**Segmented Tab Bar** (4 items): Kanban Board, List View, Blocker Panel, Daily Standups.

**Filter Bar** (Kanban/List only): status, priority, phase, assignee selects. Kanban-specific extras: goal filter, sort (Default/Priority/Deadline/Newest), group (None/Status/Assignee/Phase/Priority), WIP Limits toggle.

**Kanban Board:**
- 5 columns: Not Started, In Progress, Blocked, Done, Cancelled (order customizable, collapsed set tracked)
- Drag-and-drop: `onDragStart`/`onDragOver`/`onDrop` with immediate API update
- WIP limits per column (configurable inline, 0 = no limit)
- Swimlane grouping: when groupBy is set, renders a group header + independent kanban row per group
- Cards: title, subtask progress bar (done/total), priority tag, phase tag, overdue indicator (color-coded left border), assignee avatar
- Column collapse via click on header
- Overflow indicator when WIP exceeded

**List View:**
- Rows with: bulk-select checkbox (orange when selected), title + description preview, "✓ Done" / "↻ Reopen" toggle, inline status dropdown (dropdown menu with colored circles), priority chip, phase tag, overdue label (red/orange/gray), deadline date, assignee initials avatar
- Expandable detail: assigned to, goal name, estimated hours, parent task, full description, subtask progress bar, blocker alert (red box), Edit/Delete actions
- Left border color: overdue (red/orange), blocked (red), transparent otherwise
- Selected row highlight with orange background tint

**Blocker Panel (2-column):**
- Left: blocked tasks list with search bar + sort (priority/oldest/newest/overdue). Per task: title, description, priority, deadline, assignee, blocker_description. Actions: "Resolve" (→ In Progress), "Extend" (new deadline input), "Reassign" (member select), "Ask" (text input for notes)
- Right: summary — blocker count, overdue count, per-priority breakdown

**Daily Standups (2-column):**
- Left: date navigator (prev/today/next) + submit form — three textareas (Q1: Yesterday, Q2: Today, Q3: Blockers), Submit button
- Right: submissions feed. Each card: user avatar circle (initials), name, date, expandable content (Yesterday/Today/Blockers in labeled boxes), streak count, edit button (own submissions), "Create Task from Item" link. "Non-responders" section at bottom.

**Task Drawer (slide-from-right):** 420px, backdrop-blur, border-left. Shows full task detail with linked items. `GET /api/tasks/:id/detail`.

**Create/Edit Modal (overlay + centered box):** Form fields: title, description, priority (P0-P3), status, deadline, goal_id, parent_id, assignee_id, estimated_hours, phase_tag, linked_decision_id, linked_meeting_id, linked_task_ids.

### 12.5 Memory (`Memory.jsx`)

**Purpose:** Decision log, meeting notes, knowledge transfer, and chronicle timeline.

**Data Sources:**
- `GET /api/decisions?search=&status=&decision_type=`
- `GET /api/notes?search=&meeting_type=&status=`
- `GET /api/knowledge?search=&knowledge_type=`
- `GET /api/handoff/packets`
- `GET /api/chronicle?limit=&offset=&search=&event_type=&stage=`
- `GET /api/pipeline/status`
- `PUT/POST/DELETE /api/decisions/:id`, `/api/notes/:id`, `/api/knowledge/:id`
- `POST /api/notes/auto-process`, `POST /api/pattern-engine/run-all`

**Header:** "Memory Vault" title + contextual subtitle per active tab.

**Segmented Tab Bar** (4 items): Decision Log, Meeting Notes, Knowledge Transfer, Chronicle Timeline.

**Decision Log:**
- Search bar (with magnifying glass icon), status filter (All Stages/Proposed/Confirmed/Rejected), type filter (All Types/Product/Hiring/Sales/Financial/Technical/Strategic), count display
- Card grid (auto-fill minmax 340px): status badge ("Proposed" or "Confirmed" in orange mono), decision_type badge (colored per type: product=indigo, hiring=pink, sales=teal, financial=yellow, technical=purple, strategic=orange), source integration label, confidence dot (High=green/Medium=yellow/Low=orange)
- Decision title (14px bold, Syne font), context (11.5px, 2-line clamp)
- Actions: "✓ Confirm" (if pending), "✎ Edit" (inline: input + textarea + Save/Cancel), "✕ Delete"
- Inline editing: replaces title/context with input fields, Save/Cancel buttons
- Empty state: pipeline info display (integrations connected, events fetched, last LLM call time)

**Meeting Notes:**
- Search bar, meeting type filter (Sprint Planning/Standup/Investor Sync/Client Call/Retro/1:1/All Hands/Brainstorm/Other), status filter (All Statuses/Draft/Finalized/Archived), count display
- Card grid: meeting type badge (colored: planning=indigo, review=teal, sync=yellow, demo=pink, interview=purple, investor=orange, customer=blue), source integration badge, status dot (green/yellow/gray), date
- Title (14px bold, Syne), attendees, summary (11.5px)
- Sections: "Key Topics" (bullet list), "Decisions Made" (orange box with linked count), "Action Items" (blue box with linked count), "Follow-up Needed" (yellow box)
- Footer: status dropdown, Delete link
- Empty state: similar pipeline info display

**Knowledge Transfer / Handoff:**
- Search bar, knowledge type filter (All/Lessons Learned/Architecture/Playbooks/Insights/Best Practices/Documentation/Retrospectives/Tips), "Sync Knowledge" button, "+ Add Knowledge" button
- Expandable Add Knowledge form: title input, type select, summary textarea, key points textarea (one per line), applies to input, Save/Cancel
- Knowledge items grid: type badge (colored per type), source badge ("manual" in green), status dot (verified=green, auto_inferred=purple), date, title, summary, key points list, "Applies to" field, confidence label (High/Medium/Low with color), Verify button (for auto_inferred), Delete
- Handoff packets section: past packets list, selectable to view packet detail (auto-saved state snapshots)

**Chronicle Timeline:**
- Search bar, event type filter, stage filter, total count
- Infinite scroll: "Load More" button, paginated with limit=30, offset tracking
- Event cards: timestamp, event type badge, title, description, expandable detail

### 12.6 Settings (`Settings.jsx`)

**Purpose:** Workspace configuration, integrations, team management, notifications, account, billing, API keys.

**Data Sources:**
- `GET /api/integrations`, `POST /api/integrations/oauth/url`, `POST /api/integrations/oauth/callback`, `DELETE /api/integrations/:id`
- `GET/PUT /api/workspaces`, `GET /api/workspaces/:id/org-chart`, `GET /api/workspaces/:id/permissions`, etc.
- `GET /api/notifications/preferences`, `PUT /api/notifications/preferences`
- `GET/POST/DELETE /api/developer/api-keys`
- `GET /api/billing/plan`, `POST /api/billing/create-order`, `POST /api/billing/verify`
- `POST /api/pattern-engine/run-all`
- Various sub-APIs for team management, invites, etc.

**Header:** "Settings" title + "Configure workspace stages, team permissions, and third-party API syncs."

**Segmented Tab Bar** (7 items): Connected Apps, Workspaces, Notifications, Team Space, Account, Billing, API Keys.

**Connected Apps (Accordion categories):**
- Communication Tools: Gmail, Outlook Email, Slack, Microsoft Teams, WhatsApp Business
- Calendar & Meeting: Google Calendar, Outlook Calendar, Calendly, Zoom, Google Meet
- Docs + Tasks + Wikis: Linear (supported), Jira, Trello (supported), Asana (supported), Monday.com (supported), GitHub (supported), GitLab, Notion (supported), Google Docs
- Sales & CRM: HubSpot (supported), Salesforce, Zoho CRM (supported), Pipedrive (supported)
- Finance: Razorpay, Stripe, PayU, Zoho Books
- Analytics & Growth: Google Analytics (supported), Mixpanel (supported), Amplitude (supported), Metabase, Looker, PostHog (supported)
- Each app card: icon, name, status badge (CONNECTED=green/UNLINKED=gray), email display, Connect/Disconnect button. GA4 has extra Property ID input.
- Auto-connect on first load from .env credentials. OAuth callback handling on page load.

**Workspaces:**
- Summary stats bar: Workspaces, Total Members, Total Goals, Open Tasks, Blockers (each in colored stat card)
- Workspace management: create modal (name, description, stage, color), archive, role update
- Workspace health cards: name, stage, active_phase, member count, goal/task counts, role badge, actions
- Workspace config form: name, stage, active phase, working hours (start/end hour), delete (double-confirm)

**Notifications:**
- Toggle switches for: blocker_detected, daily_briefing, follow_up_due, decision_confirmation, member_joined, phase_change, weekly_digest
- Save button with status message
- Recent notification history (last 5)

**Team Space (with sub-tabs):**
- **Members:** invite single (email + role), bulk invite (textarea), member list with role badges (founder=orange, admin=blue, member=gray), remove, switch workspace, incoming invites accept/decline
- **Org Chart:** hierarchical tree view per workspace
- **Workload:** per-member active task counts
- **Activity:** recent workspace activity feed
- **Sub-teams:** create team (name, description), manage memberships (add/remove)

**Account:**
- User profile: name, email, role, avatar
- Account stats
- Auto-connect integrations toggle

**Billing (duplicates Billing.jsx):**
- Plan card: Starter Plan, price (₹/month), status badge
- Trial/past_due/cancelled banners
- Feature checklist (5 items)
- Upgrade button with Razorpay checkout

**API Keys:**
- Keys list: name, masked key, created date, status, "Revoke" button (double-confirm)
- Create API key: name input, shows full key once, then masked

### 12.7 Billing (`Billing.jsx`)

**Purpose:** Standalone billing page (also appears as Settings tab).

**Data Sources:**
- `GET /api/billing/config`
- `GET /api/billing/plan`
- `POST /api/billing/create-order`
- `POST /api/billing/verify`

**Layout:** Centered card (max-width 720px). Plan name "Starter Plan", amount (₹X/month), status badge (active/trial/past_due/cancelled). Status-specific banners (trial remaining days, payment failed, cancelled). Plan features list (5 items with checkmarks). Upgrade button (disabled until Razorpay script loads). Uses Razorpay checkout (`https://checkout.razorpay.com/v1/checkout.js`). On success: calls verify endpoint, updates subscription status.

### 12.8 Sidebar (`Sidebar.jsx`)

**Purpose:** Persistent navigation + workspace switcher + notification center.

**Structure:** Fixed 240px (collapsed 72px), `--surface-1` fill, `--edge` right border, z-index 200.

**Collapse state:** stored in localStorage. Animated width transition. ChevronLeft/ChevronRight toggle button.

**Logo section:** Logo component, showText prop based on collapsed state.

**Workspace Switcher (non-collapsed only):** Dropdown with workspaces list (fetched from `GET /api/workspaces`, filtered by `member_status === "active"`), role badge, create workspace form (name input + Create/Cancel). Active workspace highlighted with orange left bar + background tint. Uses `ChevronsUpDown` expand icon.

**Navigation:** 5 `NavLink` entries with lucide-react icons:
- Dashboard (`LayoutDashboard`)
- Plan (`Target`)
- Execute (`Zap`)
- Memory (`Brain`)
- Settings (`Settings`)

Active link: orange left border (3.5px), orange text, orange background tint (6%). Collapsed: centered icons, no labels.

**Footer (Neumorphic bezel):** User avatar (image or initial in orange circle), first name truncation, notification bell (with unread dot), logout button (red on hover). Notifications panel: Tier-3 glass, absolute above footer, scrollable list with title + message + timestamp, "Mark all read" button.

### 12.9 Shared/Global Components

- **Logo**: `components/Logo.jsx` — renders FounDesk wordmark with optional showText, accepts size prop
- **AuthModal**: `components/AuthModal.jsx` — email/password or social auth, handleSuccess callback
- **SplineScene**: `components/SplineScene.jsx` — 3D scene renderer for landing page
- **RadialOrbitalTimeline**: `components/RadialOrbitalTimeline.jsx` — animated timeline visualization
- **useNotifications hook**: `hooks/useNotifications.js` — polling notification data, unreadCount, markAsRead/markAllAsRead
- **Track utility**: `utils/track.js` — analytics event tracking
- **API utility**: `utils/api.js` — axios instance with auth interceptor

---

## 13. Anti-Patterns — Do Not Do

- Any hex outside Section 1's palette (core + the four flagged functional additions).
- Orange used decoratively rather than on CTA/active-state/focus/gauge/border.
- The Ember Gradient used as a full section background rather than a highlight.
- Mixing material tiers on one element.
- Small orange body text on black (accessibility violation).
- Color-only status signaling.
- More than one gradient-text word per page.
- Pure system-font UI — Clash Display/Satoshi/JetBrains Mono only.