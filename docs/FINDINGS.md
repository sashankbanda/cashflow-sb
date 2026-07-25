# Cashflow — Native-Feel Rebuild: Findings & Plan (Discovery)

**Mode chosen:** Discovery first · **Platform:** stay PWA · **Design:** feel/perf first, redesign deferred.
**Status:** No app code changed. This document is the baseline + plan; implementation waits for approval.

---

## 0. Method & honest limits

This environment cannot drive a physical Android device or a Chrome performance trace, so **every number below must be captured by you** with the recipe in §9 — I will not print fabricated INP/fps figures. What *is* in here is **cause analysis from the source** (file:line), which is where the fixes actually live. Numbers confirm; causes fix.

Two independent passes fed this: a manual read of the render/response-critical modules, and a full route sweep.

---

## 1. Executive summary — ranked

| # | Finding | Felt as | Cost to fix | Evidence |
|---|---------|---------|-------------|----------|
| 1 | **Mutations are not optimistic** — every tap awaits the server action *and* the RSC revalidation before the UI moves | "taps feel slow" | Medium | `useAction.ts:36` |
| 2 | **Sheet-open scales a blurred subtree** (`0.94` + `brightness` over `blur(24px)` descendants) | sheet stutter | Low | `globals.css:59`, `Sheet.tsx:137` |
| 3 | **Blur used as a texture, not a budget** — `blur(24px)` on every card + `blur(40px)` on dock *and* sheet simultaneously | low fps on scroll/animate | Medium | `tokens.css:191` |
| 4 | **Ambient aurora never stops painting** — 3 animated radial gradients on a 60–90 s loop | battery + baseline jank | Low | `globals.css:134` |
| 5 | **iOS zoom-on-focus** — every text input is 15 px (one is 13 px), below the 16 px threshold | page lurches on field focus | Low (token) | `tokens.css:73`, `TagPicker.tsx:67` |
| 6 | **Count-up numerals on mount** delay readability of the one thing users came to read | "why is the number spinning" | Low | `DotMatrixAmount.tsx:58` |
| 7 | **Blocking loads** — no `loading.tsx`; only Home streams a skeleton, every other route freezes on the previous screen until data resolves | "did my tap work?" | Low | route sweep |
| 8 | **Back button in top-**right** on 6 secondary screens (iOS expects top-left) | wrong muscle memory | Low | route sweep |
| 9 | **No swipe-back / native share**; export & share use `<a download>` / new-tab | "this is a website" | Med (PWA-capped) | route sweep |

Items 1–4 are the "feel" core. 5–8 are cheap, high-value polish. 9 is partially capped by the PWA shell (§3).

---

## 2. Response speed (INP) — the real "slow taps"

**Root cause.** `useAction` ([`useAction.ts:36-64`](../src/hooks/useAction.ts)) is `setPending(true)` → `await action(input)` → success callback. The visible result of a mutation therefore arrives only after **(a)** the network round-trip **and (b)** the server's `revalidateTag` RSC stream re-renders the screen. Nothing updates on the client in the meantime. Adding an expense, settling up, toggling a budget — all block on the server.

**What's already good (build on it):** an IndexedDB **outbox** (`lib/outbox` + `OutboxSync`) already queues expenses offline, and press feedback already fires on press-start (CSS `active:` + Motion `onTapStart`). The pieces for optimistic UI exist; they're just not wired to the *online* happy path.

**Fix direction (Phase 1):**
- `useOptimistic` (or local reducer) so the ledger/balance/list reflects the mutation **before** the finger lifts; reconcile on the server response; on failure revert with a non-blocking, undoable toast.
- Prefetch the likely-next screen on `pointerdown` (Next `<Link prefetch>` fires on viewport/hover, not intent).
- Tab switches currently re-run server components. Next 16's client Router Cache expires dynamic segments fast by default → set `staleTimes.dynamic` so switching tabs is instant and preserves scroll/state (verify against the Next 16 API before relying on it).

---

## 3. Native feel — the "is this a website?" checklist, assessed (PWA ceiling)

| Item | State | Note |
|------|-------|------|
| Press state on pointerdown | ✅ | CSS `active:` + Motion `onTapStart` (`Pressable.tsx:32`) |
| Tap-highlight removed | ✅ | `globals.css:8` |
| `100dvh` (no `100vh`) | ✅ | zero `100vh`; sheets use `dvh` |
| One scroll container / momentum | ✅ | body-scroll; `overscroll-behavior-y: none` |
| Real sheet drag + velocity dismiss | ✅ | `Sheet.tsx:149` (`offset>110 ∥ velocity>500`) |
| Persistent bottom tabs | ✅ | `TabBar.tsx` |
| In-app numeric keypad for money | ✅ | `AmountKeypad` — native keyboard never summoned for amounts |
| `touch-action: manipulation` | ❌ | not set globally → 300 ms tap delay risk on some engines |
| Inputs ≥ 16 px | ❌ | 15 px everywhere, 13 px in `TagPicker` → **iOS zooms on focus** |
| Haptics | ⚠️ | exist (Vibration API) on **Android**; **impossible on iOS Safari/PWA** — no Web Vibration |
| Swipe-back gesture | ❌ | none; standalone PWA usually has **no** browser back gesture either |
| Native share / file save | ⚠️ | uses `<a download>` + new-tab; `navigator.share`/`canShare` is the PWA-honest upgrade |
| Haptic timing uniform | ❌ | fires at pointerdown in `Pressable` but at click in hand-wired handlers |
| Back returns to prior scroll pos | ⚠️ | verify on device (RSC + router cache) |

**Impossible on a PWA (state plainly, per brief):**
1. **iOS haptics** — no Web Vibration API in Safari/standalone. Android PWA works; iPhone never will without a Capacitor/native shell.
2. **True system edge-swipe-back** with the OS rubber-band. Closest honest substitute: a JS horizontal-drag-to-pop on the left edge (Motion), plus an always-visible back affordance. Feels ~90% native; the OS interruption physics differ.
3. **App-icon badges / rich notification actions** are limited/inconsistent on iOS PWA.

Everything else on the checklist is achievable in the current shell.

---

## 4. Motion audit (against §5 of the brief)

| Current behavior | Verdict | Source |
|---|---|---|
| Count-up 0→value on mount | ❌ delete — animates a number being read | `DotMatrixAmount.tsx:58` |
| Aurora 60–90 s ambient loop | ❌ make static — ambient loop competing with interactions | `globals.css:171` |
| Shell scale-0.94 on sheet-open | ⚠️ keep the *idea*, drop the blurred-subtree cost | `globals.css:68` |
| Odometer digit-roll on change | ✅ keep, but only on change-while-watched, briefly | `NumberTicker.tsx` |
| `whileTap` scale 0.97 spring | ✅ keep — this is the good part | `Pressable.tsx:32` |
| Sheet spring + drag | ✅ keep — already interruptible/velocity-aware | `Sheet.tsx` |
| Chart draw-in (stroke-dash) | ⚠️ cap ≤200 ms, no long stagger | charts |

New rule set to encode in `docs/MOTION.md`: only `transform`/`opacity` animate; entrances ≤200 ms; nothing the user waits on >250 ms; stagger ≤3 items @20 ms or none; no ambient loops; no number animates on first paint; reduced-motion → instant.

---

## 5. UX / IA audit (against `ux-laws (1).md`)

| Screen | Issue | Law | Fix |
|---|---|---|---|
| **6 secondary screens** (budgets, recurring, categories, notifications…) | Back in header **top-right** | Jakob's Law | Move Back to top-left universally; Search already does it right |
| **profile** | "Appearance" row is a dead `<div>` (chevron, no action) | Postel / Aesthetic-Usability | Wire it or remove it — a dead affordance erodes trust |
| **expenses** | personal rows tappable, group-share rows not — identical look | Law of Similarity | Distinguish affordance (or make both actionable) |
| **home / group** | "See all" & some links have `hover:` but no `active:`; small target | Fitts's Law | Add press state; enlarge target to ≥44 px |
| **search / all inputs** | 15 px (13 px in TagPicker) inputs | Postel / native feel | Bump to ≥16 px token |
| **reports** | month via `‹ ›` full-page nav; Share opens a new tab | Jakob / Doherty | Swipe or in-place month change; `navigator.share` |
| **activity** | "Load more" button vs infinite scroll | Jakob | Optional: intersection-observer infinite scroll |
| **all non-Home routes** | no skeleton; screen freezes until data resolves | Doherty (400 ms) | `loading.tsx` skeletons; show nothing < 200 ms |
| **group detail / budgets** | densest screens (~8–12 controls) | Hick's / Miller | Demote secondary actions into an overflow/settings sheet |
| **peaks** | expense-committed & debt-settled are the two emotional peaks | Peak-End | Make both unmistakable + a tasteful success moment (Android haptic) |

Choice-load overall is **low** (dock FAB + one pill per screen) — the IA is mostly sound; these are targeted fixes, not a re-architecture.

---

## 6. Bundle / deps

- Largest runtime dependency is **`motion`** (Framer Motion). It earns its place (sheet drag, springs) but is the first place to look for weight; some micro-uses could drop to CSS.
- `d3-scale` + `d3-shape` power the custom charts — reasonable, tree-shaken.
- `lucide-react`, `date-fns` v4 — per-import tree-shakeable.
- No obviously-dead dependency. `experimental.cpus:2` is **build-time only** — zero runtime cost (can be removed on CI/prod with more RAM).
- Precise per-route JS isn't emitted by the Turbopack build; use the Coverage tab (§9) for unused JS instead.

---

## 7. The plan — feel/perf first, redesign last

Each phase: app builds/typechecks/lints green at every commit; small commits; net deletions reported; behavior preserved.

- **Phase 1 — Response speed (INP).** Optimistic mutations via `useOptimistic` (reuse the outbox), reconcile + undoable-revert; prefetch-on-`pointerdown`; `staleTimes` for instant tab switches; add `loading.tsx` skeletons, delete full-screen spinners, nothing < 200 ms. *Biggest felt win.*
- **Phase 2 — GPU/jank (fps).** Kill the blurred-subtree scale (#2); enforce a **one-live-backdrop-filter budget** (dock *or* sheet), everywhere else a pre-composited translucent surface that reads identical in a screenshot; static aurora (single pre-rendered gradient); remove count-up; `contain: paint` on cards, `content-visibility` offscreen; audit that only transform/opacity animate.
- **Phase 3 — Native feel.** `touch-action: manipulation`; ≥16 px input token; uniform haptics on pointerdown (Android); JS edge-swipe-back + always-visible top-left Back; `navigator.share`; verify scroll restoration. Document the 3 PWA-impossible items.
- **Phase 4 — Motion language.** New motion tokens + `docs/MOTION.md`; delete every animation not on the permitted list.
- **Phase 5 — UX/IA fixes** from §5, one screen per commit.
- **Phase 6 — (later) Redesign** per the direction you pick from the appendix. Deferred by your call — the app should already feel native before we touch color/type.

---

## 8. Appendix — three design directions (preview, for Phase 6)

Deferred, so these are seeds not full specs. All obey: no volt/Doto/gradients; money legible without hue alone (sign + arrow + weight); ≤2 typefaces with **real tabular figures**; depth via tint/hairline/one shadow token, **no live blur**; body ≥4.5:1, UI ≥3:1; tokens stay the single source of truth.

**Why not Doto:** a dot-matrix face is a novelty — glyphs like the colon are ambiguous at a glance (you hit this yourself). A tabular mono or a `tnum` grotesque aligns decimals, reads instantly, and looks more premium.

### A — "Statement" (light, editorial-fintech)
- **Palette:** paper `#F7F6F3` · ink `#16171A` · muted `#6B6E76` · hairline `#E4E2DC` · in `#0F7A52` · out `#B23A2E` (always with sign/arrow). Primary action = ink button.
- **Type:** UI **Inter** (`tnum`) · numerals **Geist Mono / IBM Plex Mono** (tabular).
- **Surface:** flat cards on paper, 1 px hairlines, one soft down-shadow; depth by tonal grey steps.
- **Signature:** right-aligned mono ledger column with a fixed decimal point; oversized statement balance.
- **Wireframe:**
  ```
  ┌ Good evening, Sashank        🔔 ┐
  │  BALANCE                        │
  │  +₹4,820.00      ← big mono     │
  │  owed to you 6,510 · you 1,690  │
  ├─────────────────────────────────┤
  │  This month        ₹28,417.50   │
  │  ▁▂▅▃▇▄  ↓12%                    │
  ├─ Today ─────────────────────────┤
  │  Priya  settled          +1,250 │
  │  Aarav  Dinner            −425  │
  └──────── [Home][Grp](+)[Ins][Me] ┘
  ```
- **Self-critique:** nearest to a generic neobank; differentiator is the editorial ledger typesetting. Kept because light + mono-ledger is genuinely distinct from the rejected dark-neon app.

### B — "Dusk" (dark, tonal, anti-neon)
- **Palette:** slate `#14161B` (not black) · raised `#1C1F26` (tonal step) · text `#ECEEF2` · muted `#9AA0AB` · hairline `#2A2E37` · accent **soft periwinkle `#8E9BFF`** (calm, not acid) · in `#4FB477` · out `#E06A5B`. Money = tinted duotone chip + sign.
- **Type:** UI **Geist Sans** (`tnum`) · numerals **JetBrains / Geist Mono**.
- **Surface:** depth via layered opacity of one hue + hairlines + one shadow token — **zero backdrop-filter**.
- **Signature:** duotone money chips (tinted rounded bg encoding in/out).
- **Self-critique:** risk = "the rejected app, muted." Guardrails: base is clearly slate/indigo (not `#050506`), a single soft accent (not electric), no gradients, no blur. This is the "keep dark but fix everything that was wrong with it" option.

### C — "Grid" (near-monochrome, bold, design-forward)
- **Palette:** near-white `#FAFAFA` · ink `#111` · grey steps · **one** brand ink cobalt `#2743F0` (primary action + current-period marker only). Semantics via sign + monochrome glyph + weight; color minimal.
- **Type:** UI **Inter** · hero numerals a heavy mono (**Martian / IBM Plex Mono**).
- **Surface:** crisp cards, strict 8 pt grid, thick hairlines, one shadow token.
- **Signature:** oversized monospaced hero numeral on a visible modular grid; categories as monochrome glyph+label chips.
- **Self-critique:** minimalism demands exact spacing/type; risks cold — warm with rounded radii + the single accent.

None is "near-black + one acid accent" (that's the rejected current app) nor "cream + serif + terracotta."

---

## 9. How to capture the real numbers (you run these)

1. **INP + fps:** Chrome DevTools → Performance → gear → **CPU 4× slowdown, Network Fast 3G** → Record → tap Add, submit an expense, scroll a list, open a sheet, switch tabs → Stop. Read **INP** in the Interactions lane; scan for **long tasks > 50 ms**; check the frames row for dropped frames. Repeat before *and* after each phase.
2. **Cold start:** Lighthouse (mobile preset) → TTI / LCP.
3. **Unused JS:** DevTools → Coverage → reload → record the red (unused) bytes per file.
4. **Optional:** the `web-vitals` lib logging INP to the console on the real phone for field-accurate p75.

Paste any trace/Profiler export here and I'll read it precisely.
