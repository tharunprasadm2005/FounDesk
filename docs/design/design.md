# FounDesk — Japandi Design System

## 1. Philosophy

Japandi = Japanese wabi-sabi + Scandinavian functionality. Merge minimalism, natural materials, muted tones, generous space. Goal: calm, premium, trustworthy SaaS feel. Remove visual noise. Let data breathe.

Core principles:
- Ma (間) — negative space is a design element, not empty space.
- Function over decoration.
- Muted, earthy palette over saturated tech-blue defaults.
- Warmth through texture, not color.
- Precision in grid, softness in tone.

---

## 2. Colour Palette

### Primary Neutrals (base)
| Token | Hex | Usage |
|---|---|---|
| `--washi-white` | #F7F4EF | App background |
| `--linen-100` | #EFEAE2 | Card/panel background |
| `--stone-200` | #E3DDD2 | Borders, dividers |
| `--stone-400` | #B7AE9E | Muted text, placeholders |
| `--sumi-900` | #2B2A27 | Primary text (soft black, not pure #000) |

### Accent (replacing old indigo/navy/amber)
| Token | Hex | Usage |
|---|---|---|
| `--indigo-ink` | #3C4A5E | Primary actions, links (desaturated navy-indigo) |
| `--moss-600` | #6B7A5E | Success, growth states |
| `--clay-500` | #B5654A | Alerts, urgent flags (terracotta, not red) |
| `--sand-400` | #C9A876 | Accent highlights, badges (muted amber) |

### Rules
- No pure white (#FFF), no pure black.
- Max 1 accent color per screen section.
- Status colors desaturated 20-30% vs standard SaaS red/green/yellow.

---

## 3. Typography

### Typeface Pairing
- **Headings**: Fraunces (serif, warm, editorial) — variable weight 300–600.
- **Body/UI**: Inter or IBM Plex Sans — weight 400/500 only.
- **Numerals/Data**: IBM Plex Mono — for metrics, timestamps, IDs.

### Scale (1.25 ratio, base 16px)
| Level | Size | Weight | Font |
|---|---|---|---|
| Display | 40px | 400 | Fraunces |
| H1 | 32px | 500 | Fraunces |
| H2 | 24px | 500 | Fraunces |
| H3 | 19px | 500 | Inter |
| Body | 16px | 400 | Inter |
| Small | 14px | 400 | Inter |
| Caption | 12px | 400 | Plex Mono |

### Rules
- Line height 1.6 body, 1.3 headings.
- Letter spacing: -0.01em headings, 0 body.
- Never bold below H3. Use color/size for hierarchy, not weight.

---

## 4. Layout & Spatial Composition

### Grid
- 12-column, 24px gutter, max content width 1280px.
- Base spacing unit: 8px. Scale: 8/16/24/32/48/64/96.

### Composition Rules
- Minimum 48px padding around primary content blocks.
- Cards: no heavy shadows. Use 1px `--stone-200` border + 2px offset shadow max.
- Asymmetric layouts encouraged (60/40 splits) over centered symmetry.
- One focal element per view — Morning Briefing headline, not a grid of 8 equal widgets.
- Dashboard: single-column reading flow on mobile, 2-column max on desktop.

### Component Style
- Border radius: 4px (sharp, architectural) — not 12–16px bubbly.
- Buttons: flat fill or 1px outline. No gradients, no drop shadows.
- Dividers: thin hairline (1px `--stone-200`), generous whitespace instead of boxed containers.
- Icons: line-based, 1.5px stroke, no filled/glyph style.

---

## 5. Motion

- Transitions: 200–280ms ease-out only.
- No bounce, no spring easing.
- Fade + 4px translate for entrances. No scale/zoom effects.

---

## 6. Voice in UI Copy

- Short sentences. No exclamation marks.
- "Your morning briefing is ready." not "🎉 Your briefing is HERE!"

---

## 7. Application to Morning Briefing MVP

- Email template: washi-white background, Fraunces headline, single accent (clay-500) for urgent items only.
- Body copy in Inter, 16px, generous 1.6 line height.
- Metrics in Plex Mono, right-aligned, muted stone-400 labels.
