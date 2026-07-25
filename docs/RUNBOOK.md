# Cashflow — Production runbook

## Stack

Next.js 16 (App Router, Turbopack) · Neon Postgres + Drizzle · Better Auth
(Google OAuth) · Vercel. Money is integer paise end-to-end.

## Environment variables (Vercel → Project → Settings → Environment)

Required:

- `DATABASE_URL` — Neon **pooled** connection string (prod branch)
- `BETTER_AUTH_SECRET` — 32+ char random (`openssl rand -base64 32`)
- `BETTER_AUTH_URL` — the production origin (e.g. `https://cashflow.app`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth; add the prod redirect URI
  `https://<domain>/api/auth/callback/google` in Google Cloud Console

Recommended:

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — durable rate limiting
  (falls back to in-memory per-instance otherwise)
- `CRON_SECRET` — bearer for `/api/cron/recurring` (Vercel Cron sends it)

Feature-gated (the feature no-ops without its key):

- `BLOB_READ_WRITE_TOKEN` — receipt attachments (Vercel Blob store)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — Web Push
  (`node -e "console.log(require('web-push').generateVAPIDKeys())"`)
- `SENTRY_DSN` — error tracking drop-in (see `src/instrumentation.ts`)

## Database

- Migrations live in `src/server/db/migrations` (0000–0004).
- Apply to a branch: `DATABASE_URL=… pnpm db:migrate`.
- Seed system categories + demo data: `pnpm db:seed` (idempotent).
- Cron: `vercel.json` schedules `/api/cron/recurring` daily at 02:00 UTC.

## Deploy

1. Merge to `main` → Vercel builds a Preview, then Production on promotion.
2. CI (`.github/workflows/ci.yml`) gates PRs on typecheck · lint · unit · build.
3. Apply any new migration to the prod Neon branch **before** promoting.
4. Post-deploy check: `curl https://<domain>/api/health` → `{"status":"ok"}`.
5. E2E (opt-in `workflow_dispatch`) runs the critical journeys against a preview
   seeded with the e2e users (`E2E_BASE_URL` secret).

## Health & observability

- `GET /api/health` — liveness + DB ping (`503` if the DB is unreachable).
- Web Vitals beacon to `/api/vitals` → structured pino logs.
- `onRequestError` (`src/instrumentation.ts`) logs every unhandled request error;
  wire `SENTRY_DSN` there for hosted error tracking.

## Rollback

Vercel → Deployments → the last known-good deployment → **Promote to
Production** (instant, atomic). If a migration is implicated, roll the app back
first, then reconcile the schema on the Neon branch. Neon PITR/branching covers
data recovery.

## On-call quick checks

- App down → `/api/health`; if `degraded`, check Neon status + `DATABASE_URL`.
- Auth failing → verify `BETTER_AUTH_URL` matches the origin + the Google
  redirect URI is registered.
- Rate-limit noise → confirm Upstash env is set (else limits are per-instance).
- Push not delivering → confirm `VAPID_*` set; 410 endpoints self-prune.
