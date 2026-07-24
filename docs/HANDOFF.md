# Cashflow — Session Handoff

> State snapshot for the next implementation session. Read this, then continue
> from **Phase 16** in [05-ROADMAP.md](05-ROADMAP.md). The design docs
> (01–05) remain the source of truth; this file records what is already built.

## Completed phases (all committed on `main`)

| Phase | Commit | Notes |
| --- | --- | --- |
| P1 Project foundation | `287ad64` | Next 16.2 (Turbopack) · React 19 · TS strict (`noUncheckedIndexedAccess`) · Tailwind v4 · Vitest · pnpm |
| P2 Design tokens & theming | `7b9d562` | `src/styles/tokens.css` `@theme` — Tailwind default color/type/radius/blur/shadow scales **cleared and replaced**; Inter + Doto via next/font; aurora backdrop; en-IN money formatters |
| P3 UI primitives I | `710d8cc` | GlassCard/GradientPanel/Button/IconButton/Chip/Badge/Avatar(+Stack)/Divider/Skeleton/EmptyState/Spinner; `/dev/kit` gallery |
| P4 UI primitives II | `34ebe41` | Sheet (drag-dismiss, focus trap, bg scale via `.sheet-scale-target`), Toast, TextField/TextArea, SegmentedControl, Toggle, Slider, sheet Select, DateChip+calendar, AmountDisplay/AmountKeypad over `lib/amount-input` |
| P5 Motion system | `72688ea` | `components/motion/transitions.ts` presets (springSnappy/springSmooth/easeStandard/stagger), Pressable, NumberTicker, DotMatrixAmount, Stagger, route `template.tsx`, useHaptics |
| P6 App shell & navigation | `84b1d08` | Route groups, floating dock TabBar, ScreenHeader (IO collapse bar — sentinel sits **after** the header, rootMargin −48px), 404/error surfaces |
| P7 Widget system + mock Home | `3d55b8e` | Widget/WidgetGrid, NetBalance/Owed/MonthSpend/BudgetRing widgets, Sparkline, ProgressRing, InsightCard, ActivityRow; design gate passed via Playwright screenshots |
| P8 Database bootstrap | `7ca032c` | Drizzle + Neon **neon-serverless WebSocket driver** (real transactions), `casing: "snake_case"`, UUIDv7 ids (`lib/ids.ts`), migrations 0000/0001 applied |
| P9 Authentication | `8380f13` | Better Auth: Google primary, account linking, 30-day sessions + 5-min cookie cache, `proxy.ts` gate, glass sign-in, session helpers (`requireUser`/`requireDbUser`) |
| P10 Domain schema | `47819d4` | Migration 0002: all 04-DATABASE.md tables + enums + partial indexes + money CHECKs; relations graph; idempotent engine-driven seed; constraints verified live |
| P11 Server actions | `c42b893` | `authedAction` (session→rate limit→zod→handler→`ActionResult`), AppError taxonomy, pino, Upstash-or-memory rate limiting, `useAction` hook; 8 pipeline tests |
| P12 Money & split engine | `7ca032c` (with P8) | `lib/money.ts`, `lib/split.ts` (equal/exact/percent/shares, largest-remainder, memberId tie-break), `validatePayers`, `exactRemainder`; fast-check ≈10k cases/run |
| P13 Groups CRUD + deck | `0a1832b` | features/groups (schemas/service/queries/actions), `assertMember`/`assertOwner`, stacked wallet deck, create/edit sheet, archive, detail scaffold |
| P14 Members/ghosts/invites | `4d99e75` | Ghosts, 7-day 128-bit invite tokens, `/join/[token]` + OG image, join/claim (atomic + userId backfill), leave-at-zero, MembersSheet; two-user E2E passed |
| P15 Add expense (equal) | `2ededc7` | 3-step flow in full sheet, transactional createExpense w/ idempotency key, day-grouped ExpenseTimeline, dock wiring with layout-fed context |

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
