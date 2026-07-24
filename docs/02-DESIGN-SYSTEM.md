# Cashflow — Design System ("Liquid Glass")

> Source of truth for every visual decision. Derived from the reference boards: pure-black canvas, floating gradient-glass widgets, dot-matrix hero numerals, volt-yellow action pill, stacked wallet cards, iOS-widget grids. Dark-first; light theme is a later phase.

---

## 1. Foundations

### 1.1 Canvas & depth model

The app is **layers of light floating over near-black**:

| Elevation   | Use                        | Treatment                                                                                                      |
| ----------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| E0 Canvas   | Page background            | `#050506` + fixed, slow-drifting **aurora mesh** (2–3 huge radial gradients at 10–18% opacity, blurred 120px+) |
| E1 Inset    | List rows, secondary tiles | `rgba(255,255,255,0.04)`, border `rgba(255,255,255,0.06)`, no blur                                             |
| E2 Widget   | Primary cards/widgets      | Glass fill or gradient panel + `backdrop-blur(24px)`, border 1px `rgba(255,255,255,0.12)`, ambient shadow      |
| E3 Floating | Dock, sticky CTAs, sheet   | blur 40px, stronger border `0.16`, ambient + glow shadow                                                       |
| E4 Overlay  | Modals, toasts             | blur 40px over a `rgba(0,0,0,0.5)` scrim                                                                       |

**Glass recipe (the one recipe, reused everywhere):**

```
background: rgba(255,255,255,0.08)          /* or a gradient panel */
backdrop-filter: blur(24px) saturate(160%)
border: 1px solid rgba(255,255,255,0.12)
border-top-color: rgba(255,255,255,0.22)    /* top edge highlight = "lit from above" */
box-shadow: 0 8px 32px rgba(0,0,0,0.45)
```

### 1.2 Color tokens

```
/* Canvas & text */
--canvas:          #050506
--text-1:          rgba(255,255,255,0.96)
--text-2:          rgba(255,255,255,0.64)
--text-3:          rgba(255,255,255,0.40)

/* Glass */
--glass-fill:      rgba(255,255,255,0.08)
--glass-fill-soft: rgba(255,255,255,0.04)
--glass-border:    rgba(255,255,255,0.12)
--glass-highlight: rgba(255,255,255,0.22)

/* Accent — the ONE saturated flat color (buttons, active tab, positive deltas) */
--volt:            #D4F82A     /* on-volt text: #0A0A0A */
```

**Gradient palettes** (each = 3 stops, used as widget/card panels, always dark at the bottom so white text stays readable):

| Token    | Stops                                          | Semantic use                      |
| -------- | ---------------------------------------------- | --------------------------------- |
| `ember`  | `#FF5C39 → #F02D65 → #58122E`                  | Spending, "you owe", alerts, food |
| `ocean`  | `#4CC3FF → #2E63F0 → #0B1E4B`                  | Travel, info, transport           |
| `mint`   | `#B7F8C8 → #2ED486 → #0A3D2C`                  | Income, "owed to you", settled    |
| `iris`   | `#C99AFF → #7C3AED → #250B52`                  | Savings, entertainment            |
| `solar`  | `#FFE44D → #F59E0B → #4A2A05`                  | Budgets, warnings, utilities      |
| `aurora` | multi-hue mesh (ember+iris+ocean at low alpha) | Canvas backdrop, hero moments     |

Semantics: **positive = mint/volt · negative = ember · warning = solar**. Category → gradient mapping lives in the category seed data. Groups pick a gradient as their cover.

Every gradient panel gets a matching **glow shadow**: `0 12px 60px -12px <mid-stop @ 35%>`.

### 1.3 Typography

```
--font-sans:  -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif
--font-dot:   "Doto", monospace     /* dot-matrix display font (Google Fonts, variable) */
```

- **Money is always `font-variant-numeric: tabular-nums`.**
- **Dot-matrix numerals** (`Doto`, heavy weight) are reserved for _hero_ numbers only: net position on Home, group total, settle amount. Everything else uses SF/Inter. This is the signature look from the references (LED-style `09:41`).

| Token      | Size/line | Weight                       | Use                                     |
| ---------- | --------- | ---------------------------- | --------------------------------------- |
| `display`  | 44/48     | 700, tracking −2%            | Hero amounts (often Doto)               |
| `title-1`  | 28/34     | 700                          | Screen titles                           |
| `title-2`  | 22/28     | 600                          | Widget hero values, section heads       |
| `headline` | 17/22     | 600                          | Card titles, buttons                    |
| `body`     | 15/20     | 400                          | Default text                            |
| `footnote` | 13/18     | 500                          | Metadata, chips                         |
| `caption`  | 11/14     | 500, tracking +4%, uppercase | Widget labels ("BALANCE", "THIS MONTH") |

Currency formatting: `en-IN` grouping (₹2,50,000), paise hidden when `.00`, compact form `₹1.2L` in tight widgets.

### 1.4 Spacing, radius, blur

- **4pt grid.** Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56. Screen gutter **20px**, widget gap **12px**, section gap **32px**.
- **Radius:** `r-sm 16` (chips, inputs) · `r-md 24` (small widgets, rows) · `r-lg 28` (standard widgets) · `r-xl 32` (large cards) · `r-2xl 40` (sheets, stacked cards) · `r-full` (pills, dock). Rule of thumb: radius grows with elevation and size; nested radius = parent − padding.
- **Blur scale:** 8 (subtle) / 16 / 24 (default glass) / 40 (dock, sheets, overlays).

### 1.5 Iconography

**Lucide** (1.5–2px stroke, round caps) tinted `--text-2`; active states get `--volt` or panel-matched tint. Category icons sit in 40px gradient squircles. Emoji allowed for group covers (playful, per references).

---

## 2. Motion language

Physics, not durations — everything springs.

| Token           | Value                             | Use                                      |
| --------------- | --------------------------------- | ---------------------------------------- |
| `micro`         | 150ms ease-out                    | hovers, toggles, icon tints              |
| `standard`      | 250ms cubic-bezier(0.32,0.72,0,1) | fades, color, small layout               |
| `spring-snappy` | spring(stiffness 420, damping 30) | press feedback, chips, toggles           |
| `spring-smooth` | spring(stiffness 260, damping 26) | cards entering, sheet open, stack expand |
| `stagger`       | 40ms/item, max 8 items            | lists & widget grids on mount            |

Signature behaviors:

1. **Pressable**: every tappable surface scales to `0.97` + brightness 1.05 on press (spring-snappy). Non-negotiable, global.
2. **NumberTicker**: amounts roll digit-by-digit on change (odometer). Hero numbers animate on mount from 0 with ease-out.
3. **Sheets**: slide up with spring-smooth, drag-to-dismiss with velocity projection, background page scales to 0.94 and dims (iOS modal depth).
4. **Stacked cards** (Groups): collapsed deck shows card headers peeking (48px each); tapping fans the deck open with staggered springs.
5. **Dock**: active tab icon gets volt tint + soft glow; center Add button is a volt pill that morphs into the add-expense sheet (shared-element feel).
6. **Charts** draw in: lines/areas via stroke-dash reveal 600ms; bars grow with 30ms stagger.
7. **Reduced motion**: all of the above degrade to crossfades under `prefers-reduced-motion`.

---

## 3. Component inventory (the kit)

### Primitives (`components/ui`)

`GlassCard` (elevation + gradient props) · `GradientPanel` · `Button` (volt / glass / ghost / destructive; sm-lg; loading) · `IconButton` · `Chip` (filter/selection) · `Avatar` + `AvatarStack` (initials on gradient, for members) · `TextField` · `AmountDisplay` / `AmountKeypad` (custom in-app numeric keypad — never the OS keyboard for amounts) · `SegmentedControl` (glass pill slider) · `Select` (opens sheet) · `Toggle` · `Slider` · `DateChip` + calendar sheet · `Sheet` (bottom sheet base) · `Toast` · `Skeleton` (shimmer on glass) · `EmptyState` (gradient orb illustration + one-liner) · `TabBar` dock · `ScreenHeader` (large title + trailing actions, collapses on scroll) · `ListRow` · `SectionHeader` · `Badge`.

### Widgets (`components/widgets`) — iOS-style grid system

Grid: 2 columns of small (1×1, ~172px), medium spans both (2×1), large is 2×2.
Anatomy: caption label row (uppercase, `--text-3`) → hero value (`title-2`/`display`) → footnote or mini-viz.
Concrete widgets: `NetBalanceWidget` (hero, Doto numerals, aurora panel) · `OwedPairWidget` (mint "owed to you" / ember "you owe") · `MonthSpendWidget` (value + sparkline) · `BudgetRingWidget` (ProgressRing) · `GroupCard` (stacked-deck member) · `InsightCard` (gradient panel + one sentence) · `ActivityRow`.

### Charts (`components/charts`) — custom SVG kit

`AreaTrend` (gradient fill fading to transparent, glowing 2px line, tap-scrub with haptic dot) · `BarPeriod` (rounded 12px bars, volt for current period) · `DonutCategory` (gradient arc segments, center total) · `HeatmapCalendar` (5-step alpha scale of one gradient) · `ProgressRing` (round caps, glow at >80%) · `Sparkline`. Axes are whisper-quiet: `--text-3` labels, no gridlines beyond 3 horizontal hairlines at 6% white.

---

## 4. Screen-level rules

- One **hero element** per screen (a number or a chart) — everything else supports it.
- Max ~2 gradient panels visible per viewport; the rest is quiet glass. (References look rich because saturation is _rationed_.)
- Headers: large title left-aligned, chevron dropdown for context switching (per references), trailing circular glass icon buttons.
- Lists group by day with sticky `caption` headers.
- Safe areas: respect `env(safe-area-inset-*)`; dock floats 16px above bottom inset; content bottom-padding = dock height + 24.
- Touch targets ≥ 44×44. Text on gradient panels: white only over the dark half; never place `--text-2` on bright stops.
- Every async surface has a designed skeleton; every list has a designed empty state. No spinners on full screens.

## 5. Accessibility bars

Contrast ≥ 4.5:1 for body text (the near-black canvas makes this easy — verify on gradient panels), focus-visible rings (2px volt at 60%), full keyboard operability on desktop, `aria-live` on balance updates, all charts accompanied by an accessible data list, reduced-motion + reduced-transparency fallbacks (solid `#141416` replaces glass when `backdrop-filter` unsupported or transparency reduced).
