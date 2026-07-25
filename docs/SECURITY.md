# Cashflow — Security notes

Living record of the app's security posture. Updated during P35 (hardening).

## HTTP security headers (`src/proxy.ts` middleware)

Applied to every non-asset response:

- **Content-Security-Policy** — nonce-based. `script-src 'self' 'nonce-…'
'strict-dynamic'` (Next stamps the per-request nonce onto its own scripts);
  `style-src 'self' 'unsafe-inline'` (framework + Tailwind inject inline styles;
  nonce-ing them isn't practical); `img-src` allows `data:`/`blob:` + the Google
  avatar and Vercel Blob hosts; `connect-src 'self'`; `object-src 'none'`;
  `frame-ancestors 'none'`; `base-uri 'self'`; `form-action 'self'`;
  `upgrade-insecure-requests`. Dev adds `'unsafe-eval'` + `ws:` for HMR only.
- **Strict-Transport-Security** `max-age=63072000; includeSubDomains; preload`
- **X-Content-Type-Options** `nosniff`
- **Referrer-Policy** `strict-origin-when-cross-origin`
- **X-Frame-Options** `DENY` (belt-and-suspenders with `frame-ancestors`)
- **Permissions-Policy** `camera=(self)` (receipt capture), everything else off

## Authorization model

Every mutation goes through `authedAction` (`src/server/action.ts`): session →
per-user rate limit → zod → handler. Handlers never trust client-supplied ids;
they re-check membership/ownership against the DB:

- **Groups** — `assertMember` / `assertOwner` gate every group read and write; a
  non-member receives `FORBIDDEN`/`NOT_FOUND`, never data.
- **Expenses** — `canModifyExpense` (`features/expenses/authz.ts`, unit-tested):
  only the creator, a payer, or the group owner may edit/delete.
- **Personal data** — personal expenses, budgets, recurring rules, tags,
  categories, notifications, and attachments are all filtered by
  `userId = session.user.id`; ownership is asserted before mutation.
- **Attachments** — `/api/attachments/[id]` resolves the blob URL only after
  `accessibleExpense` confirms the viewer is a group member / owner.
- **Search & exports** — scoped in SQL to the caller's groups + personal rows.

## Rate limits (`src/server/ratelimit.ts`)

Upstash sliding window when configured, in-memory fallback otherwise.

- Mutations (all `authedAction`s): **60 / min / user**
- Invite-token lookups: **10 / min / IP**
- Receipt uploads (`POST /api/attachments`): **30 / min / user**
- Cron (`/api/cron/recurring`): `CRON_SECRET` bearer, not user-facing

## Invite-token brute force

Invite tokens are **128 bits** of CSPRNG entropy, expire after **7 days**, and
are single-group scoped. With the 10/min/IP lookup limit an attacker gets
≈ 10 × 60 × 24 × 7 ≈ **10⁵ guesses** over a token's whole life against a
**2¹²⁸** space — a ≈ 10⁻³³ chance of hitting any one live token. Expired/used
tokens are rejected regardless.

## Sessions

Better Auth: httpOnly + SameSite session cookies, 30-day expiry with a 5-minute
cookie cache; sign-out revokes. Google OAuth is the production sign-in;
email+password is enabled only when `NODE_ENV !== "production"` (the automated
test path).

## Dependencies

`pnpm audit --prod` is clean. Transitive advisories in Next's bundled
`postcss`/`sharp` and drizzle-kit's `esbuild` (build/dev tooling, not in the
runtime request path) are pinned to patched versions via `overrides` in
`pnpm-workspace.yaml`. Run `pnpm audit` in CI.

## Secrets & rotation

All secrets live in env (never committed): `DATABASE_URL`,
`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, optional
`UPSTASH_REDIS_REST_*`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`, `VAPID_*`.
Rotation: generate the new value in the provider, update Vercel env, redeploy,
then revoke the old value. `BETTER_AUTH_SECRET` rotation invalidates sessions
(users re-sign-in). VAPID rotation invalidates push subscriptions (clients
re-subscribe). `/dev/*` gallery routes 404 in production.
