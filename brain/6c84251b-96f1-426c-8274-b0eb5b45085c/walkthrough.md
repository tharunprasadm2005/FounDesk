# Walkthrough — Plan Page Premium Upgrade (Polished)

I have completed the requested visual polishes for the Plan page:

---

## 1. Active Milestones card resolution

* **Milestone Filtering**: Clarified the query selector to specifically filter by `goal_type === "monthly"` when checking active milestones (`goals.filter(g => g.goal_type === "monthly" && g.status === "in_progress").length`).
* **Interactive Coloring**: Tied the `.card-hero-value` color dynamically to the number of active milestones. When active milestones is `0`, the card applies the `neutral` (sand) styling rather than `positive` (green), preventing the round Clash Display `0` numeral from looking like an intentional green indicator circle. When one or more milestones are in progress, it correctly renders in bright green.

---

## 2. Segemented Tab Bar inactive icons color correction

* **Quiet Resting Color**: Added explicit CSS rule targets for `.plan-tab svg` inside [index.css](file:///c:/Users/tharu/FounDesk/frontend/src/index.css) to set inactive icons to a muted `var(--graphite)` color, shifting to `var(--sand)` on hover and `var(--ember-light)` only when the tab button is active.

---

## 3. Neumorphic Filter Dropdowns

* **Polished Select Elements**: Implemented a reusable `.plan-select` CSS class in `index.css` featuring inset neumorphic shadows, borderless layout, custom right-padding, and a custom SVG arrow chevron indicator (using `appearance: none;` and background SVG definitions) matching other neumorphic elements on the dashboard.
* **Filter Toolbar Application**: Configured both the "All Status" and "Newest" dropdowns in [Goals.jsx](file:///c:/Users/tharu/FounDesk/frontend/src/pages/Goals.jsx) to utilize the new `.plan-select` styling.

---

## 4. Verification

* Compiled the client source code with `npm run build` which successfully finished in 4.68 seconds with no errors.
