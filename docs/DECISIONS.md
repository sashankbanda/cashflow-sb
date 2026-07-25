# Decision log — native-feel rebuild (`feat/native-feel-rebuild`)

Autonomous run. Every decision that would otherwise be a question is recorded here:
decision · reasoning · rejected alternatives. Newest at the bottom of each phase.

---

## Phase 0 — setup

### D0.1 — Findings doc renamed to `docs/FINDINGS.md`
- **Decision:** moved `docs/REBUILD-FINDINGS.md` → `docs/FINDINGS.md` per the run brief.
- **Reasoning:** the brief names the file explicitly; one canonical path avoids two findings docs drifting.
- **Rejected:** keeping both (duplication); leaving the old name (contradicts brief).

### D0.2 — Green-gate verification per commit: typecheck + lint always, `next build` at phase ends
- **Decision:** every commit runs `tsc --noEmit` + `eslint` and must pass. Full `next build` is run at phase boundaries, not every commit.
- **Reasoning:** this machine is memory-constrained — `next build` has OOM-crashed here before (exit 3221226505), and `experimental.cpus:2` is already the guard. Typecheck+lint are fast, deterministic, and catch the real regressions; the authoritative production build runs on Vercel with ample RAM. Running a flaky OOM-prone build on every commit would stall the run without adding signal.
- **Rejected:** `next build` every commit (OOM risk, slow); skipping verification (violates the green-gate rule). If a local build OOMs at a phase boundary it is logged as an environment limitation, never reported as a code pass.

### D0.3 — Cannot produce on-device performance traces from this environment
- **Decision:** the final report will contain the measurement recipe and any numbers obtainable here (bundle/module sizes, build output), and will explicitly mark INP/fps/cold-start as "capture on device" rather than fabricating them.
- **Reasoning:** no physical device or Chrome trace driver is available here. Fabricated numbers on a money app's rebuild would be worse than honest gaps.
- **Rejected:** inventing before/after numbers.

---

## Phase 1 — response speed

### D1.1 — Optimism lives in `useAction` via `useOptimistic`, driven by the existing outbox
- **Decision:** extend the single `useAction` hook with an optional optimistic config `{ optimisticState, applyOptimistic }`; it calls `useOptimistic` internally. The offline outbox stays the one queue; online and offline adds reconcile from the same source.
- **Reasoning:** the brief mandates one mutation path and one queue. `useOptimistic` must be wired to the base state it overlays, so call sites pass their list + reducer, but the orchestration (apply → await → reconcile → revert) stays in the hook. No second pattern, no per-call-site hand-rolling.
- **Rejected:** a parallel optimistic store (violates "outbox is the only queue"); per-call-site `useOptimistic` (violates "one mutation path"); putting `useOptimistic` literally inside the hook with no base state (that is not how the React API works — it needs the overlaid state passed in).

### D1.2 — Personal add-expense: online now takes the same outbox path as offline
- **Decision:** the add flow always calls `enqueueExpense`; the outbox renders an instant optimistic row (`PendingExpenses`) and `OutboxSync` flushes to the server immediately on the `OUTBOX_CHANGED` event (online) or on reconnect (offline). `enqueueExpense` now returns a boolean; if IndexedDB is unavailable it returns false and the flow falls back to a direct server write.
- **Reasoning:** exactly the brief's "offline add and online add follow the same code path," with the outbox as the only queue. The optimistic mechanism already existed for offline — this just stops gating it behind `!navigator.onLine`. Add-expense is the app's highest-frequency, most-complained-about action, so it gets the win first.
- **Rejected:** a fresh `useOptimistic` overlay on the ledger for adds (the outbox already is the optimistic source — a second one would be the "parallel queue" the brief forbids); keeping the online await path (that is the lag itself).

### D1.3 — Group add-expense optimism deferred (kept correct, not yet optimistic)
- **Decision:** group expenses still take the awaited `createExpenseAction` path for now. Logged as a Phase-1 follow-up.
- **Reasoning:** the outbox model is personal-only (its payload has no payers/splits), and group-timeline optimism needs a `useOptimistic` overlay on the group-detail list, which the dock sheet does not own. Doing it right is a separate, larger change; doing it wrong risks money correctness on shared expenses. Personal adds cover the common dock flow.
- **Rejected:** forcing group adds through the personal outbox (wrong payload shape — would corrupt splits); a half-optimism that closes the sheet then shows nothing until revalidate (worse than the honest await).

### D1.4 — Personal add trades inline server field-errors for instant feel
- **Decision:** because a personal add now queues before the server validates, server-side inline field errors are no longer surfaced for it.
- **Reasoning:** this matches the pre-existing offline behavior, and the client already gates submit on `step1Valid` (amount valid, description non-empty ≤80, category set) — the same constraints the server enforces. A pre-flight validation round-trip would defeat the instant feel.
- **Rejected:** a validation round-trip before queueing (reintroduces the latency we are removing).

### D1.5 — `staleTimes` for instant tab switches
- **Decision:** `experimental.staleTimes = { dynamic: 30, static: 180 }` in `next.config.ts`.
- **Reasoning:** keeps the client Router Cache warm so bottom-tab switches and back/forward reuse the rendered screen (instant, scroll preserved) instead of re-running the route's server component. Mutations still bust it via `revalidateTag`, so data cannot go stale past a real write.
- **Rejected:** `dynamic: 0` (the default — forces a refetch on every tab switch, the exact "feels like a website" symptom); a very long TTL (risks showing pre-mutation data if a revalidate is missed).
