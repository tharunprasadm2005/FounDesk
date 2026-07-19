# DESIGN-SKILL.md
## The Ultimate Website Design Reference Guide
> Everything you need to design and build a stunning website — from color science to the latest design aesthetics.

---

# TABLE OF CONTENTS

1. [Design Thinking & Process](#1-design-thinking--process)
2. [Color Theory & Usage](#2-color-theory--usage)
3. [Typography](#3-typography)
4. [Layout & Spatial Composition](#4-layout--spatial-composition)
5. [Design Styles Encyclopedia](#5-design-styles-encyclopedia)
   - Neomorphism (Neumorphism)
   - Glassmorphism
   - Claymorphism
   - Neobrutalism
   - Brutalism
   - Minimalism
   - Maximalism
   - Skeuomorphism
   - Flat Design
   - Material Design
   - Aurora / Gradient Mesh
   - Dark Mode & Neon Noir
   - Retro / Y2K
   - Bento Grid
   - Organic / Biomorphic
   - Swiss / International Style
   - Art Deco
   - Memphis Design
   - Cyberpunk / Sci-Fi UI
   - Japandi
   - Cottagecore / Soft Aesthetic
6. [Motion & Animation](#6-motion--animation)
7. [UI Components & Patterns](#7-ui-components--patterns)
8. [Backgrounds, Textures & Visual Depth](#8-backgrounds-textures--visual-depth)
9. [Accessibility & Contrast Standards](#9-accessibility--contrast-standards)
10. [CSS Variable Systems](#10-css-variable-systems)
11. [Responsive Design Principles](#11-responsive-design-principles)
12. [Design Combinations & Hybrid Styles](#12-design-combinations--hybrid-styles)
13. [Quick Reference: Do's & Don'ts](#13-quick-reference-dos--donts)

---

# 1. DESIGN THINKING & PROCESS

Before writing a single line of code or picking a color, define these:

## The Five Pillars

| Pillar | Question to Answer |
|---|---|
| **Purpose** | What problem does this interface solve? |
| **Audience** | Who uses it? Age, tech-literacy, context? |
| **Tone** | Serious? Playful? Luxurious? Gritty? |
| **Differentiation** | What makes it unforgettable? |
| **Constraints** | Performance budget, accessibility, framework? |

## The Design Direction Spectrum

```
← MINIMAL ─────────────────────────────────── MAXIMAL →
   Swiss         Flat     Material    Glassmorphism    Memphis
   Japandi      Bento    Dark Neon    Claymorphism     Cyberpunk
```

Pick a direction and commit fully. A design that tries to be everything ends up being nothing.

## Creative Process Checklist

- [ ] Define primary color (1), accent (1), neutral palette
- [ ] Choose 1 display font + 1 body font (never more than 3 fonts)
- [ ] Establish spacing scale (8px base grid recommended)
- [ ] Pick a layout paradigm (grid, asymmetric, editorial, bento)
- [ ] Decide on motion level: none / subtle / expressive
- [ ] Choose a style anchor (Glassmorphism, Neobrutalism, etc.)
- [ ] Define dark or light mode (or both)

---

# 2. COLOR THEORY & USAGE

## 2.1 Core Color Models

### RGB (Screen)
Red, Green, Blue — the building blocks of all digital color. Each channel 0–255.
```css
color: rgb(79, 70, 229);
```

### HSL (Designer's Model)
Hue (0–360°), Saturation (0–100%), Lightness (0–100%). Best for systematic color manipulation.
```css
color: hsl(243, 75%, 59%);
/* Adjust L for tints/shades; adjust S for muted/vivid */
```

### HEX
6-digit shorthand for RGB. Most common in web development.
```css
color: #4F46E5;
```

---

## 2.2 Color Relationships (Color Harmonies)

### Monochromatic
Single hue at different lightness/saturation levels. Clean, minimal, elegant.
```
Base: hsl(220, 70%, 50%)
Tint: hsl(220, 70%, 85%)
Shade: hsl(220, 70%, 20%)
```
**Best for:** Minimalism, Japandi, Neomorphism, clean dashboards.

### Complementary
Two colors directly opposite on the color wheel. Maximum contrast, vibrant energy.
```
Blue #2563EB + Orange #EA580C
Purple #7C3AED + Yellow #CA8A04
```
**Best for:** CTAs, high-energy brands, attention-grabbing UI.

### Analogous
Three adjacent colors on the wheel. Harmonious, natural.
```
Blue → Teal → Green
Red → Orange → Yellow
```
**Best for:** Nature-inspired, organic, warm/cool themed UIs.

### Triadic
Three equidistant colors. Bold, playful, varied.
```
Red + Yellow + Blue (primary triad)
Orange + Green + Purple (secondary triad)
```
**Best for:** Memphis, Maximalism, playful consumer apps.

### Split-Complementary
Base + two colors adjacent to its complement. Harmony with contrast.
```
Blue + Yellow-Orange + Red-Orange
```

### Tetradic / Square
Four colors evenly spaced. Rich but requires skill to balance.

---

## 2.3 Color Palette Construction

### The 60-30-10 Rule
| Role | % | Usage |
|---|---|---|
| **Primary / Dominant** | 60% | Backgrounds, large surfaces |
| **Secondary** | 30% | Cards, sidebars, sections |
| **Accent** | 10% | CTAs, highlights, icons, links |

### Tint/Shade Scale (per color)
Generate a full scale for any base hue:
```
50  → Near-white tint    (L: 95%)
100 → Very light         (L: 90%)
200 → Light              (L: 80%)
300 → Light-mid          (L: 70%)
400 → Mid                (L: 60%)
500 → Base color         (L: 50%) ← starting point
600 → Mid-dark           (L: 40%)
700 → Dark               (L: 30%)
800 → Very dark          (L: 20%)
900 → Near-black shade   (L: 10%)
```
Example (Indigo):
```css
--indigo-50:  #EEF2FF;
--indigo-100: #E0E7FF;
--indigo-200: #C7D2FE;
--indigo-300: #A5B4FC;
--indigo-400: #818CF8;
--indigo-500: #6366F1; /* base */
--indigo-600: #4F46E5;
--indigo-700: #4338CA;
--indigo-800: #3730A3;
--indigo-900: #312E81;
```

---

## 2.4 Semantic Color Roles

Always assign colors to semantic roles, not just aesthetics:

```css
:root {
  /* Brand */
  --color-primary: #4F46E5;
  --color-primary-hover: #4338CA;
  --color-primary-light: #EEF2FF;

  /* Neutrals */
  --color-bg: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-border: #E5E7EB;
  --color-text: #111827;
  --color-text-muted: #6B7280;
  --color-text-subtle: #9CA3AF;

  /* States */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;

  /* Accent */
  --color-accent: #EC4899;
}
```

---

## 2.5 Color Psychology

| Color | Emotion / Association | Industries |
|---|---|---|
| **Red** | Urgency, passion, danger, energy | Food, retail sales, emergency |
| **Orange** | Warmth, enthusiasm, creativity | Tech, food, youth brands |
| **Yellow** | Optimism, attention, caution | Fintech, children, food |
| **Green** | Nature, growth, health, money | Finance, health, eco |
| **Blue** | Trust, stability, calm, intellect | Tech, finance, healthcare |
| **Purple** | Luxury, mystery, creativity | Beauty, luxury, spiritual |
| **Pink** | Playfulness, romance, femininity | Fashion, beauty, lifestyle |
| **Black** | Sophistication, power, elegance | Luxury, fashion, tech |
| **White** | Cleanliness, minimalism, space | Healthcare, tech, lifestyle |
| **Gray** | Neutrality, balance, professionalism | Corporate, tech, editorial |

---

## 2.6 Dark Mode Color Principles

Dark mode ≠ just inverting colors. Follow these rules:

```css
/* WRONG — pure black background is harsh */
background: #000000;

/* RIGHT — dark gray with slight warmth or coolness */
background: #0F172A;  /* Cool dark (Slate) */
background: #1C1917;  /* Warm dark (Stone) */
background: #111827;  /* Neutral dark (Gray) */
```

**Dark Mode Hierarchy:**
```
Layer 0 (base bg):    #0F172A
Layer 1 (cards):      #1E293B   (+7-10 L steps)
Layer 2 (elevated):   #293548   (+3-5 more)
Layer 3 (tooltip/modal): #334155
```

**Text on Dark:**
```css
--text-primary:  rgba(255,255,255, 0.92);  /* Main content */
--text-secondary: rgba(255,255,255, 0.60); /* Supporting text */
--text-disabled: rgba(255,255,255, 0.38);  /* Disabled states */
```

**Key Rules:**
- Never use pure white (#FFF) on dark — use off-whites
- Desaturate accent colors slightly (~10-15% saturation reduction) for dark mode
- Increase border opacity — borders need to be more visible on dark
- Colored backgrounds (cards, badges) should be darker and more muted than light mode equivalents

---

## 2.7 Gradient Design

### Linear Gradients
```css
/* Two-color smooth */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Three-stop with midpoint control */
background: linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%);

/* Subtle surface gradient */
background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
```

### Radial Gradients (Spotlight / Glow)
```css
/* Center spotlight */
background: radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.3) 0%, transparent 70%);

/* Corner glow */
background: radial-gradient(circle at top right, #7C3AED22, transparent 60%);
```

### Conic Gradients
```css
/* Color wheel */
background: conic-gradient(from 0deg, red, yellow, green, blue, red);

/* Pie chart-like */
background: conic-gradient(#4F46E5 0% 40%, #EC4899 40% 70%, #10B981 70% 100%);
```

### Mesh / Aurora Gradients
```css
/* Aurora effect with multiple radial layers */
background-color: #0f0f23;
background-image:
  radial-gradient(ellipse at 20% 50%, rgba(120, 40, 200, 0.4) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 20%, rgba(40, 100, 255, 0.3) 0%, transparent 50%),
  radial-gradient(ellipse at 60% 80%, rgba(0, 200, 150, 0.3) 0%, transparent 50%);
```

### Gradient Text
```css
.gradient-text {
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

# 3. TYPOGRAPHY

## 3.1 Type Scale

Use a modular scale. Recommended ratio: **1.25 (Major Third)** or **1.333 (Perfect Fourth)**

```
Base: 16px (1rem)

Scale (×1.25):
xs:   12px  (0.75rem)
sm:   14px  (0.875rem)
base: 16px  (1rem)
lg:   20px  (1.25rem)
xl:   24px  (1.5rem)
2xl:  30px  (1.875rem)
3xl:  38px  (2.375rem)
4xl:  48px  (3rem)
5xl:  60px  (3.75rem)
6xl:  76px  (4.75rem)
```

## 3.2 Font Pairing Rules

**Rule: 1 Display font + 1 Body font. Maximum 3 font families.**

| Display Font | Body Font | Vibe |
|---|---|---|
| Playfair Display | Source Serif Pro | Editorial luxury |
| Bebas Neue | DM Sans | Bold modern |
| Cormorant Garamond | Jost | Refined elegance |
| Cabinet Grotesk | Satoshi | Contemporary tech |
| Clash Display | General Sans | Startup/SaaS |
| Syne | Instrument Sans | Creative agency |
| Fraunces | Libre Baskerville | Artisanal |
| Unbounded | Space Grotesk | Futuristic |
| Libre Caslon | Work Sans | Classic digital |
| Anton | Open Sans | High-impact |

## 3.3 Typography CSS Variables

```css
:root {
  --font-display: 'Clash Display', sans-serif;
  --font-body: 'Satoshi', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Weights */
  --fw-light: 300;
  --fw-regular: 400;
  --fw-medium: 500;
  --fw-semibold: 600;
  --fw-bold: 700;
  --fw-extrabold: 800;
  --fw-black: 900;

  /* Line heights */
  --lh-tight: 1.1;
  --lh-snug: 1.25;
  --lh-normal: 1.5;
  --lh-relaxed: 1.625;
  --lh-loose: 2;

  /* Letter spacing */
  --ls-tighter: -0.05em;
  --ls-tight: -0.025em;
  --ls-normal: 0;
  --ls-wide: 0.025em;
  --ls-wider: 0.05em;
  --ls-widest: 0.1em;
}
```

## 3.4 Heading Styles

```css
/* Hero headline */
.hero-headline {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

/* Section title */
.section-title {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

/* Card heading */
.card-heading {
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.3;
}

/* Body text */
.body-text {
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0.01em;
}

/* Caption / label */
.caption {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

---

# 4. LAYOUT & SPATIAL COMPOSITION

## 4.1 Spacing Scale (8px Grid)

```css
:root {
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
}
```

## 4.2 Layout Paradigms

### Classic Column Grid
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 1.5rem;
}
```

### Asymmetric / Broken Grid
```css
.broken-grid {
  display: grid;
  grid-template-columns: 1fr 1.618fr; /* Golden ratio */
  gap: 2rem;
}

/* Overlapping elements */
.overlap-card {
  grid-column: 1 / 3;
  grid-row: 1 / 2;
  z-index: 2;
  transform: translate(2rem, 2rem);
}
```

### Bento Grid
```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  gap: 1rem;
}

.bento-wide  { grid-column: span 2; }
.bento-tall  { grid-row: span 2; }
.bento-large { grid-column: span 2; grid-row: span 2; }
```

### Full-Bleed / Magazine Layout
```css
.magazine-layout {
  display: grid;
  grid-template-columns:
    [full-start] 1fr
    [content-start] min(70ch, 100%) [content-end]
    1fr [full-end];
}

.full-bleed {
  grid-column: full;
}

.content-width {
  grid-column: content;
}
```

## 4.3 Border Radius Scale

```css
:root {
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:  12px;
  --radius-xl:  16px;
  --radius-2xl: 24px;
  --radius-3xl: 32px;
  --radius-full: 9999px;  /* Pill shape */
}
```

## 4.4 Shadow Scale

```css
:root {
  --shadow-xs:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg:  0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-xl:  0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04);
  --shadow-2xl: 0 25px 50px rgba(0,0,0,0.25);

  /* Colored shadows */
  --shadow-primary: 0 10px 30px rgba(79,70,229,0.35);
  --shadow-accent:  0 10px 30px rgba(236,72,153,0.35);
}
```

---

# 5. DESIGN STYLES ENCYCLOPEDIA

---

## 5.1 NEOMORPHISM (Neumorphism)

**Year Popularized:** 2020
**Aesthetic:** Soft, extruded elements that appear pushed out of or into the background. Material mimicry without textures.

**Core Principle:** Elements share the same color as the background but cast two shadows — a light shadow (upper-left) and a dark shadow (lower-right).

**Key Characteristics:**
- Monochromatic palette — background and elements same hue
- Dual shadows: light (top-left) + dark (bottom-right)
- Very subtle, low-contrast design
- Rounded corners are essential
- No harsh borders or dividers
- Tactile, physical feel

**The Math:**
```css
/* For a background: #E0E5EC */
:root {
  --bg: #E0E5EC;
  --shadow-light: #FFFFFF;    /* lighter than bg */
  --shadow-dark: #A3B1C6;     /* darker than bg */
}

/* Raised element (button, card) */
.neu-raised {
  background: var(--bg);
  border-radius: 16px;
  box-shadow:
    6px 6px 12px var(--shadow-dark),
   -6px -6px 12px var(--shadow-light);
}

/* Inset / pressed element (input, active button) */
.neu-inset {
  background: var(--bg);
  border-radius: 16px;
  box-shadow:
    inset 6px 6px 12px var(--shadow-dark),
    inset -6px -6px 12px var(--shadow-light);
}

/* Flat (no shadow) */
.neu-flat {
  background: var(--bg);
  border-radius: 16px;
}
```

**Shadow Intensity Rules:**
- Distance: 4–12px (never more than 20px for typical UI)
- Blur: 2–3× the distance
- Color: ±15–20% lightness from background

**Best Color Backgrounds:**
```
#E0E5EC — Soft Silver Blue
#DFE4F0 — Cool Lavender Gray
#F0F0F0 — Pure Neutral
#F5E6D3 — Warm Cream
#D4E0C4 — Sage Green
```

**Dark Mode Neumorphism:**
```css
:root {
  --bg: #1E1E2E;
  --shadow-dark: #16161f;
  --shadow-light: #26263d;
}

.neu-dark {
  background: var(--bg);
  box-shadow:
    6px 6px 12px var(--shadow-dark),
   -6px -6px 12px var(--shadow-light);
  border-radius: 16px;
}
```

**Accessibility Warning:** Neomorphism has very low contrast. Always ensure text meets WCAG AA (4.5:1 ratio). Add a subtle border on interactive elements for clarity.

**Best Used For:** Music players, dashboards, calculators, smart home UIs, health apps.

---

## 5.2 GLASSMORPHISM

**Year Popularized:** 2021 (Apple macOS Big Sur)
**Aesthetic:** Frosted glass panels floating over vibrant, colorful backgrounds. Depth through translucency.

**Core Principle:** Semi-transparent backgrounds + backdrop-filter blur + subtle border + light inner glow.

**Key Characteristics:**
- Transparent/translucent backgrounds (rgba with 10–30% opacity)
- `backdrop-filter: blur()` creates the frosted glass effect
- Thin, semi-transparent borders (white at ~20–30% opacity)
- Light inner glow or white gradient overlay
- Must have a colorful, vivid background beneath
- Subtle drop shadow for depth

**The Formula:**
```css
.glass-card {
  /* Core glass effect */
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);

  /* Border — thin white rim */
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-top-color: rgba(255, 255, 255, 0.4); /* brighter on top */

  /* Corner rounding */
  border-radius: 20px;

  /* Shadow for depth */
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255,255,255,0.4); /* inner highlight */
}
```

**Opacity Guide by Background:**
```
Light/white bg:     background: rgba(255,255,255, 0.2–0.4)
Dark bg:            background: rgba(255,255,255, 0.08–0.15)
Colorful/vivid bg:  background: rgba(255,255,255, 0.1–0.2)
Dark glass (tinted): background: rgba(0,0,0, 0.2–0.4)
```

**Blur Intensity:**
```
Subtle:   blur(4px)   — barely frosted
Moderate: blur(10px)  — standard glass
Strong:   blur(20px)  — heavy frosted
Extreme:  blur(40px)  — opaque-looking frost
```

**Background Requirements:**
The glass card is useless without a great background. Use:
- Aurora/mesh gradients
- Colorful blurred photos
- Gradient blobs
- Geometric colored shapes

```css
/* Great glassmorphism background */
.glass-bg {
  background:
    radial-gradient(ellipse at 0% 0%, rgba(255,0,150,0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 100%, rgba(0,150,255,0.4) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(100,0,255,0.3) 0%, transparent 60%),
    linear-gradient(135deg, #1a0533, #0a1a3d);
}
```

**Variants:**
```css
/* Dark glass */
.glass-dark {
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.1);
}

/* Tinted glass (brand color) */
.glass-tinted {
  background: rgba(79, 70, 229, 0.2);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

/* Ultra-clear glass */
.glass-clear {
  background: rgba(255,255,255, 0.05);
  backdrop-filter: blur(24px) saturate(200%);
  border: 1px solid rgba(255,255,255, 0.15);
}
```

**Best Used For:** Landing pages, hero sections, SaaS dashboards, portfolio sites, music apps, NFT platforms.

---

## 5.3 CLAYMORPHISM

**Year Popularized:** 2022
**Aesthetic:** Puffy, inflated, soft 3D clay-like UI components. Like characters from a Pixar movie.

**Core Principle:** Elements appear rounded, soft, and 3D-inflated through large border radii, thick outer glow shadows, and pastel/bright colors.

**Key Characteristics:**
- Extra large border radii (often 24px–50px)
- Thick, soft outer glow shadows (large blur, low opacity, colored)
- Bright, saturated pastel colors
- Inner highlight (white gradient on top)
- Slightly raised, 3D appearance
- Playful and friendly tone

**The Formula:**
```css
.clay-card {
  background: linear-gradient(145deg, #ffffff22 0%, transparent 60%),
              #6C63FF; /* base color */
  border-radius: 32px;

  /* The clay magic: layered shadows */
  box-shadow:
    /* Outer glow — main depth */
    0 20px 40px rgba(108, 99, 255, 0.4),
    /* Bottom push-down */
    0 8px 0 rgba(60, 50, 200, 0.6),
    /* Inner highlight */
    inset 0 2px 6px rgba(255,255,255,0.5),
    /* Inner bottom shadow */
    inset 0 -4px 8px rgba(0,0,0,0.15);

  /* Inner white highlight gradient */
  position: relative;
  overflow: hidden;
}

.clay-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%);
  border-radius: 32px 32px 0 0;
}
```

**Clay Palette (Pastel + Saturated):**
```css
--clay-purple: #8B5CF6;
--clay-pink:   #EC4899;
--clay-blue:   #3B82F6;
--clay-green:  #10B981;
--clay-orange: #F97316;
--clay-yellow: #EAB308;
--clay-teal:   #14B8A6;
```

**Clay Button:**
```css
.clay-button {
  background: linear-gradient(135deg, #A78BFA, #7C3AED);
  border-radius: 50px;
  padding: 14px 32px;
  border: none;
  color: white;
  font-weight: 700;
  box-shadow:
    0 8px 0 #5B21B6,
    0 12px 20px rgba(124,58,237,0.5),
    inset 0 2px 4px rgba(255,255,255,0.4);
  transform: translateY(0);
  transition: all 0.15s ease;
}

.clay-button:hover {
  transform: translateY(-2px);
  box-shadow:
    0 10px 0 #5B21B6,
    0 16px 24px rgba(124,58,237,0.5),
    inset 0 2px 4px rgba(255,255,255,0.4);
}

.clay-button:active {
  transform: translateY(4px);
  box-shadow:
    0 4px 0 #5B21B6,
    0 8px 15px rgba(124,58,237,0.4),
    inset 0 2px 4px rgba(255,255,255,0.3);
}
```

**Best Used For:** Children's apps, food/recipe platforms, fintech consumer apps, gamification UI, mobile apps, playful landing pages.

---

## 5.4 NEOBRUTALISM

**Year Popularized:** 2022–2023
**Aesthetic:** Raw, bold, unapologetically chunky UI with solid black borders, bold colors, and offset shadows. Digital brutalism with a modern twist.

**Core Principle:** Heavy black borders, thick offset box shadows, bright flat colors, zero subtlety. Typography is oversized and aggressive.

**Key Characteristics:**
- 2–4px solid black borders on everything
- Offset box shadows (e.g., `4px 4px 0px #000`)
- Flat, bright colors — no gradients
- Bold, often sans-serif or display fonts
- High contrast (black on yellow, black on white, etc.)
- Cards/buttons that appear "stacked"
- Liberal use of patterns (dots, lines, checks)

**The Formula:**
```css
.neo-card {
  background: #FFEB3B;  /* Bright flat color */
  border: 3px solid #000000;
  border-radius: 8px;
  box-shadow: 6px 6px 0px #000000; /* The signature offset shadow */
  padding: 24px;
}

.neo-button {
  background: #FF5722;
  color: #FFFFFF;
  border: 3px solid #000000;
  border-radius: 6px;
  box-shadow: 4px 4px 0px #000000;
  font-weight: 800;
  font-size: 1rem;
  padding: 12px 28px;
  cursor: pointer;
  transition: all 0.1s ease;
}

.neo-button:hover {
  transform: translate(-2px, -2px);
  box-shadow: 8px 8px 0px #000000;
}

.neo-button:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0px #000000;
}
```

**Neobrutalism Color Palettes:**
```css
/* Classic Brutal */
--brutal-bg: #FAFAFA;
--brutal-yellow: #FFE500;
--brutal-orange: #FF4B00;
--brutal-blue: #0055FF;
--brutal-green: #00D26A;
--brutal-pink: #FF1D8E;
--brutal-border: #000000;

/* Pastel Brutal */
--brutal-bg: #FFFBF0;
--brutal-mint: #BAFFD5;
--brutal-lilac: #E0C3FF;
--brutal-peach: #FFD6C0;
--brutal-sky: #B8E8FF;
```

**Patterns for Neobrutalism:**
```css
/* Dot pattern background */
.neo-dots {
  background-image: radial-gradient(#000 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Stripe pattern */
.neo-stripes {
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 8px,
    rgba(0,0,0,0.08) 8px,
    rgba(0,0,0,0.08) 16px
  );
}
```

**Best Used For:** Design tools, startup landing pages, agency sites, portfolio sites, creative platforms, SaaS marketing.

---

## 5.5 BRUTALISM

**Year Popularized:** 2015–2018 (digital adaptation of 1950s architecture)
**Aesthetic:** Raw, anti-design aesthetic. Intentionally unpolished, confrontational, unconventional.

**Core Principle:** Expose the raw structure of the web. Break every design convention intentionally.

**Key Characteristics:**
- System fonts or monospace fonts
- Pure HTML-like default colors (links in #0000EE, etc.)
- No shadows, no gradients (usually)
- Overlapping text, unusual layouts
- High contrast — pure black and white often
- Visible grids, raw structure
- Comic Sans, Courier New, Times New Roman
- Unexpected cursor styles

```css
.brutalist {
  font-family: 'Courier New', monospace;
  border: 2px solid black;
  background: white;
  color: black;
  padding: 8px;
  outline: 3px dotted black;
  outline-offset: 4px;
}

a.brutalist {
  color: #0000EE;
  text-decoration: underline;
}
```

**Best Used For:** Art portfolios, experimental websites, developer personal sites, anti-establishment brands.

---

## 5.6 MINIMALISM

**Aesthetic:** Less is more. Every element has a purpose. White space is the hero.

**Core Principle:** Ruthless reduction. If removing an element doesn't break understanding, remove it.

**Key Characteristics:**
- Abundant white/negative space
- Monochromatic or very limited palette (2-3 colors max)
- Typography-first design
- No decorative elements that don't serve function
- Simple, consistent grid
- Thin weights often used
- Micro-details are elevated (letter-spacing, precise alignment)

```css
.minimal-card {
  background: #FFFFFF;
  border-radius: 4px;
  padding: 40px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  /* No border, no color, just space and type */
}

.minimal-heading {
  font-size: 2.5rem;
  font-weight: 300;
  letter-spacing: -0.03em;
  color: #111111;
  line-height: 1.1;
}

.minimal-body {
  font-size: 1rem;
  color: #666666;
  line-height: 1.7;
  max-width: 60ch;
}
```

**Best Used For:** Editorial sites, luxury brands, portfolios, SaaS dashboards, tech companies (Apple-style).

---

## 5.7 MAXIMALISM

**Aesthetic:** More is more. Layered, dense, rich, overwhelming in the best way.

**Core Principle:** Fill every corner with intent. Clashing is welcome if controlled.

**Key Characteristics:**
- Multiple competing colors and patterns
- Layered textures and images
- Contrasting font styles
- Diagonal elements, rotated text
- Overlapping cards and images
- Animation everywhere
- Visual loudness and energy

```css
.maximalist-section {
  background:
    url('grain.png'),
    linear-gradient(135deg, #FF006E, #8338EC, #3A86FF);
  position: relative;
  overflow: hidden;
}

.maximalist-heading {
  font-size: 8vw;
  font-weight: 900;
  color: #FFE500;
  text-shadow: 6px 6px 0 #000, -2px -2px 0 #FF006E;
  transform: rotate(-3deg);
  letter-spacing: -0.05em;
  mix-blend-mode: difference;
}
```

**Best Used For:** Fashion brands, music artists, festivals, gaming, experimental creative projects.

---

## 5.8 SKEUOMORPHISM

**Year Popular:** 2007–2013 (iOS era)
**Aesthetic:** Digital elements that mimic real-world objects. A notepad app that looks like paper.

**Core Principle:** Represent real materials — wood, leather, metal, paper — digitally.

**Key Characteristics:**
- Realistic textures (noise, gradients simulating lighting)
- Drop shadows that simulate real light
- Realistic icons (a trash can, bookshelf, etc.)
- Multiple shadows and highlights
- Depth through careful shadow placement

```css
.skeu-button {
  background: linear-gradient(to bottom, #7abcff 0%, #4096ee 50%, #2467c4 51%, #6db3f2 100%);
  border: 1px solid #2467c4;
  border-radius: 6px;
  box-shadow:
    0 1px 3px rgba(0,0,0,0.4),
    0 1px 0 rgba(255,255,255,0.4) inset,
    0 -1px 0 rgba(0,0,0,0.2) inset;
  color: #FFFFFF;
  text-shadow: 0 -1px 0 rgba(0,0,0,0.3);
  font-weight: 600;
}

.skeu-leather {
  background-color: #8B4513;
  background-image:
    url("data:image/svg+xml,..."); /* noise texture SVG */
  border: 2px solid #5D2E0C;
  box-shadow:
    inset 0 0 20px rgba(0,0,0,0.4),
    0 4px 8px rgba(0,0,0,0.5);
}
```

**Best Used For:** Music DAWs, note-taking apps, tools that target non-technical users who need familiarity, luxury brand interfaces.

---

## 5.9 FLAT DESIGN

**Year Popular:** 2013–present
**Aesthetic:** Clean, simple, icon-based design without dimensional elements.

**Core Principle:** Remove all decoration that doesn't directly serve the message.

**Key Characteristics:**
- No shadows, no gradients (in pure flat design)
- Bold, simple icons
- Bright, clean color palette
- Lots of white space
- Simple geometric shapes

```css
.flat-card {
  background: #4ECDC4;
  border-radius: 8px;
  padding: 24px;
  /* Zero shadows, zero borders */
}

.flat-icon {
  width: 48px;
  height: 48px;
  fill: #FFFFFF;
}
```

**Flat 2.0 (Semi-flat):**
Adds subtle shadows and gentle gradients while keeping the clean, simple structure.
```css
.flat-2 {
  background: linear-gradient(135deg, #6EE7B7, #3B82F6);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(59,130,246,0.3);
}
```

---

## 5.10 MATERIAL DESIGN

**Origin:** Google, 2014
**Aesthetic:** Inspired by paper and ink. Layered surfaces with real-world physics.

**Core Principle:** Everything is a virtual sheet of paper. Elevation determines shadow depth.

```css
/* Elevation levels */
.elevation-1 { box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24); }
.elevation-2 { box-shadow: 0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12); }
.elevation-3 { box-shadow: 0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1); }
.elevation-4 { box-shadow: 0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22); }
.elevation-5 { box-shadow: 0 19px 38px rgba(0,0,0,0.30), 0 15px 12px rgba(0,0,0,0.22); }

/* Material You — Dynamic Color Token */
:root {
  --md-primary: #6750A4;
  --md-on-primary: #FFFFFF;
  --md-primary-container: #EADDFF;
  --md-surface: #FFFBFE;
  --md-surface-variant: #E7E0EC;
  --md-outline: #79747E;
}
```

---

## 5.11 AURORA / GRADIENT MESH

**Year Popularized:** 2022–present
**Aesthetic:** Dreamy, cosmic, liquid color blobs creating an Aurora Borealis-inspired background.

**Key Characteristics:**
- Multiple overlapping radial gradients
- Soft, blurred color blobs
- Purple, blue, pink, green color schemes
- Dark backgrounds with glowing elements
- Often combined with glassmorphism

```css
/* Full aurora background */
.aurora-bg {
  min-height: 100vh;
  background-color: #0a0a1a;
  background-image:
    radial-gradient(ellipse 80% 80% at 20% -20%, rgba(120,40,200,0.5) 0%, transparent 50%),
    radial-gradient(ellipse 60% 80% at 80% 20%, rgba(40,100,255,0.4) 0%, transparent 50%),
    radial-gradient(ellipse 60% 60% at 60% 90%, rgba(0,200,150,0.3) 0%, transparent 50%),
    radial-gradient(ellipse 40% 40% at 10% 80%, rgba(255,80,100,0.3) 0%, transparent 50%);
}

/* Animated aurora */
@keyframes aurora-move {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.aurora-animated {
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  animation: aurora-move 15s ease infinite;
}
```

---

## 5.12 DARK MODE & NEON NOIR

**Aesthetic:** Dark, moody interfaces with electric neon accents. Cyberpunk meets dashboard.

**Key Characteristics:**
- Very dark backgrounds (#0A0A0A–#1A1A2E)
- Neon accent colors (electric blue, hot pink, lime green)
- Glow effects on text and elements
- Subtle scanlines or noise for texture
- Terminal/code aesthetics

```css
.neon-card {
  background: #0D1117;
  border: 1px solid #00F5FF33;
  border-radius: 12px;
  box-shadow:
    0 0 20px rgba(0,245,255,0.1),
    inset 0 0 20px rgba(0,245,255,0.02);
}

.neon-text {
  color: #00F5FF;
  text-shadow:
    0 0 10px #00F5FF,
    0 0 20px #00F5FF,
    0 0 40px #00F5FF;
}

.neon-border {
  border: 1px solid #FF00FF;
  box-shadow:
    0 0 8px rgba(255,0,255,0.5),
    inset 0 0 8px rgba(255,0,255,0.1);
}

/* Scanline effect */
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0px,
    transparent 2px,
    rgba(0,0,0,0.15) 2px,
    rgba(0,0,0,0.15) 4px
  );
  pointer-events: none;
}
```

---

## 5.13 RETRO / Y2K

**Aesthetic:** Nostalgia for the late 90s/early 2000s internet aesthetic. Bubbly, shiny, plastic.

**Key Characteristics:**
- Shiny chrome/metallic effects
- Bubbly rounded elements
- Silver, blue, lime green, hot pink
- Star/sparkle decorations
- Heavy use of gradients (the old kind — shiny and plastic)
- Comic-style speech bubbles

```css
.y2k-button {
  background: linear-gradient(180deg, #AAFFAA 0%, #00CC44 40%, #009933 60%, #CCFFCC 100%);
  border: 2px solid #007722;
  border-radius: 50px;
  box-shadow:
    0 2px 0 rgba(255,255,255,0.5) inset,
    0 -2px 0 rgba(0,0,0,0.2) inset,
    2px 4px 8px rgba(0,0,0,0.3);
  font-weight: 900;
  color: #004400;
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
}

.chrome-text {
  background: linear-gradient(180deg, #FFFFFF 0%, #888888 30%, #CCCCCC 60%, #FFFFFF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
}
```

---

## 5.14 BENTO GRID

**Year Popularized:** 2023 (inspired by Apple's marketing slides)
**Aesthetic:** Dashboard-like layouts of varying-sized cards arranged in a tight grid, like a Japanese bento box.

**Key Characteristics:**
- Grid of cards with different sizes (1×1, 2×1, 1×2, 2×2)
- Clean, minimal within each card
- Consistent border-radius and gap
- Each card has a single focused purpose
- Apple-like gradient/color usage

```css
.bento-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  gap: 16px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.bento-card {
  background: #1C1C1E;
  border-radius: 24px;
  overflow: hidden;
  padding: 28px;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.bento-card:hover {
  transform: scale(1.02);
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

/* Size variants */
.bento-1x1 { grid-column: span 1; grid-row: span 1; }
.bento-2x1 { grid-column: span 2; grid-row: span 1; }
.bento-1x2 { grid-column: span 1; grid-row: span 2; }
.bento-2x2 { grid-column: span 2; grid-row: span 2; }
.bento-3x1 { grid-column: span 3; grid-row: span 1; }
.bento-4x1 { grid-column: span 4; grid-row: span 1; }
```

**Card Background Variants:**
```css
.card-gradient-blue   { background: linear-gradient(135deg, #1D4ED8, #3B82F6); }
.card-gradient-purple { background: linear-gradient(135deg, #7C3AED, #A855F7); }
.card-gradient-green  { background: linear-gradient(135deg, #065F46, #10B981); }
.card-dark            { background: #1C1C1E; }
.card-light           { background: #F5F5F7; }
```

---

## 5.15 ORGANIC / BIOMORPHIC

**Aesthetic:** Nature-inspired, fluid, irregular shapes. Blobs, amoebic curves, no right angles.

**Key Characteristics:**
- Blob shapes (SVG path or `border-radius` manipulation)
- Earthy or muted color palettes
- Flowing, curved layouts
- Nature-inspired textures (grain, leaves)
- Rounded, asymmetric cards

```css
/* CSS blob shape */
.blob {
  border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%;
  background: linear-gradient(135deg, #A7C4A0, #5C8D6F);
  width: 300px;
  height: 300px;
  animation: morphing 8s ease-in-out infinite;
}

@keyframes morphing {
  0%   { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
  25%  { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
  50%  { border-radius: 50% 60% 30% 60% / 30% 60% 70% 40%; }
  75%  { border-radius: 40% 60% 60% 40% / 60% 40% 60% 40%; }
  100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
}

/* Grain texture overlay */
.grain-texture::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* SVG noise */
  opacity: 0.04;
  pointer-events: none;
}
```

---

## 5.16 SWISS / INTERNATIONAL STYLE

**Aesthetic:** Grid-strict, typography-dominant, highly systematic design rooted in 1950s Swiss graphic design.

**Key Characteristics:**
- Perfect grid alignment — no deviations
- Helvetica, Aktiv Grotesk, Neue Haas Grotesk
- Red, black, and white dominance
- Heavy use of rules/dividers
- Radical white space
- Left-aligned, structured hierarchy

```css
.swiss-layout {
  display: grid;
  grid-template-columns: 1fr 3fr;
  gap: 0;
  border-top: 3px solid #E30613;
}

.swiss-label {
  font-family: 'Helvetica Neue', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #E30613;
}

.swiss-divider {
  border: none;
  border-top: 1px solid #000000;
  margin: 32px 0;
}
```

---

## 5.17 CYBERPUNK / SCI-FI UI

**Aesthetic:** Futuristic interfaces inspired by film like Blade Runner, Ghost in the Shell. HUD displays, scanlines, glitch effects.

**Key Characteristics:**
- Dark background, high contrast
- Neon cyan, magenta, and yellow accents
- Angled clip-paths and geometric cuts
- Glitch text animations
- HUD-style borders and corners
- Monospace fonts with blinking cursors
- Scanlines and noise

```css
/* Angled HUD card */
.hud-card {
  background: rgba(0, 20, 40, 0.9);
  border: 1px solid #00FFFF;
  clip-path: polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px));
  padding: 24px;
  box-shadow:
    0 0 20px rgba(0,255,255,0.2),
    inset 0 0 20px rgba(0,255,255,0.05);
}

/* Corner brackets */
.corner-box {
  position: relative;
}
.corner-box::before, .corner-box::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: #00FFFF;
  border-style: solid;
}
.corner-box::before { top: 0; left: 0; border-width: 2px 0 0 2px; }
.corner-box::after  { bottom: 0; right: 0; border-width: 0 2px 2px 0; }

/* Glitch animation */
@keyframes glitch {
  0%   { text-shadow: 2px 0 #FF00FF, -2px 0 #00FFFF; }
  25%  { text-shadow: -2px 0 #FF00FF, 2px 0 #00FFFF; transform: skewX(1deg); }
  50%  { text-shadow: 3px 0 #FF00FF, -3px 0 #00FFFF; transform: skewX(-1deg); }
  75%  { text-shadow: -1px 0 #FF00FF, 1px 0 #00FFFF; transform: skewX(0deg); }
  100% { text-shadow: 2px 0 #FF00FF, -2px 0 #00FFFF; }
}

.glitch-text {
  animation: glitch 3s infinite;
  font-family: 'JetBrains Mono', monospace;
}
```

---

## 5.18 JAPANDI

**Aesthetic:** Japanese-Scandinavian fusion. Wabi-sabi meets hygge. Warm, minimal, natural, intentional.

**Key Characteristics:**
- Warm whites, creams, and natural tones
- Organic textures (paper, wood, linen)
- Extreme negative space
- Thin, refined typography
- Earth tones: terracotta, sage, sand
- Slow, calming, deliberate

```css
:root {
  --japandi-bg:      #F5F0EB;
  --japandi-surface: #EDE8E3;
  --japandi-text:    #2C2420;
  --japandi-muted:   #7C6F6A;
  --japandi-accent:  #8B6F5E;  /* Terracotta */
  --japandi-green:   #6B7F5E;  /* Sage */
}

body {
  background: var(--japandi-bg);
  color: var(--japandi-text);
  font-family: 'Cormorant Garamond', serif;
}

.japandi-card {
  background: var(--japandi-surface);
  border: 1px solid rgba(140,115,100,0.15);
  border-radius: 4px;
  padding: 48px;
  box-shadow: none; /* Japandi avoids shadows */
}

.japandi-heading {
  font-weight: 300;
  letter-spacing: 0.1em;
  color: var(--japandi-text);
}
```

---

## 5.19 MEMPHIS DESIGN

**Origin:** 1980s Italian design movement
**Aesthetic:** Geometric shapes, bold patterns, clashing colors, playful chaos.

**Key Characteristics:**
- Bright, often clashing color combos
- Geometric shapes (squiggles, dots, triangles)
- Pattern-heavy backgrounds
- Bold, quirky typography
- Anti-minimalist by design

```css
.memphis-bg {
  background-color: #F7F3E9;
  background-image:
    radial-gradient(circle at 20% 30%, #FF6B6B 0%, #FF6B6B 4%, transparent 4%),
    radial-gradient(circle at 80% 70%, #4ECDC4 0%, #4ECDC4 3%, transparent 3%),
    linear-gradient(45deg, transparent 45%, #FFE66D 45%, #FFE66D 55%, transparent 55%),
    linear-gradient(-45deg, transparent 45%, #FF6B6B 45%, #FF6B6B 55%, transparent 55%);
  background-size: 60px 60px, 80px 80px, 30px 30px, 30px 30px;
}
```

---

# 6. MOTION & ANIMATION

## 6.1 Animation Principles

**12 Principles Adapted for Web:**
1. **Squash & Stretch** — buttons scale on press
2. **Anticipation** — micro-pullback before action
3. **Easing** — nothing moves linearly
4. **Timing** — quick actions (100–200ms), reveals (300–600ms), ambience (1s+)
5. **Follow-through** — slight overshoot on spring animations

## 6.2 CSS Timing Functions

```css
/* Standard */
ease-in:     cubic-bezier(0.4, 0, 1, 1)    /* Slow start */
ease-out:    cubic-bezier(0, 0, 0.2, 1)    /* Slow end — best for exits */
ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)  /* Both — standard motion */

/* Custom curves */
--ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1)   /* Spring/bounce */
--ease-snappy:    cubic-bezier(0.23, 1, 0.32, 1)       /* Snappy settle */
--ease-smooth:    cubic-bezier(0.25, 0.46, 0.45, 0.94) /* Smooth */
--ease-dramatic:  cubic-bezier(0.68, -0.55, 0.265, 1.55) /* Overshoot */
```

## 6.3 Essential Animations

```css
/* Fade in up — page reveals */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Scale in */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}

/* Slide in from left */
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to   { opacity: 1; transform: translateX(0); }
}

/* Float (ambient) */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-12px); }
}

/* Pulse glow */
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.4); }
  50%       { box-shadow: 0 0 40px rgba(99,102,241,0.8); }
}

/* Shimmer (skeleton loading) */
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position: 200% 0; }
}

.shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* Typewriter */
@keyframes typewriter {
  from { width: 0; }
  to   { width: 100%; }
}

.typewriter {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid;
  animation: typewriter 2s steps(40) forwards, blink 0.7s step-end infinite;
}
```

## 6.4 Hover Micro-interactions

```css
/* Lift effect */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}

/* Scale pulse */
.hover-scale {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.hover-scale:hover { transform: scale(1.05); }

/* Magnetic button effect — needs JS for cursor tracking */
.magnetic {
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}

/* Underline slide */
.hover-underline {
  position: relative;
}
.hover-underline::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width 0.3s ease;
}
.hover-underline:hover::after { width: 100%; }
```

## 6.5 Scroll-Triggered Animation (Intersection Observer)

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
```

```css
[data-animate] {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

[data-animate].visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children */
[data-animate].visible:nth-child(1) { transition-delay: 0.1s; }
[data-animate].visible:nth-child(2) { transition-delay: 0.2s; }
[data-animate].visible:nth-child(3) { transition-delay: 0.3s; }
```

---

# 7. UI COMPONENTS & PATTERNS

## 7.1 Button System

```css
/* Base button */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-size: 0.9375rem;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  white-space: nowrap;
  text-decoration: none;
}

/* Variants */
.btn-primary {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 4px 12px rgba(79,70,229,0.3);
}
.btn-primary:hover { background: var(--color-primary-hover); transform: translateY(-1px); }
.btn-primary:active { transform: translateY(0); }

.btn-outline {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
}
.btn-outline:hover { background: var(--color-primary-light); }

.btn-ghost {
  background: transparent;
  color: var(--color-text);
}
.btn-ghost:hover { background: var(--color-surface); }

/* Sizes */
.btn-sm { padding: 8px 16px; font-size: 0.8125rem; }
.btn-lg { padding: 16px 32px; font-size: 1.0625rem; }
.btn-xl { padding: 20px 40px; font-size: 1.125rem; }
```

## 7.2 Input System

```css
.input {
  display: block;
  width: 100%;
  padding: 10px 14px;
  font-size: 1rem;
  color: var(--color-text);
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}

.input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(79,70,229,0.15);
}

.input:invalid, .input.error {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
}
```

## 7.3 Card System

```css
.card {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-xl);
  transform: translateY(-2px);
}

.card-body { padding: 24px; }
.card-header { padding: 20px 24px; border-bottom: 1px solid var(--color-border); }
.card-footer { padding: 16px 24px; border-top: 1px solid var(--color-border); }
```

## 7.4 Navigation Patterns

```css
/* Floating nav */
.nav-floating {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 999px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  z-index: 100;
}

/* Sticky nav with blur */
.nav-sticky {
  position: sticky;
  top: 0;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  z-index: 50;
}
```

---

# 8. BACKGROUNDS, TEXTURES & VISUAL DEPTH

## 8.1 Noise/Grain Texture

```css
/* CSS-only grain via SVG filter */
.grain {
  position: relative;
}
.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  opacity: 0.035;
  pointer-events: none;
  z-index: 9999;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
}
```

## 8.2 Grid & Dot Patterns

```css
/* Grid */
.bg-grid {
  background-image:
    linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* Dots */
.bg-dots {
  background-image: radial-gradient(rgba(0,0,0,0.1) 1px, transparent 1px);
  background-size: 24px 24px;
}

/* Fading grid (vanishes at edges) */
.bg-grid-fade {
  background-image:
    linear-gradient(rgba(99,102,241,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,0.1) 1px, transparent 1px);
  background-size: 40px 40px;
  -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%);
}
```

## 8.3 Ambient Light / Glow Orbs

```css
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.glow-purple { width: 400px; height: 400px; background: rgba(139,92,246,0.35); top: -100px; left: -100px; }
.glow-blue   { width: 500px; height: 500px; background: rgba(59,130,246,0.25); bottom: -150px; right: -150px; }
.glow-pink   { width: 300px; height: 300px; background: rgba(236,72,153,0.3); top: 50%; left: 50%; }
```

---

# 9. ACCESSIBILITY & CONTRAST STANDARDS

## WCAG Contrast Ratios

| Level | Ratio | Applies to |
|---|---|---|
| **AA Normal text** | 4.5:1 | Text < 18px |
| **AA Large text**  | 3:1   | Text ≥ 18px bold or ≥ 24px |
| **AAA Normal text**| 7:1   | Text < 18px |
| **AAA Large text** | 4.5:1 | Text ≥ 18px |
| **UI Components**  | 3:1   | Borders, icons, focus rings |

## Contrast Pair Reference

```
White (#FFF) on:
  #767676 → Exactly 4.5:1 (AA pass)
  #595959 → 7:1 (AAA pass)
  #000000 → 21:1 (Maximum)

Black (#000) on:
  #767676 → 4.5:1 (AA pass)
  #AAAAAA → 2.3:1 (FAIL)
  #FFFFFF → 21:1 (Maximum)
```

## Focus Rings

```css
/* Never use outline: none without a replacement */
:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
```

## Motion Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 10. CSS VARIABLE SYSTEMS

## Complete Design Token System

```css
:root {
  /* === COLORS === */
  --color-primary:        #4F46E5;
  --color-primary-hover:  #4338CA;
  --color-primary-light:  #EEF2FF;
  --color-primary-dark:   #3730A3;

  --color-accent:         #EC4899;
  --color-accent-hover:   #DB2777;

  --color-success:        #10B981;
  --color-warning:        #F59E0B;
  --color-error:          #EF4444;
  --color-info:           #3B82F6;

  --color-bg:             #FFFFFF;
  --color-surface:        #F9FAFB;
  --color-surface-2:      #F3F4F6;
  --color-border:         #E5E7EB;
  --color-border-hover:   #D1D5DB;

  --color-text:           #111827;
  --color-text-2:         #374151;
  --color-text-muted:     #6B7280;
  --color-text-subtle:    #9CA3AF;
  --color-text-inverse:   #FFFFFF;

  /* === TYPOGRAPHY === */
  --font-display:   'Clash Display', sans-serif;
  --font-body:      'Satoshi', sans-serif;
  --font-mono:      'JetBrains Mono', monospace;

  --text-xs:    0.75rem;
  --text-sm:    0.875rem;
  --text-base:  1rem;
  --text-lg:    1.125rem;
  --text-xl:    1.25rem;
  --text-2xl:   1.5rem;
  --text-3xl:   1.875rem;
  --text-4xl:   2.25rem;
  --text-5xl:   3rem;

  /* === SPACING === */
  --space-1:   4px;
  --space-2:   8px;
  --space-3:   12px;
  --space-4:   16px;
  --space-6:   24px;
  --space-8:   32px;
  --space-12:  48px;
  --space-16:  64px;
  --space-24:  96px;

  /* === BORDER RADIUS === */
  --radius-sm:   4px;
  --radius-md:   8px;
  --radius-lg:   12px;
  --radius-xl:   16px;
  --radius-2xl:  24px;
  --radius-full: 9999px;

  /* === SHADOWS === */
  --shadow-sm:  0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06);
  --shadow-lg:  0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-xl:  0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04);
  --shadow-2xl: 0 25px 50px rgba(0,0,0,0.25);

  /* === TRANSITIONS === */
  --transition-fast:   150ms ease;
  --transition-base:   200ms ease;
  --transition-slow:   300ms ease;
  --transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);

  /* === Z-INDEX SCALE === */
  --z-below:    -1;
  --z-base:      0;
  --z-raised:   10;
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-overlay:  300;
  --z-modal:    400;
  --z-toast:    500;
  --z-tooltip:  600;
}
```

---

# 11. RESPONSIVE DESIGN PRINCIPLES

## Breakpoint Scale

```css
/* Mobile-first breakpoints */
/* xs:  < 480px  — small phones */
/* sm:  ≥ 480px  — large phones */
/* md:  ≥ 768px  — tablets */
/* lg:  ≥ 1024px — small laptops */
/* xl:  ≥ 1280px — desktops */
/* 2xl: ≥ 1536px — large screens */

@media (min-width: 480px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

## Fluid Typography

```css
/* clamp(min, preferred, max) */
h1 { font-size: clamp(2rem, 5vw + 1rem, 5rem); }
h2 { font-size: clamp(1.5rem, 3vw + 0.75rem, 3rem); }
p  { font-size: clamp(0.9rem, 1vw + 0.5rem, 1.125rem); }
```

## Fluid Spacing

```css
.section {
  padding-block: clamp(3rem, 8vw, 8rem);
  padding-inline: clamp(1rem, 5vw, 4rem);
}
```

## Container Query (Modern)

```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { flex-direction: row; }
}
```

---

# 12. DESIGN COMBINATIONS & HYBRID STYLES

These are the most powerful hybrid aesthetics used in 2024–2025:

| Combination | Description | Use Case |
|---|---|---|
| **Glass + Aurora** | Frosted glass over dreamy gradient blobs | SaaS landing pages, Web3 |
| **Neobrutalism + Bento** | Bold bordered bento grid cards | Startup/product pages |
| **Claymorphism + Dark** | Colorful puffy elements on dark bg | Consumer apps, games |
| **Minimal + Motion** | Ultra-clean layout with rich animations | Portfolio, luxury brands |
| **Swiss + Dark Mode** | Grid-perfect layout with dark theme | Developer tools, editorial |
| **Cyberpunk + Glass** | Angled HUD glass elements | Crypto, gaming, tech |
| **Japandi + Organic** | Warm minimal with blob shapes | Wellness, lifestyle brands |
| **Y2K + Maximalism** | Shiny retro with dense layering | Fashion, music, culture |
| **Material + Dark** | Elevated surfaces on dark background | Productivity, dashboards |
| **Neomorphism + Minimal** | Soft extruded elements sparingly | Health, meditation, audio |

---

# 13. QUICK REFERENCE: DO'S & DON'TS

## ✅ DO

- Start with a clear aesthetic direction before touching code
- Use CSS variables for every design token
- Follow 60-30-10 color rule
- Use `clamp()` for fluid typography and spacing
- Add `prefers-reduced-motion` media query for all animations
- Always test contrast ratios (minimum 4.5:1 for body text)
- Use `backdrop-filter` with a fallback background
- Keep max-width on content columns (~65–75ch for reading)
- Test on mobile first
- Use `transition: all` sparingly — prefer specific properties
- Add hover, active, focus states to all interactive elements
- Use semantic HTML before styling

## ❌ DON'T

- Use more than 3 font families on one page
- Use pure black (#000) backgrounds or pure white (#FFF) text on dark
- Apply `backdrop-filter` without checking browser support
- Animate `width`, `height`, or `margin` — use `transform` and `opacity` instead
- Make all shadows the same darkness — vary them
- Use generic fonts (Inter, Arial) without strong design intent
- Create hover effects without also providing keyboard focus styles
- Stack many `box-shadow` animations — they're expensive
- Use `opacity: 0.5` on text — use color values instead for accessibility
- Ignore `z-index` management — define a scale early
- Use `!important` except for accessibility overrides
- Forget to test in both light and dark mode

---

*Generated as a comprehensive design reference. Use as a living document — update as new design trends emerge.*

**Version:** 1.0 | **Year:** 2025
