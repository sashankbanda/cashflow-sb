# Cashflow — Implementation Roadmap

> 36 small phases, each independently buildable in 1–3 focused sessions. Complexity: **S** (≈1 session) / **M** (≈2) / **L** (≈3). Rules that apply to *every* phase: mobile-first at 390px, design-system tokens only (no ad-hoc colors/radii), TypeScript strict with zero errors, unit tests ship inside the phase that creates logic, every visible state (loading/empty/error) is designed. A phase is "done" only when its acceptance criteria pass on a phone-sized viewport.
>
> Suggested review gates: after P7 (design system demo), P12 (server foundation), P19 (group core = usable Splitwise-beater), P27 (personal finance + analytics), P36 (production).

---

## Stage A — Foundation & Design System (P1–P7)

### P1 · Project foundation
- **Objective:** Clean, strict, conventions-locked Next.js workspace.
- **Deliverables:** Next 15 + TS strict scaffold; Tailwind v4; ESLint (typescript, react-hooks) + Prettier; `src/` folder skeleton per `03-ARCHITECTURE.md` §2 with `.gitkeep`s; path alias `@/*`; git init + `.gitignore`; `README.md`; scripts (`dev/build/lint/typecheck/test`); zod-validated `env.ts` (empty for now).
- **Files:** repo root, `src/*` skeleton, config files.
- **Depends on:** —  · **Complexity: S**
- **Accept:** `pnpm build`, `lint`, `typecheck` all pass; folder tree matches architecture doc; first commit made.

### P2 · Design tokens & theming
- **Objective:** Entire design language exists as code before any component.
- **Deliverables:** `styles/tokens.css` (all §1 tokens from `02-DESIGN-SYSTEM.md` as CSS vars) wired into Tailwind v4 `@theme`; `next/font` setup (Inter fallback + Doto digits subset); global styles (canvas color, aurora mesh background component, scrollbar, selection, safe-area utilities); `lib/format.ts` (₹ en-IN, compact, tabular); demo route `/dev/tokens` rendering all tokens.
- **Files:** `styles/`, `app/globals.css`, `app/layout.tsx`, `lib/format.ts`, `app/dev/tokens/`.
- **Depends on:** P1 · **Complexity: M**
- **Accept:** `/dev/tokens` shows every color/gradient/type-style/radius/blur exactly per spec; fonts self-hosted; formatters unit-tested (`₹1,23,456.50`, `₹1.2L`).

### P3 · UI primitives I (surfaces & actions)
- **Objective:** The glass foundation everything sits on.
- **Deliverables:** `GlassCard` (elevation/gradient/glow props), `GradientPanel`, `Button` (volt/glass/ghost/destructive × sm/md/lg, loading state), `IconButton`, `Chip`, `Badge`, `Avatar` + `AvatarStack`, `Divider`, `Skeleton` (shimmer), `EmptyState`; `/dev/kit` gallery page.
- **Files:** `components/ui/*`, `app/dev/kit/`.
- **Depends on:** P2 · **Complexity: M**
- **Accept:** Gallery matches design spec at 390px; glass recipe (blur/border/top-highlight/shadow) pixel-faithful; reduced-transparency fallback renders solid surfaces.

### P4 · UI primitives II (inputs & overlays)
- **Objective:** Every input pattern the flows will need.
- **Deliverables:** `TextField`, `SegmentedControl`, `Toggle`, `Slider`, `Select` (sheet-based), `DateChip` + calendar sheet, **`Sheet`** (bottom sheet: drag-dismiss, snap points, background scale/dim, focus trap), `Toast` system, **`AmountKeypad` + `AmountDisplay`** (custom in-app keypad, paise-exact input); gallery additions.
- **Files:** `components/ui/*`, `hooks/useSheet.ts`.
- **Depends on:** P3 · **Complexity: L**
- **Accept:** Sheet drag feels iOS-native (velocity dismiss, spring settle); keypad enters ₹ amounts with live formatting; all inputs keyboard/screen-reader operable.

### P5 · Motion system
- **Objective:** The app's physical feel, centralized.
- **Deliverables:** Motion (framer-motion v12) installed; `components/motion/`: `Pressable` (0.97 press), `NumberTicker` (odometer), `DotMatrixAmount` (Doto hero numerals with mount animation), `Stagger` list wrapper, page-transition template, spring token presets matching §2 of design doc; `useReducedMotion` gate everywhere; `useHaptics` (vibration API, no-ops gracefully).
- **Files:** `components/motion/*`, `hooks/useHaptics.ts`, `app/template.tsx`.
- **Depends on:** P3 · **Complexity: M**
- **Accept:** Gallery demos each behavior; ticker rolls digits; reduced-motion collapses to fades; no jank at 60fps in Chrome DevTools mobile throttling.

### P6 · App shell & navigation
- **Objective:** The navigational skeleton with mock screens.
- **Deliverables:** Route groups `(auth)/(app)/(marketing)`; authed layout with **floating glass dock** (volt center Add button), `ScreenHeader` (large title, collapse-on-scroll, chevron context switcher), safe-area handling; placeholder screens for Home/Groups/Insights/Activity/Profile with static mock data; tab crossfade transitions; 404 + error boundaries styled.
- **Files:** `app/(app)/*`, `components/ui/TabBar.tsx`, `components/ui/ScreenHeader.tsx`.
- **Depends on:** P4, P5 · **Complexity: M**
- **Accept:** Can navigate all tabs on a phone; dock floats above safe-area; active tab glows volt; content never hides under dock.

### P7 · Widget system + mock Home
- **Objective:** Signature widget kit; Home looks like the final product (mock data).
- **Deliverables:** `WidgetGrid` (S/M/L sizing), widget anatomy base, `NetBalanceWidget` (aurora + DotMatrix), `OwedPairWidget` (mint/ember), `MonthSpendWidget` (+`Sparkline` stub), `BudgetRingWidget` (+`ProgressRing`), `InsightCard`, `ActivityRow`; assembled mock Home with staggered entrance.
- **Files:** `components/widgets/*`, `components/charts/ProgressRing.tsx`, `app/(app)/home/`.
- **Depends on:** P6 · **Complexity: M**
- **Accept:** Mock Home is screenshot-worthy vs the reference boards (~95% style match); widgets accept gradient/size props; entrance stagger on mount. **Design review gate.**

## Stage B — Backend Foundation (P8–P12)

### P8 · Database bootstrap
- **Objective:** Postgres + Drizzle pipeline working end-to-end.
- **Deliverables:** Neon project + `server/db/` (client, drizzle config); migration scripts (`db:generate/migrate/seed/studio`); `users` table (pre-auth shape); zod env validation for `DATABASE_URL`; seed script scaffold; docs in README.
- **Files:** `server/db/*`, `drizzle.config.ts`, `env.ts`.
- **Depends on:** P1 · **Complexity: S**
- **Accept:** Migration applies to Neon; seed runs; `db:studio` shows tables; build passes with env validation.

### P9 · Authentication
- **Objective:** Real accounts with premium auth UX.
- **Deliverables:** Better Auth (email+password + Google OAuth) with Drizzle adapter; auth tables migration; `/sign-in`, `/sign-up`, verification flow styled per design system; session helper `getSession()`; middleware protecting `(app)` routes; profile screen shows real user; sign out; auth rate limiting (Upstash).
- **Files:** `server/auth.ts`, `app/(auth)/*`, `app/api/auth/[...all]/`, `middleware.ts`, `features/auth/*`.
- **Depends on:** P8, P4 · **Complexity: L**
- **Accept:** Full sign-up → verify → sign-in → sign-out cycle works; unauthenticated `(app)` access redirects; sessions are httpOnly/SameSite; 5/min limit on auth attempts.

### P10 · Domain schema
- **Objective:** Entire `04-DATABASE.md` schema live.
- **Deliverables:** Migrations for groups, group_members, categories, expenses, expense_payers, expense_splits, settlements, invites, budgets, recurring_rules, activity_logs, notifications, push_subscriptions, attachments, tags (+enums, indexes, checks); Drizzle relations; system-category seed (10 categories w/ icon+gradient); rich dev seed (2 groups, 5 members incl. ghosts, 20 expenses).
- **Files:** `server/db/schema/*` (one file per domain), `server/db/seed.ts`.
- **Depends on:** P9 · **Complexity: M**
- **Accept:** Schema matches doc §2 exactly (columns, indexes, constraints verified in studio); seed produces a realistic dataset; CHECK constraints reject bad money values.

### P11 · Server action architecture
- **Objective:** The one gate all mutations pass through.
- **Deliverables:** `authedAction()` wrapper (session → rate limit → zod → transaction → AppError mapping → pino log w/ requestId → revalidateTag); `server/errors.ts` taxonomy; `server/ratelimit.ts` (Upstash factories + in-memory dev fallback); typed `ActionResult<T>`; client helper hook `useAction` (pending, field errors → toast mapping); demo action proving the full path.
- **Files:** `server/action.ts`, `server/errors.ts`, `server/ratelimit.ts`, `hooks/useAction.ts`.
- **Depends on:** P9 · **Complexity: M**
- **Accept:** Unit tests: unauth → UNAUTHORIZED, bad input → VALIDATION w/ field paths, rate-limit → RATE_LIMITED, thrown AppError surfaces typed, unknown error → INTERNAL + logged.

### P12 · Money & split engine
- **Objective:** The correctness core, finished before any expense UI exists.
- **Deliverables:** `lib/money.ts` (paise arithmetic, parse/format bridges); `lib/split.ts` — equal/exact/percent/shares with largest-remainder distribution, deterministic ordering, participant subsets, multi-payer validation; exhaustive Vitest + fast-check suites (invariant: Σ shares === amount for all random inputs).
- **Files:** `lib/money.ts`, `lib/split.ts`, co-located tests.
- **Depends on:** P1 · **Complexity: M**
- **Accept:** Property tests pass over ≥10k random cases; ₹100/3 and adversarial cases (1 paisa, huge amounts, 50 members) exact; 100% branch coverage on `split.ts`. **Foundation review gate.**

## Stage C — Group Core (P13–P19)

### P13 · Groups CRUD + stacked list
- **Objective:** Create and browse groups with the signature stacked-cards UI.
- **Deliverables:** `features/groups/` (schemas, service, actions, queries); create/edit sheet (name, emoji, gradient picker); archive; Groups screen: **stacked wallet-card deck** (peek headers, fan-open animation) + empty state; group detail scaffold (header with cover gradient, member chips from seed).
- **Files:** `features/groups/*`, `app/(app)/groups/*`, `components/widgets/GroupCard.tsx`.
- **Depends on:** P10, P11, P7 · **Complexity: L**
- **Accept:** Create → appears in deck instantly (optimistic); deck animation matches reference stack; archive hides from deck; authz: only members see a group.

### P14 · Members, ghosts & invites
- **Objective:** Full membership lifecycle — the adoption-critical phase.
- **Deliverables:** Add **ghost members** by name; invite links (`/join/[token]`, public OG-carded landing page); join as new/existing user; **claim ghost flow** (pick your name → atomic claim + user_id backfill); roles (owner/member); leave-at-zero-balance rule; member management sheet.
- **Files:** `features/groups/` (members), `app/(marketing)/join/[token]/`, invites service.
- **Depends on:** P13 · **Complexity: L**
- **Accept:** Ghost added in 2 taps; invite link joins a logged-out user through sign-up back to the group; claiming attaches prior history (verified by seed expense on ghost); token expiry/revocation enforced + rate-limited.

### P15 · Add expense — equal split
- **Objective:** The 10-second core flow, gorgeous.
- **Deliverables:** `features/expenses/` foundation; full-screen add sheet from dock's volt button: **step 1** amount (custom keypad) + description + category chips + date, **step 2** paid-by (member select), **step 3** split (equal, participant toggle) with live per-head preview; `createExpense` action (transaction: expense+payers+splits+activity, idempotency key); group timeline shows expenses grouped by day.
- **Files:** `features/expenses/*`, add-expense sheet components, group detail timeline.
- **Depends on:** P12, P13 · **Complexity: L**
- **Accept:** Default path ≤ 12 taps; splits paise-exact in DB; expense appears optimistically; day-grouped timeline matches design; double-submit blocked by idempotency.

### P16 · Advanced splits & multi-payer
- **Objective:** Every fairness model Splitwise has — smoother.
- **Deliverables:** Split step gains SegmentedControl: equal / exact ₹ / % / shares (steppers) with **live remainder validation** ("₹120 left to assign"); multiple payers with amount split; edit round-trip preserves original weights; expense detail sheet showing full breakdown.
- **Files:** `features/expenses/` split UI + schemas, expense detail sheet.
- **Depends on:** P15 · **Complexity: L**
- **Accept:** All four split types persist and re-edit correctly; UI blocks submission until remainder = 0; multi-payer expense (2 payers) round-trips; engine invariants hold in DB for every type.

### P17 · Balance engine
- **Objective:** Trustworthy "who owes whom", everywhere.
- **Deliverables:** `features/balances/`: SQL aggregation queries (per-member net, pairwise matrix, my-position summary); group header balances ("You are owed ₹1,250"); member chips show mini-balances; **Friends screen** (per-friend net across all shared groups); tag-based cache + invalidation on expense/settlement writes; zero-sum runtime assertion.
- **Files:** `features/balances/*`, `app/(app)/friends/` (or profile section), group header components.
- **Depends on:** P16 · **Complexity: M**
- **Accept:** Balances match hand-computed seed fixtures; Σ nets = 0 in every group; updates reflect within one revalidation of a new expense; friend aggregation correct across 2 shared groups.

### P18 · Settlement engine + Settle up
- **Objective:** The headline feature: minimal transfers, delightful settle flow.
- **Deliverables:** `lib/settle.ts` (greedy simplification, property-tested: zeroes balances, ≤ n−1 transfers, deterministic); Settle-up sheet: suggested transfers as cards ("Rohit → you · ₹840"), select → record payment (full/partial, method, note); settlement rows in timeline (distinct styling); settled-up celebration state (group at zero → mint glow moment).
- **Files:** `lib/settle.ts` + tests, `features/settlements/*`, settle-up sheet.
- **Depends on:** P17 · **Complexity: L**
- **Accept:** fast-check invariants pass (≥10k cases); recording suggested transfers drives group to exact zero; partial payment updates suggestions correctly; celebration triggers only at true zero.

### P19 · Group experience polish
- **Objective:** Group detail becomes complete and auditable.
- **Deliverables:** Expense edit/delete (soft) with authz (creator/payer/owner); activity trail on expense detail ("edited by Asha, yesterday"); timeline filters (member, category, date range); per-member spending mini-summary; group settings (rename, gradient, archive) wired; pull-to-refresh.
- **Files:** `features/expenses/`, `features/activity/` (writes), group detail screens.
- **Depends on:** P18 · **Complexity: M**
- **Accept:** Delete restores balances exactly; every mutation produced an activity row (same transaction); filters compose; non-authorized edit attempts rejected server-side. **"Splitwise-beater" review gate.**

## Stage D — Personal Finance (P20–P24)

### P20 · Personal expenses & unified ledger
- **Objective:** The second lens: all *my* money in one place.
- **Deliverables:** Add-expense sheet gains "Personal" context (skips payer/split steps → 2-step flow); personal ledger screen (day-grouped, category icons); **unified query**: personal expenses ∪ my share of group expenses (via `expense_splits.user_id` index) with source chips ("via Goa Trip"); quick-add from Home.
- **Files:** `features/expenses/` (personal), `app/(app)/expenses/` or Home section, unified queries.
- **Depends on:** P15, P17 · **Complexity: M**
- **Accept:** Personal add ≤ 8 taps; ledger shows both sources correctly deduped (my share only, not full group amount); month total matches hand-check of seed.

### P21 · Home dashboard — real data
- **Objective:** Mock Home becomes live.
- **Deliverables:** Wire P7 widgets to queries: net position (owed − owe, DotMatrix ticker), owed/owe pair, month spend + real sparkline (daily totals), recent activity (last 5), streaming with Suspense + skeletons; greeting header (time-of-day); quick actions row.
- **Files:** `app/(app)/home/*`, `features/analytics/queries.ts` (first queries).
- **Depends on:** P17, P20 · **Complexity: M**
- **Accept:** Home renders real numbers < 2s on throttled 4G; widgets stream independently (no all-or-nothing wait); numbers tick on revisit after a new expense.

### P22 · Categories & tags
- **Objective:** Organization primitives users can shape.
- **Deliverables:** Category manager in settings (create/edit/archive custom: name, Lucide icon picker, gradient); category chips ranked by user's recent usage; tags CRUD + tagging in add flow (`#trip`, `#work`); tag filter in ledger.
- **Files:** `features/categories/*`, tags in `features/expenses/`, settings screens.
- **Depends on:** P20 · **Complexity: S**
- **Accept:** Custom category appears in add-flow and analytics; archived categories keep historical expenses intact; tag filter returns exact matches.

### P23 · Budgets
- **Objective:** Budgets with pace, not just limits.
- **Deliverables:** `features/budgets/`: overall + per-category monthly budgets; Budgets screen (ring grid); ring states (normal → solar >80% → ember over); **pace line** ("₹412/day keeps you on budget"); Home budget widget wired; budget-threshold events logged (notification hook for P29).
- **Files:** `features/budgets/*`, `app/(app)/budgets/`, widget wiring.
- **Depends on:** P20, P22 · **Complexity: M**
- **Accept:** Ring math = (spent incl. group shares)/(budget) exact; month boundary respects user timezone; pace updates daily; over-budget state styled per spec.

### P24 · Recurring expenses
- **Objective:** Set-and-forget for rent & subscriptions.
- **Deliverables:** `features/recurring/`: create from any expense ("repeat monthly"); rules manager (pause/resume/end); **Vercel Cron** daily materializer (idempotent: scans `next_run_on <= today`, creates expenses with provenance, advances cursor); "Upcoming" section in ledger.
- **Files:** `features/recurring/*`, `app/api/cron/recurring/`.
- **Depends on:** P20, P11 · **Complexity: M**
- **Accept:** Cron run creates exactly one expense per due rule (re-run safe); monthly edge cases (Jan 31 → Feb 28) correct; paused rules skipped; created rows show "recurring" chip.

## Stage E — Analytics & Engagement (P25–P29)

### P25 · Chart kit
- **Objective:** The custom SVG visualization system.
- **Deliverables:** `components/charts/`: `AreaTrend` (gradient fill, glow line, draw-in, **tap-scrub** with value tooltip + haptic), `BarPeriod` (rounded, stagger-grow), `DonutCategory` (gradient arcs, center total, tap-to-highlight), `HeatmapCalendar`, finalized `Sparkline`; d3-scale/shape only; shared axis/label primitives; a11y data-table fallback per chart; gallery page.
- **Files:** `components/charts/*`, `app/dev/kit/`.
- **Depends on:** P5 · **Complexity: L**
- **Accept:** All charts render from plain data props (no fetch inside); scrubbing tracks finger at 60fps; draw-in respects reduced motion; visual match to design spec.

### P26 · Insights I — spending analytics
- **Objective:** Beautiful answers to "where does my money go?"
- **Deliverables:** Insights screen: period selector (W/M/3M/Y chips), spend trend `AreaTrend` with period-over-period comparison, category `DonutCategory` + ranked list (Δ vs last period), daily `HeatmapCalendar`, avg/day + biggest expense stat tiles; all queries timezone-correct, aggregated in SQL.
- **Files:** `app/(app)/insights/*`, `features/analytics/*`.
- **Depends on:** P25, P20 · **Complexity: L**
- **Accept:** Numbers reconcile with ledger totals exactly; period switch animates data (not remount); scrub shows day details; empty months designed.

### P27 · Insights II — cashflow & insight engine
- **Objective:** From charts to *judgments*.
- **Deliverables:** Cashflow view (in: settlements received/owed-to-me vs out: spend + settlements paid; net flow hero); rule-based **insight generator** (`features/analytics/insights.ts`: pure rules → ranked cards — category spikes ≥30%, budget pace warnings, "owed ₹X across N groups", largest-expense callouts, weekend-vs-weekday pattern); insight cards on Home + Insights.
- **Files:** `features/analytics/insights.ts` + tests, cashflow components.
- **Depends on:** P26, P23 · **Complexity: M**
- **Accept:** Insight rules unit-tested against fixture months; no insight repeats verbatim within its cooldown; cashflow in−out reconciles with balances. **Personal-finance review gate.**

### P28 · Activity feed & notification center
- **Objective:** Ambient awareness of group life.
- **Deliverables:** Activity screen: global feed (all my groups + personal) + per-group tab, rendered purely from `activity_logs.payload` (no joins), cursor pagination (UUIDv7), day grouping; notification fan-out on key verbs (expense involving me, settlement to me, member joined, budget threshold) written in-transaction; notification center sheet + unread badge on dock.
- **Files:** `features/activity/*`, `features/notifications/*`, `app/(app)/activity/`.
- **Depends on:** P19, P23 · **Complexity: M**
- **Accept:** New expense by another seeded member appears in my feed + as unread notification; mark-read/all works; pagination stable under concurrent writes; feed renders without N+1 queries.

### P29 · Search & filters
- **Objective:** Find any expense in seconds.
- **Deliverables:** Search screen (dock-adjacent or header): debounced omnisearch over expenses (description, notes), groups, friends via Postgres trigram/`websearch_to_tsquery`; filter sheet (date range, categories, groups, members, amount range, tags) with **composable chips** shown as active filters; recent searches (local).
- **Files:** `app/(app)/search/`, `features/expenses/search.ts`, filter sheet.
- **Depends on:** P20, P22 · **Complexity: M**
- **Accept:** Search returns only my-visible data (authz in query); < 150ms p95 on seed of 1k expenses (indexed); filters compose with AND semantics; empty results designed.

## Stage F — Platform & Production (P30–P36)

### P30 · Attachments & receipts
- **Objective:** Proof on every expense.
- **Deliverables:** `server/storage.ts` StorageAdapter (Vercel Blob impl); receipt capture in add/edit flow (camera/gallery), client-side compress + strip EXIF, MIME/size validation server-side; blurhash placeholders; full-screen viewer with pinch-zoom; delete with blob cleanup.
- **Files:** `server/storage.ts`, `features/expenses/` attachments, viewer component.
- **Depends on:** P16 · **Complexity: M**
- **Accept:** 8MB photo uploads compressed ≤ ~500KB; only group members can fetch a receipt (signed/authorized access); placeholder → image swap is smooth; oversized/wrong-type rejected with friendly error.

### P31 · Export & reports
- **Objective:** Data belongs to the user.
- **Deliverables:** CSV export (personal ledger + per-group, filter-aware) via streamed route handler; monthly summary view (top categories, totals, balances snapshot) shareable as a rendered image card (OG-style gradient report); export entry points in settings + group menu.
- **Files:** `app/api/export/`, `features/analytics/report.ts`, share card.
- **Depends on:** P26 · **Complexity: S**
- **Accept:** CSV opens clean in Excel/Sheets (UTF-8 BOM, ₹ amounts as numbers + currency column); export respects active filters; share card renders at 1200×630.

### P32 · PWA & offline
- **Objective:** Installable, resilient app.
- **Deliverables:** `manifest.ts` (icons, maskable, theme `#050506`), Serwist service worker: precached shell, SWR runtime caching for data routes; **offline outbox**: add-expense queued in IndexedDB with idempotency keys, background-sync flush, "pending" chip on queued rows; offline banner; custom install prompt (after 2nd session); iOS install hint sheet.
- **Files:** `app/manifest.ts`, `sw/`, outbox in `features/expenses/`, `hooks/useOnline.ts`.
- **Depends on:** P15, P21 · **Complexity: L**
- **Accept:** Airplane-mode: app opens, last data visible, expense added offline appears with pending chip and syncs (exactly once) on reconnect; Lighthouse PWA installable; update flow (new SW) doesn't white-screen.

### P33 · Push notifications
- **Objective:** Group activity reaches lock screens.
- **Deliverables:** Web Push (VAPID): `push_subscriptions` wiring, permission UX (soft-ask sheet before browser prompt, only after a meaningful moment); SW push + notification-click deep links; server fan-out on P28 events; per-type preference toggles in settings; settlement-reminder nudge ("remind Rohit" button).
- **Files:** `features/notifications/push.ts`, `app/api/push/`, SW handlers, settings.
- **Depends on:** P28, P32 · **Complexity: M**
- **Accept:** Expense added on device A → push on device B (Android + iOS-PWA); tapping opens the exact expense; disabled types never send; unsubscribed endpoints pruned on 410.

### P34 · Performance & accessibility pass
- **Objective:** Hit the numeric bars, formally.
- **Deliverables:** Bundle audit (analyzer) → dynamic-import heavy leaves, dedupe deps; verify streaming boundaries on all routes; image/font audit; interaction profiling on throttled device (fix long tasks > 50ms); full a11y sweep (focus order, labels, contrast on gradient panels, `aria-live` balances, 44px targets); axe checks in Playwright CI.
- **Files:** cross-cutting; `next.config.ts`.
- **Depends on:** P21, P26, P32 · **Complexity: M**
- **Accept:** Lighthouse mobile: Perf ≥ 90, A11y ≥ 95 on Home/Group/Insights; Home first-load JS < 160KB gzip; zero axe criticals; LCP < 2.0s on Moto-G-class throttle.

### P35 · Security hardening
- **Objective:** Close the gaps before real money data arrives.
- **Deliverables:** Security headers + strict CSP (nonce-based) in middleware; rate limits reviewed on every mutation + invite/token endpoints; authz test suite (every action attempted as non-member/wrong-role must fail); dependency audit + CI (`pnpm audit`, socket/renovate); session hardening review (rotation, absolute expiry); run `/security-review` checklist; secrets rotation doc.
- **Files:** `middleware.ts`, tests in `tests/authz/`, CI config.
- **Depends on:** P33 (all surfaces exist) · **Complexity: M**
- **Accept:** CSP live with zero console violations; authz suite green (≥1 negative test per action); no high/critical vulns; invite-token brute force impossible within expiry window (math documented).

### P36 · Observability, E2E & launch
- **Objective:** Production confidence.
- **Deliverables:** Sentry (client+server, release tagging, Web Vitals) + pino log drain + `/api/health`; Playwright E2E suite (390×844): the 5 critical journeys from `03-ARCHITECTURE.md` §7 against preview deploys; CI pipeline (typecheck→lint→unit→E2E→deploy); production env checklist (Neon prod branch, Upstash prod, VAPID keys, domains, backups verified); soft-launch runbook.
- **Files:** `sentry.*.config.ts`, `tests/e2e/*`, `.github/workflows/ci.yml`, `docs/RUNBOOK.md`.
- **Depends on:** P34, P35 · **Complexity: L**
- **Accept:** All E2E green in CI against a preview deploy; forced test error appears in Sentry with release + user context; deploy → health check → rollback path documented and rehearsed. **Launch gate.** 🚀

---

## Post-v1 backlog (unphased)
Light theme · multi-currency + FX · savings goals · OCR receipts · UPI deep-link "pay now" · shared budgets · realtime presence (group typing/added indicators) · native wrappers (Capacitor) · AI insights · Account Aggregator bank sync.
