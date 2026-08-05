# Mutation coverage

Every `useAction` call site in the app. `useAction`'s `optimistic` option is
**required** — each site is either a real `useOptimistic` overlay, a non-blocking
instant-close, or an explicit `false` with a reason. Nothing is slow-by-default.

## Coverage counts

- **User-initiated mutations: 24.** Instant/optimistic: **9**. Blocking on the
  server: **0** — the 15 `false` mutations either navigate away, close a form and
  revalidate, or are fire-and-forget; none makes the user watch a spinner on the
  screen they stay on.
- **Reads (not mutations): 5** — `optimistic:false` because there is nothing to
  overlay.

## Mutations

| Call site | Changes | Optimism | Why |
|---|---|---|---|
| Personal add-expense | ledger row | **Outbox overlay** | instant `PendingExpenses` row; flush online/offline (one path) |
| Delete personal expense | ledger row | **useOptimistic overlay** | row vanishes on tap, reverts on failure |
| Edit personal entry | ledger row | false | sheet form; ledger re-renders from the server on refresh |
| Quick add (share/paste) | ledger row | **Outbox overlay** | same outbox path as the dock add |
| Delete attachment | receipt grid | **useOptimistic overlay** | tile vanishes on tap, reverts on failure |
| Archive category | custom list | **useOptimistic overlay** | row leaves on tap, reverts on failure |
| **Settle up** | balances | **Instant-close** | sheet closes on tap, records in background; honest success/fail toast |
| **Set budget** | budget list | **Instant-close** | sheet closes on tap; reconciles on revalidate |
| **Delete budget** | budget list | **Instant-close** | sheet closes on tap |
| Recurring pause/resume/end | rule status | **Instant-close** | sheet closes on tap |
| Delete recurring | rules list | **Instant-close** | sheet closes on tap |
| Group add-expense | group timeline | false | group-timeline overlay deferred (DECISIONS D1.3) |
| Edit expense | group timeline | false | deferred with the above |
| Delete group expense | group timeline | false | parent screen owns the timeline (D1.3) |
| Create recurring | rule (other screen) | false | result shows on the Recurring screen |
| Create / update category | category list | false | form closes; parent re-renders |
| Create tag | tag chips | false | needs the server-generated id for selection |
| Create group | — | false | navigates into the new group |
| Update / archive group | group | false | form close / navigates away |
| Add ghost member | member list | false | parent list re-renders |
| Create invite | link | false | generates a token; nothing to overlay |
| Leave group / join / claim | — | false | navigates away |
| Settle reminder | — | false | fire-and-forget notification |
| Subscribe / unsubscribe push | subscription | false | gated on the real browser PushManager result |
| Update notification prefs | toggles | false | toggle flips local state instantly; this persists |
| Mark all read | notification list | false | list is lazily loaded/nullable; marks read on confirm |

## Reads (`optimistic:false`)

`loadActivity`, `fetchInsights`, `search`, `listNotifications`, `listAttachments`.

## Failure path

Every optimistic overlay auto-reverts on failure (React `useOptimistic` discards
the overlay when the action settles) and surfaces a non-blocking error toast —
never a silent kept-value. Verified by `src/hooks/useAction.test.tsx` (the
"reverts to base when the action FAILS" test). Instant-close mutations never show
a premature success toast: the success toast fires only on the real `ok` result,
the error toast on failure.
