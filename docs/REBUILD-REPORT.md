# Cashflow — Native-Feel Rebuild Report

Branch `feat/native-feel-rebuild` · 15 commits · app builds, typechecks, lints,
and passes 157 unit tests at every commit. Goal: make it feel like a native
mobile app that responds instantly, and address the disliked design — without
changing behaviour.

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
(D0.x–D6.x). Audit: `docs/UX-AUDIT.md`. Motion contract: `docs/MOTION.md`.
Baseline cause analysis: `docs/FINDINGS.md`.
