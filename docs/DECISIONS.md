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
