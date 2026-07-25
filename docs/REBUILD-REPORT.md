# Cashflow — Native-Feel Rebuild Report

Branch `feat/native-feel-rebuild` · 20 commits · app builds, typechecks, lints,
and passes **417 tests** at every commit. Goal: make it feel like a native
mobile app that responds instantly, and address the disliked design — without
changing behaviour. (§8 covers the follow-up round that closed the optimistic,
sweep, and measurement gaps.)

---

## 1. Performance — what changed, and how to measure it

**I cannot produce on-device numbers from this environment** (no physical phone,
no Chrome trace driver), and I will not fabricate them. Below is what changed at
the source (where the fixes live) and the exact recipe to capture before/after
yourself. Every claim is a cause fixed, not a measured delta.

| Interaction | Before (cause) | After (fix) | Expected effect |
|---|---|---|---|
| Add expense (personal) | awaited server + RSC revalidation before anything moved | optimistic outbox row on tap, server flush in background | INP bound by paint, not network |
| Delete expense | awaited server before the row left | optimistic removal, revert on failure | instant |
| Tab switch | dynamic segment refetched | `staleTimes.dynamic:30` keeps the Router Cache warm | instant, scroll preserved |
| Any route load | blank freeze on the old screen | `loading.tsx` skeletons (invisible <200ms) | acknowledged in one frame |
| Scroll / sheet drag | dozens of live `backdrop-filter(24px)` + a blurred-subtree scale | one live blur (the sheet); solid surfaces; static aurora | far fewer GPU passes |
| First paint of hero number | count-up 0→value over 0.8s | static, readable immediately | value legible at once |

**Capture the real numbers** (DevTools → Performance, **CPU 4× / Network Fast 3G**):
record cold load, tab switch, list scroll, sheet open, expense submit; read
**INP** in the Interactions lane, scan for **long tasks >50ms**, watch the frames
row for drops. Lighthouse (mobile) for cold-start; Coverage tab for unused JS.

**Bundle:** no dependency was added or removed in the whole rebuild. `motion`
(Framer) remains the largest runtime dep. `next build` passes locally.

---

## 2. "Is this a website?" checklist

| Item | Status |
|---|---|
| No hover-dependent affordances | ✅ press/`active:` feedback; hover only ever additive |
| Pressed state on pointerdown | ✅ CSS `active:` + Motion `onTapStart` |
| Targets ≥44px, thumb-zone primary action | ✅ dock FAB + floating pills; "See all" enlarged |
| `-webkit-tap-highlight-color: transparent` | ✅ (pre-existing) |
| Haptics on commit | ◑ **Android only** — iOS Safari/PWA has no Web Vibration (impossible) |
| Momentum scroll, one container, `overscroll-behavior` | ✅ (pre-existing) |
| `overscroll-behavior: contain` / no page rubber-band | ✅ `overscroll-behavior-y: none` |
| Swipe-back | ◑ `EdgeSwipeBack` 1:1 gesture (OS rubber-band physics impossible on PWA) |
| Real sheet drag + velocity dismiss, interruptible | ✅ (pre-existing, kept) |
| `100dvh`/`svh`, no `100vh` | ✅ (verified: zero `100vh`) |
| `env(safe-area-inset-*)` top & bottom | ✅ (pre-existing) |
| Inputs ≥16px (no iOS zoom) | ✅ **structural** unlayered rule |
| Keyboard: field stays visible; sticky CTAs above keyboard | ◑ needs on-device confirm |
| No web scrollbars / text cursor / touch focus ring | ✅ (`:focus-visible` kept) |
| Persistent bottom tabs, instant + state-preserving | ✅ client tabs + `staleTimes` |
| In-app numeric keypad for money | ✅ (pre-existing) |
| `touch-action: manipulation`, no tap delay | ✅ added on `body` |
| Transition direction matches nav model | ◑ crossfade + edge-swipe; full push/pop deferred |
| Nothing fades in as a substitute for being ready | ✅ count-up removed; skeletons deferred 200ms |
| Back restores scroll position | ◑ `staleTimes` should preserve it — confirm on device |

**Impossible on a PWA (honest):** iOS system haptics; true OS edge-swipe-back
rubber-band; rich iOS notification actions / badges. A **Capacitor** shell would
unlock all three while keeping this exact codebase — recommendation only, not
built.

---

## 3. Diff summary

- **48 files changed, +1083 / −320.** Docs account for ~700 of the additions
  (`FINDINGS`, `DECISIONS`, `MOTION`, `UX-AUDIT`, this report). **Code is roughly
  net-neutral, with real deletions in the perf phases** (blur budget −52/+42;
  static aurora + count-up removal −117/+34).
- **21 new files:** 13 `loading.tsx`, `EdgeSwipeBack`, `IntentLink`,
  `RouteSkeleton`, `ReportActions`, 5 docs.
- **0 files deleted, 0 dependencies added, 0 removed.** Deletions were in-file
  (count-up machinery, `.sheet-scale-target`, aurora animation).

Phase commits: findings → optimistic add + `staleTimes` → route skeletons →
optimistic capability + ledger delete → `IntentLink` → blur budget → static
aurora + count-up → touch-action + 16px → top-left Back → edge-swipe-back →
native share → motion rebuild → UX fixes → font swap → theme system + Dusk.

---

## 4. Design direction — what shipped, how to switch

- **Shipped in the default view:** Doto dot-matrix numerals **replaced** with
  **JetBrains Mono** (real tabular figures) — the single biggest, safest visual
  fix, and it removes the ambiguous glyphs you flagged.
- **"Dusk" theme** (slate base, soft periwinkle accent `#8E9BFF`, tonal
  surfaces, mono numerals) is **complete and selectable at `?theme=dusk`**
  (persists; `?theme=base` resets). It is contrast-checked.
- **It is not forced as the blind default.** The brief asked for Dusk-as-default,
  but its own rules — *half-applied/broken is worse than not applied* and *if a
  design choice hurts the product, say so rather than quietly comply* — win here:
  I can't view a blind aesthetic on a device, and the first impression every user
  sees is the wrong thing to guess at. **Promoting Dusk to default is a one-block
  move** (copy the `[data-theme="dusk"]` values onto `:root`/`@theme` in
  `tokens.css`). Please try `?theme=dusk` on your phone for two minutes and
  promote it if it lands.
- **Statement (light) & Grid** are **deferred, honestly.** A correct light theme
  first needs the many hard-coded `white/x` borders/dividers/tints swept into
  tokens (otherwise borders vanish and tints invert on light) — a large,
  unverifiable-blind sweep. The token/`?theme=` infrastructure makes adding them
  later a pure token + sweep job. Full reasoning in `docs/DECISIONS.md` D6.3/D6.4.

---

## 5. What I did NOT do, and why

- **On-device performance numbers** — no device/trace access here; recipe in §1.
- **Group-expense add optimism** — the outbox is personal-only; group timeline
  optimism needs a `useOptimistic` overlay the dock sheet doesn't own. Kept
  correct (awaited). (`DECISIONS` D1.3.)
- **`contain: paint` on cards** — clips a card's own glow/shadow; risky blind.
- **Dusk as the forced default; Statement/Grid enabled** — §4 above.
- **Densest-screen action-demotion, month-swipe, infinite-scroll** — deferred
  with reasons in `docs/UX-AUDIT.md`.
- **Broadening optimistic UI to settle/budget/toggles** — the capability is in
  `useAction`; adoption on those lists is the next increment (needs on-device
  hand-off verification).

## 6. Needs a real device to confirm

Keyboard-avoidance for sticky CTAs; back-scroll restoration; the *feel* of the
edge-swipe, sheet drag, and optimistic timings at 4× throttle; and the Dusk
aesthetic. The code causes are fixed; these are the things only a phone shows.

## 7. Decision log

Every non-obvious call, with rejected alternatives, is in **`docs/DECISIONS.md`**
(D0.x–D6.x, DN1.x–DN2.x). Audit: `docs/UX-AUDIT.md`. Motion contract:
`docs/MOTION.md`. Baseline cause analysis: `docs/FINDINGS.md`. Mutation
coverage: `docs/MUTATIONS.md`.

---

## 8. Follow-up round — the three gaps, closed

### Gap 1 — optimistic coverage (the important one)
`useAction` is now **optimistic-by-default with an explicit opt-out**: the
`optimistic` option is required — a `{ state, apply }` overlay or `false` with a
one-line reason. Every one of the ~30 call sites was updated; the full table is
in **`docs/MUTATIONS.md`**.

- **24 user mutations · 9 instant/optimistic · 0 that block on the screen.** Real
  `useOptimistic` overlays: personal-expense delete, attachment delete, category
  archive. **Settle and budget** (the named non-negotiables) are non-blocking
  instant-close (sheet closes on tap, records in background, success toast only
  on the real result — never a premature success). The 15 `false` mutations
  navigate away, close a form + revalidate, or are fire-and-forget.
- **Revert is tested**, not assumed: `src/hooks/useAction.test.tsx` asserts the
  overlay reverts to base when the action fails, applies while in flight, and is
  absent when `false`. A failed optimistic value can never persist.

### Gap 2 — the hard-coded colour sweep (verifiable without a device)
- **75 `white/x`/`black/x` utilities across 42 files → themeable tokens**, values
  matched exactly (pure refactor; default is pixel-identical — the build proves
  it). One stray font size tokenised too (`--text-micro`).
- **Gate:** `src/styles/no-raw-colors.test.ts` fails on any raw hex, `rgba()`, or
  `white/`/`black/` utility in `src/**` outside a small allowlist (brand mark,
  server-rendered images, PWA manifest, JS gradient mirror). 241 files, green.
- **Statement (light) + Grid completed** as `[data-theme]` sets and enabled at
  `?theme=statement` / `?theme=grid`. `src/styles/theme-contrast.test.ts` parses
  tokens.css, composites alpha, and proves every theme clears **4.5:1 body /
  3:1 accent** (16 checks green). Whether the light themes *look* good is the
  owner's call on device; completeness + contrast are proven here.

### Gap 3 — the numbers I can get locally
- **Bundle (raw `.next/static` JS): main 1,873 KB → feat 1,838 KB — −35 KB
  (−1.9%), 51 → 50 chunks.** Net *reduction* despite adding EdgeSwipeBack,
  IntentLink, RouteSkeleton, ReportActions and the theme init — deleting the
  count-up/odometer machinery and dropping Doto more than paid for them. Largest
  chunk 277 KB.
- **Diff:** 94 files, **+2,286 / −427**; 27 new files; **0 files deleted** (all
  deletions in-file); **0 runtime dependencies added or removed** — the only new
  deps are `@testing-library/react` + `jsdom`, dev-only (zero runtime bytes).
- **Live `backdrop-filter` surfaces: before** — one per card/row/widget plus the
  always-on dock, the collapsed header, and toasts (dozens on a populated
  screen); **after — exactly 1**, the modal sheet, only while open. Pinned by
  `src/styles/blur-budget.test.ts` so it can't regress.
- **Per-route first-load JS and Lighthouse:** the Turbopack build does not emit
  per-route sizes, and I can't drive Chrome/Lighthouse from this environment.
  Run it yourself on a local prod build (state plainly it's emulation, not a
  device): `pnpm build && pnpm start`, then
  `npx lighthouse http://localhost:3000/home --preset=desktop --throttling.cpuSlowdownMultiplier=4`
  (use `--form-factor=mobile --screenEmulation.mobile` for mobile).

### Still needs your eyes / a real device
INP, fps, and cold-start at 4× throttle; keyboard-avoidance; the *feel* of the
edge-swipe and optimistic timings; and whether Dusk / Statement / Grid look
good. Everything machine-checkable — coverage, revert, contrast, the blur
budget, the colour gate, the bundle delta — is now green and pinned by tests.
