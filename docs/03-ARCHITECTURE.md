# Cashflow — Technical Architecture

---

## 1. Stack decisions (and why)

| Concern            | Choice                                                         | Why (vs alternatives)                                                                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework          | **Next.js 15+ (App Router), React 19, TypeScript strict**      | Server Components for fast first paint on mobile, Server Actions for typed mutations, streaming, one deploy target.                                                                                                                                       |
| Styling            | **Tailwind CSS v4**                                            | CSS-first `@theme` maps 1:1 to our token spec; zero-runtime; arbitrary values for glass recipes.                                                                                                                                                          |
| Database           | **PostgreSQL (Neon)**                                          | Money data is relational and transactional (splits must sum exactly — needs real transactions + constraints). Neon: serverless driver, branching for preview envs, generous free tier, scales later.                                                      |
| ORM                | **Drizzle**                                                    | SQL-first, no codegen step, tiny runtime (serverless-friendly cold starts), typed migrations, raw SQL escape hatch for balance aggregation queries. Prisma is heavier and hides the SQL we'll want to tune.                                               |
| Auth               | **Better Auth**                                                | TS-native, sessions live in _our_ Postgres (no vendor lock-in like Clerk, no pricing cliff), first-class email+password & Google OAuth, plugin system (rate limiting, 2FA later). NextAuth v5 has stalled DX; Better Auth is the current best OSS option. |
| Server state       | **TanStack Query v5**                                          | Cache, optimistic updates (critical for add-expense UX and offline queue), invalidation after Server Actions.                                                                                                                                             |
| Client state       | **Zustand** (sparingly)                                        | Only ephemeral UI state (add-expense wizard draft, sheet stack). Everything else is server state or URL state.                                                                                                                                            |
| Validation         | **Zod v4**                                                     | One schema per entity shared by form → action → service; single source of truth.                                                                                                                                                                          |
| Forms              | **React Hook Form** + zod resolver                             | Uncontrolled perf on low-end phones; but custom flows (amount keypad) use plain Zustand + Zod.                                                                                                                                                            |
| Animation          | **Motion (framer-motion v12)**                                 | Springs, layout animations, gestures (sheet drag), `AnimatePresence` for route transitions. CSS transitions for micro-interactions.                                                                                                                       |
| Charts             | **Custom SVG + d3-scale/d3-shape**                             | The design (gradient glows, dot grids, scrubbing) is unachievable by restyling Recharts; d3 math + our own ~6 components is smaller and fully on-language.                                                                                                |
| Icons              | **Lucide**                                                     | Consistent 24px stroke system, tree-shakeable.                                                                                                                                                                                                            |
| Dates              | **date-fns v4** (+ `@date-fns/tz`)                             | Tree-shakeable, TZ-safe "day" math for daily analytics.                                                                                                                                                                                                   |
| Money              | **Integer paise + in-house `Money` utils**                     | Never floats. `bigint` in DB, `number` in TS (safe ≪ 2^53). Largest-remainder split distribution. Dinero.js adds weight we don't need for single-currency v1.                                                                                             |
| Rate limiting / KV | **Upstash Redis**                                              | Serverless-native; `@upstash/ratelimit` sliding window on auth + mutations.                                                                                                                                                                               |
| File storage       | **Vercel Blob** behind a `StorageAdapter` interface            | Zero-config now; adapter lets us swap to R2/S3 without touching features.                                                                                                                                                                                 |
| PWA / offline      | **Serwist**                                                    | Maintained successor to next-pwa; precache shell, runtime cache, background sync for queued mutations.                                                                                                                                                    |
| Push               | **Web Push (VAPID)** via service worker                        | No Firebase dependency; works as PWA on Android + iOS 16.4+.                                                                                                                                                                                              |
| Testing            | **Vitest** + Testing Library + **fast-check** + **Playwright** | fast-check property tests are the correctness backbone of the settlement engine; Playwright mobile-viewport E2E for the 5 critical journeys.                                                                                                              |
| Logging / errors   | **Pino** (server) + **Sentry** (client+server)                 | Structured JSON logs with request IDs; Sentry for release-tagged error tracking + Web Vitals.                                                                                                                                                             |
| Deployment         | **Vercel** + Neon + Upstash                                    | Preview deploys per PR with Neon DB branches; cron for recurring expenses.                                                                                                                                                                                |

## 2. Folder structure (feature modules)

```
src/
├─ app/                          # Routes ONLY — thin files that compose features
│  ├─ (marketing)/               # public: landing, /join/[token]
│  ├─ (auth)/sign-in, sign-up
│  ├─ (app)/                     # authed shell: dock + headers
│  │  ├─ home/  groups/[groupId]/  insights/  budgets/  activity/  profile/  search/
│  ├─ api/                       # route handlers: auth/[...all], webhooks, cron, push, export
│  ├─ layout.tsx  globals.css  manifest.ts
├─ components/
│  ├─ ui/                        # design-system primitives (GlassCard, Button, Sheet…)
│  ├─ widgets/                   # widget system (NetBalanceWidget, GroupCard…)
│  ├─ charts/                    # SVG chart kit
│  └─ motion/                    # Pressable, NumberTicker, DotMatrix, transitions
├─ features/                     # ← the heart. One folder per domain.
│  ├─ groups/      ├─ expenses/     ├─ settlements/
│  ├─ balances/    ├─ categories/   ├─ budgets/
│  ├─ analytics/   ├─ activity/     ├─ notifications/
│  ├─ friends/     ├─ recurring/    └─ auth/
│  │   # each: components/  actions.ts  service.ts  queries.ts  schemas.ts  hooks.ts  types.ts
├─ server/
│  ├─ db/          # drizzle client, schema/ (one file per domain), migrations/, seed.ts
│  ├─ auth.ts      # Better Auth config
│  ├─ action.ts    # authedAction() wrapper (see §3)
│  ├─ errors.ts    # AppError taxonomy
│  ├─ ratelimit.ts # Upstash limiter factories
│  └─ storage.ts   # StorageAdapter
├─ lib/            # pure & isomorphic: money.ts, split.ts, settle.ts, format.ts, dates.ts, cn.ts
├─ hooks/          # cross-cutting client hooks (useSheet, useHaptics, useMediaQuery)
├─ styles/         # tokens.css (design tokens as CSS vars), fonts
└─ tests/          # e2e/ (Playwright), setup; unit tests co-located as *.test.ts
```

**Dependency rule:** `app` → `features` → (`server` | `lib` | `components`). Features never import from other features' internals — cross-domain reads go through the other feature's `service.ts`. `lib/` is pure (no I/O) — that's what makes the money math trivially testable.

## 3. Server architecture

### Data flow

- **Reads:** Server Components call `features/*/queries.ts` directly (no HTTP hop) → stream to client. Client-side refetch/pagination uses TanStack Query hitting thin route handlers that reuse the same queries.
- **Writes:** Server Actions in `features/*/actions.ts`, always through the wrapper:

```
authedAction(schema, handler, { limiter })
  1. resolve session (reject 401)
  2. rate limit (Upstash, per-user)
  3. zod-parse input (reject 422 with field errors)
  4. handler({ input, user, db }) → service call inside db.transaction()
  5. map thrown AppError → typed { ok:false, error } result; log via pino w/ requestId
  6. revalidate affected tags
```

- **Authorization is membership-scoped:** every group-scoped service starts with `assertMember(userId, groupId)` (single indexed lookup). Role checks (owner/admin) for destructive ops. Personal data is always `where userId = session.userId` — never trust a client-sent userId.
- **Idempotency:** mutation actions accept a client-generated `idempotencyKey` (unique column) so offline retries / double-taps never duplicate an expense.
- **Soft deletes** for expenses/settlements (`deletedAt`); activity log is append-only.
- **Error taxonomy:** `AppError(code: 'UNAUTHORIZED'|'FORBIDDEN'|'NOT_FOUND'|'VALIDATION'|'CONFLICT'|'RATE_LIMITED'|'INTERNAL')` — the only error shape that crosses the server boundary; UI maps codes to toasts/inline states.

### The engines (pure, in `lib/`)

- `split.ts` — computes per-member shares for all split types; **invariant: Σ shares === amount** (largest-remainder, deterministic order).
- `settle.ts` — net balances → greedy max-debtor/max-creditor matching → transfer list ≤ n−1; **invariants: transfers zero all balances; no transfer exceeds either party's balance; deterministic output.**
- Both are pure functions of plain data → property-tested with fast-check (thousands of random expense sets per run).

## 4. Security

- **AuthN:** Better Auth httpOnly, Secure, SameSite=Lax session cookies; session rotation; email verification; OAuth (Google).
- **AuthZ:** membership assertion on every group op (defense in depth: also enforced in SQL joins); role matrix owner/member for edit/delete/archive.
- **Input:** Zod on every boundary (actions, route handlers, cron payloads); file uploads validated by MIME + size (≤5MB) + re-encoded via image pipeline.
- **Injection:** Drizzle parameterized queries only; no string-built SQL.
- **XSS:** React escaping + strict CSP (no `unsafe-inline` scripts), sanitize the few user-string render paths (names, notes are plain text only).
- **CSRF:** Server Actions have built-in origin checks; route handlers verify Origin; cookies SameSite.
- **Rate limits:** auth endpoints 5/min/IP; mutations 60/min/user; invite-token lookups 10/min/IP (token guessing).
- **Headers:** HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy via middleware.
- **Secrets/PII:** env-validated at boot (zod); no PII in logs; invite tokens are 128-bit random, expiring, revocable.
- **Money integrity:** DB `CHECK (amount_minor > 0)`; splits sum enforced in the transaction; append-only activity log for audit.

## 5. Performance

- **Server Components by default**; `"use client"` only at interaction leaves (keypad, sheets, charts).
- **Streaming + Suspense:** shell renders instantly; balance widgets stream in with designed skeletons; `loading.tsx` per route.
- Route-level code splitting is free; heavy leaves (charts, confetti, keypad) behind `next/dynamic`.
- **Balance computation:** SQL aggregation (`GROUP BY member`) with covering indexes — not row-fetch-then-JS. Cached per group with `revalidateTag('group:{id}:balances')` on write. Denormalized balance cache table only if p95 demands it (schema reserves the option).
- TanStack Query: optimistic add-expense (instant UI), background revalidation.
- Fonts self-hosted via `next/font` (SF-stack fallback + Doto subset digits-only ≈ 8KB); images via `next/image` + blob loader; receipts get blur placeholders.
- Animations: `transform`/`opacity` only; `will-change` on sheets; no layout-thrashing blurs (blur layers are compositor-promoted, capped per screen).
- Budgets: first-load JS < 160KB gzip for Home; LCP < 2.0s mid-range Android; CLS < 0.05.
- SEO only for marketing + `/join/[token]` (OG image per invite: group name on gradient card); app routes are `noindex`.

## 6. Offline & sync strategy

Phased: (a) PWA install + precached shell + runtime-cached last-seen data (stale-while-revalidate) → (b) queued mutations: add-expense writes to an IndexedDB outbox with idempotency keys, background-sync flushes on reconnect, UI shows "pending" chip on queued expenses. Conflicts are naturally rare (append-mostly domain); edits use `updatedAt` compare → last-write-wins + activity log entry.

## 7. Testing strategy

| Layer          | Tool                                              | Coverage bar                                                                                                                                      |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/` engines | Vitest + fast-check                               | 100% branch; property invariants (splits sum, settlements zero, determinism)                                                                      |
| Services       | Vitest + test DB (Neon branch / pglite)           | happy + authz + conflict paths per service                                                                                                        |
| UI primitives  | Testing Library                                   | interaction states of Button/Sheet/Keypad/forms                                                                                                   |
| E2E            | Playwright (390×844 viewport)                     | 5 journeys: sign-up → create group → add expense (each split type) → settle up → verify zero balances; plus personal expense → budget → analytics |
| Visual         | Playwright screenshots on the widget gallery page | catch glass/token regressions                                                                                                                     |

CI: typecheck + lint + unit on every push; E2E on PR against preview deploy.

## 8. Observability & ops

Pino structured logs (requestId, userId, action, durationMs) → Vercel log drain. Sentry: errors + release health + Web Vitals. `/api/health` (DB ping). Vercel Cron: recurring-expense materialization (daily), notification digests, invite-token cleanup. Neon PITR backups; migration discipline: additive-first, never destructive in the same deploy as code relying on it.
