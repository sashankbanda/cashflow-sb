# Cashflow — Session Handoff

> State snapshot for the next implementation session. Read this, then continue
> from **Phase 26** in [05-ROADMAP.md](05-ROADMAP.md). The design docs
> (01–05) remain the source of truth; this file records what is already built.

## Where to resume — Phase 26 (Insights I — spending analytics)

P1–P25 are complete, committed, and pushed to `origin/main`
(github.com/sashankbanda/cashflow-sb, latest `70d5a1a`). Next up **P26 Insights
I**, then P27→P36 in order. Per roadmap P26: an `/insights` screen with a
period selector (W/M/3M/Y chips), a spend-trend `AreaTrend` with
period-over-period comparison, a category `DonutCategory` + ranked list (Δ vs
last period), a daily `HeatmapCalendar`, and avg/day + biggest-expense stat
tiles. All aggregation must be timezone-correct SQL in `features/analytics`
(build on `getPersonalSpendTotal`/`getDailySpend` in
`features/expenses/personal-queries.ts` and add category/period rollups). The
**chart components are done** (P25) and take plain `{label,value}` /
`{label,value,palette}` / `{date,value}` props — just feed them query output.
Note: `/insights` is already routed and in `proxy.ts`; a page stub may exist.
Then P27 cashflow+insight engine, P28 activity/notifications, P29 search, P30
attachments, P31 export, P32 PWA, P33 push, P34 perf/a11y, P35 security, P36
observability/E2E/launch.

Reusable building blocks: `components/charts/{AreaTrend,BarPeriod,DonutCategory,
HeatmapCalendar,Sparkline,ProgressRing}` (+ `chart-primitives` ChartTable/
thinLabels), `lib/dates.ts#monthWindow`, `components/motion/*`, palette maps.

## Session 3 additions (P16–P22, newest commits)

- **P16 advanced splits & multi-payer** (`8302ba8`): `features/expenses/split-draft.ts` (pure, tested draft→engine models with live remainder messages), SplitEditor (equal/exact/percent/shares SegmentedControl), PayerEditor (single/split payment), `updateExpense` service (weight-preserving edit, creator/payer/owner authz), ExpenseDetailSheet.
- **P17 balance engine** (`7ecb520`): `lib/pairwise.ts` (proportional multi-payer debt ledger with paise column-repair; property-tested), `features/balances/queries.ts` (SQL nets via `db.execute`, `unstable_cache` keyed `group-money-v2` + `groupBalancesTag(groupId)`, `getGroupBalances`/`getMyNets`/`getFriendBalances`, zero-sum assert), `features/balances/label.ts`, Friends screen.
- **P18 settlement engine** (`d14b6de`): `lib/settle.ts` (greedy simplify, 10k-case property test, `applyTransfers`), `features/settlements/*`, SettleUpSheet (suggested transfers, partial, method+note), SettleUpLauncher pill, settlements in the timeline, all-settled celebration.
- **P19 group polish** (`83c83e0`): soft delete (`deleteExpense`, restores balances), per-expense activity trail, TimelineFilterSheet (member/category/date, AND), MemberTotals bars, `components/motion/PullToRefresh.tsx`.
- **P20 personal & unified ledger** (`2791543`): `createPersonalExpense`/`deletePersonalExpense`, AddExpenseFlow "Personal" context (sentinel `__personal__`, 1-step, `allowPersonal` from dock), `features/expenses/personal-queries.ts` (`getPersonalLedger`/`getPersonalSpendTotal`/`getDailySpend` — share-only, never double-counts), `/expenses` screen.
- **P21 home real data** (`98c4a92`): `features/analytics/queries.ts` `getHomeSummary`, Home streams live widgets behind Suspense, timezone greeting (`greetingFor`).
- **P22 categories & tags** (`cf119bd`): `features/categories/{schemas,service,tags-service,actions,queries}.ts`, CategoryManager at `/settings/categories`, usage-ranked category chips, TagPicker (inline create) in the add flow, `expense_tags` written in the create transaction, tag filter in the personal ledger. `CategoryOption` gained `isSystem`. Icon set is the curated `CATEGORY_ICONS` map in `features/categories/icons.tsx`.
- **P25 chart kit** (`70d5a1a`): `components/charts/` — `AreaTrend` (d3 `scaleLinear`+`area`/`line`+`curveMonotoneX`, gradient fill, glow line via drop-shadow, Motion `pathLength` draw-in, pointer-capture finger-scrub → HTML overlay marker/tooltip so the dot stays circular, `haptics.select` on index change), `BarPeriod` (HTML bars, `scaleY` stagger-grow via `springSmooth`+`staggerDelay`, tap-to-highlight), `DonutCategory` (d3 `pie`/`arc`, per-`PALETTE_HEX` gradients, live center readout, tap-to-focus), `HeatmapCalendar` (reuses `lib/dates#monthGrid`+`WEEKDAY_LABELS`, opacity intensity, tap-a-day readout), `chart-primitives.tsx` (`ChartTable` sr-only a11y fallback + `thinLabels`), `Sparkline` finalized. Charts are pure/presentational (plain data props, no fetch), color via `text-*` currentColor (default volt), reduced-motion gated. `/dev/kit` gained a charts section. New deps: `d3-scale`/`d3-shape`/`d3-array` (+ `@types`). Radius scale has no `xs` (sm=16px min). Verified live at `/dev/kit` (scrub + bar/slice/day taps, 0 page errors).
- **P24 recurring expenses** (`5e56882`): `features/recurring/recurrence.ts` (pure: `advanceDate` with monthly **anchor-day** clamping+recovery so Jan 31 → Feb 28 → Mar 31 without drift, `upcomingDates`, `isEnded`; property-tested), `schemas.ts` (discriminated `personal`|`group` template + `frequency`/`interval`/`startsOn`/`endsOn`), `service.ts` (`createRecurringRule` inserts the rule then materializes the first occurrence and advances the cursor, rolling back on failure; `pauseRule`/`resumeRule`/`endRule`/`deleteRule`; `materializeDueRules(today)` cron core — one expense per due rule then advance, per-occurrence idempotency key `recur:<ruleId>:<date>`, failures pause the rule), `queries.ts` (`getRecurringRules` + `getUpcomingOccurrences`). Cron route `app/api/cron/recurring/route.ts` (GET, `CRON_SECRET` bearer gate; runs unauthenticated only when no secret set), `vercel.json` schedules it daily 02:00 UTC. `createExpense`/`createPersonalExpense` gained an internal `options.recurringRuleId` (never client-set). UI: `RecurrencePicker` (Repeat toggle + Weekly/Monthly/Yearly) in the add flow create path, `/recurring` manager (`RecurringManager` list + Upcoming, per-rule action sheet), Upcoming card on `/expenses`, recurring chip (`Repeat` glyph) in `PersonalLedger` + `ExpenseTimeline`, Profile → Recurring link. `LedgerEntry`/`TimelineExpense` gained `isRecurring`. New env: optional `CRON_SECRET` (set it in Vercel prod). Verified live: cron creates exactly one new expense for a due rule and a re-run creates none (cursor advanced).
- **P23 budgets** (`4cdc63b`): `lib/dates.ts#monthWindow` (timezone-aware month boundary, tested); `features/budgets/pace.ts` (pure pace engine: `computeBudgetPace` → level ok/warn/over + pace line, `budgetToneClass`; property-tested); `schemas.ts` (`setBudget` categoryId nullable = overall), `service.ts` (`setBudget` upserts on the `budgets_user_category_period_uq` nulls-not-distinct index; `deleteBudget`/`clearOverallBudget`), `queries.ts` (`getBudgetOverview` one-pass + `getOverallBudgetSnapshot` light Home query; spend uses `getPersonalSpendTotal`/category-spend group-by, incl. group shares), `notifications.ts` (`notifyBudgetThresholds` best-effort, idempotent per budget/month/level, writes `notifications` rows type `budget_threshold`). UI: `/budgets` screen (`BudgetsScreen` overall pace hero + category ring cards, `BudgetFormSheet` category/overall picker + AmountKeypad, `BudgetRing`), `components/widgets/BudgetWidget.tsx` on Home (only when an overall budget exists), Profile → Budgets entry. `createExpense` now returns `participantUserIds`; create actions call `notifyBudgetThresholds`. Ring tones: volt (ok) → `text-warning` solar (>80%) → `text-negative` ember (over).

New load-bearing conventions this session: (a) `revalidateTag(tag, "max")` — Next 16 requires the cache-profile arg; (b) bump the `unstable_cache` key version (`group-money-v2`) whenever a cached shape changes — stale entries outlive deploys and surfaced as a `formatMoney(NaN)` crash; (c) `/settings/:path*` added to `proxy.ts`; (d) fast-check properties ≥10k runs need an explicit `{ timeout: 60_000 }` on the `it`.

Test count: **115 unit tests** (P24 added `features/recurring/recurrence.test.ts`; P23 added `lib/dates.test.ts` + `features/budgets/pace.test.ts`). P25 charts are presentational (verified via Playwright, not unit-tested). All green; typecheck/lint/build clean at HEAD.

---

## (Session 1–2 record below — P1–P15)

## Completed phases (all committed on `main`)

| Phase                        | Commit              | Notes                                                                                                                                                                                                                  |
| ---------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1 Project foundation        | `287ad64`           | Next 16.2 (Turbopack) · React 19 · TS strict (`noUncheckedIndexedAccess`) · Tailwind v4 · Vitest · pnpm                                                                                                                |
| P2 Design tokens & theming   | `7b9d562`           | `src/styles/tokens.css` `@theme` — Tailwind default color/type/radius/blur/shadow scales **cleared and replaced**; Inter + Doto via next/font; aurora backdrop; en-IN money formatters                                 |
| P3 UI primitives I           | `710d8cc`           | GlassCard/GradientPanel/Button/IconButton/Chip/Badge/Avatar(+Stack)/Divider/Skeleton/EmptyState/Spinner; `/dev/kit` gallery                                                                                            |
| P4 UI primitives II          | `34ebe41`           | Sheet (drag-dismiss, focus trap, bg scale via `.sheet-scale-target`), Toast, TextField/TextArea, SegmentedControl, Toggle, Slider, sheet Select, DateChip+calendar, AmountDisplay/AmountKeypad over `lib/amount-input` |
| P5 Motion system             | `72688ea`           | `components/motion/transitions.ts` presets (springSnappy/springSmooth/easeStandard/stagger), Pressable, NumberTicker, DotMatrixAmount, Stagger, route `template.tsx`, useHaptics                                       |
| P6 App shell & navigation    | `84b1d08`           | Route groups, floating dock TabBar, ScreenHeader (IO collapse bar — sentinel sits **after** the header, rootMargin −48px), 404/error surfaces                                                                          |
| P7 Widget system + mock Home | `3d55b8e`           | Widget/WidgetGrid, NetBalance/Owed/MonthSpend/BudgetRing widgets, Sparkline, ProgressRing, InsightCard, ActivityRow; design gate passed via Playwright screenshots                                                     |
| P8 Database bootstrap        | `7ca032c`           | Drizzle + Neon **neon-serverless WebSocket driver** (real transactions), `casing: "snake_case"`, UUIDv7 ids (`lib/ids.ts`), migrations 0000/0001 applied                                                               |
| P9 Authentication            | `8380f13`           | Better Auth: Google primary, account linking, 30-day sessions + 5-min cookie cache, `proxy.ts` gate, glass sign-in, session helpers (`requireUser`/`requireDbUser`)                                                    |
| P10 Domain schema            | `47819d4`           | Migration 0002: all 04-DATABASE.md tables + enums + partial indexes + money CHECKs; relations graph; idempotent engine-driven seed; constraints verified live                                                          |
| P11 Server actions           | `c42b893`           | `authedAction` (session→rate limit→zod→handler→`ActionResult`), AppError taxonomy, pino, Upstash-or-memory rate limiting, `useAction` hook; 8 pipeline tests                                                           |
| P12 Money & split engine     | `7ca032c` (with P8) | `lib/money.ts`, `lib/split.ts` (equal/exact/percent/shares, largest-remainder, memberId tie-break), `validatePayers`, `exactRemainder`; fast-check ≈10k cases/run                                                      |
| P13 Groups CRUD + deck       | `0a1832b`           | features/groups (schemas/service/queries/actions), `assertMember`/`assertOwner`, stacked wallet deck, create/edit sheet, archive, detail scaffold                                                                      |
| P14 Members/ghosts/invites   | `4d99e75`           | Ghosts, 7-day 128-bit invite tokens, `/join/[token]` + OG image, join/claim (atomic + userId backfill), leave-at-zero, MembersSheet; two-user E2E passed                                                               |
| P15 Add expense (equal)      | `2ededc7`           | 3-step flow in full sheet, transactional createExpense w/ idempotency key, day-grouped ExpenseTimeline, dock wiring with layout-fed context                                                                            |

**Unit tests: 66 passing** (`pnpm test`) · typecheck/lint/build all green at HEAD.

## Environment (`.env`, git-ignored; values already present locally)

`DATABASE_URL` (Neon, pooled) · `BETTER_AUTH_SECRET` · `BETTER_AUTH_URL=http://localhost:3000` · `GOOGLE_CLIENT_ID` · `GOOGLE_CLIENT_SECRET` · optional `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (absent → in-memory limiter fallback). Template in `.env.example`.

Database: live Neon, migrations `0000`–`0002` applied, seeded (3 users, 2 groups incl. ghosts, 14 expenses, 1 settlement, 10 system categories) plus E2E-created rows (users `e2e@cashflow.local`, `e2e-friend@cashflow.local`, groups "Ladakh ride", "Office lunches").

## Implementation decisions beyond the docs

- **Auth**: Google-only in production. `emailAndPassword` is enabled when `NODE_ENV !== "production"` purely as the automated-test path (no UI) — the E2E harness signs up/in via `POST /api/auth/sign-{up,in}/email`.
- **Next 16 specifics**: `proxy.ts` (not middleware.ts); `params`/`searchParams` are Promises; the new react-hooks lint rule forbids setState-in-effect — use `useSyncExternalStore` mount pattern (see Sheet.tsx) or animation callbacks (DotMatrixAmount).
- **Class discipline**: gradient/glow classes only via `components/ui/palette.ts` maps (`paletteBg`, `paletteGlow`, `PALETTE_HEX`, `asPalette`); category icons only via the curated `CATEGORY_ICONS` map in `features/categories/icons.tsx` (never import lucide's full registry).
- **Groups don't cascade expenses** (archive-not-delete) — seed resets delete expenses first.
- **`(app)/layout.tsx`** feeds TabBar with `getMyGroups` + `getCategoriesForUser` so the add-expense sheet opens with data; `router.refresh()` after mutations re-fetches it.
- **`memberNetMinor`** (features/groups/members-service.ts) is the minimal balance aggregation used by leave-at-zero; **P17 supersedes/generalizes it** in features/balances.
- Prettier reformats everything on commit (`pnpm format` before `git add`); Windows CRLF warnings are noise.

## Verification harness (reuse this pattern)

Playwright is a devDependency with Chromium installed. Scripts live in the session scratchpad and follow this pattern: start `pnpm dev` in background (**port 3000 is usually occupied by an unrelated app → dev lands on 3001; scripts take `BASE_URL`**), authenticate via the dev credentials endpoints, drive the UI at 390×844, screenshot, assert `pageerror` count is zero. Run node with `NODE_PATH` pointing at the project `node_modules`.

## Known issues / notes

1. **Real Google sign-in locally** needs port 3000 free (BETTER_AUTH_URL + registered redirect URI `http://localhost:3000/api/auth/callback/google`). The Google console must list that redirect URI.
2. A stray dev server from this session may still hold port 3001 (kill the `next dev` PID if `pnpm dev` complains).
3. `/dev/tokens` and `/dev/kit` galleries ship in the build (fine pre-launch; gate or strip at P34/P35).
4. AmountDisplay hero digits could read slightly larger (Doto metrics) — polish candidate for P34.
5. `docs/04-DATABASE.md` says payers/splits use composite PKs; implemented with surrogate UUID PKs + partial unique indexes `(expense_id, member_id) WHERE member_id IS NOT NULL` because member_id is NULL for personal expenses.

## Next exact starting point — Phase 16 (Advanced splits & multi-payer)

Per roadmap: extend `createExpenseSchema`/service to accept `splitType` (equal/exact/percent/shares) with per-participant weights and multiple payers (`validatePayers` in `lib/split.ts` is ready); split step gains a SegmentedControl with live remainder validation ("₹120 left to assign" via `exactRemainder`); expense detail sheet showing the full breakdown; edit round-trip preserving weights (weights already stored on `expense_splits.weight`). Then P17 balances → P18 settlement engine → P19 polish, and onward in roadmap order. All phases through P36 follow the same loop: implement → `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → authenticated Playwright verification → format → commit.
