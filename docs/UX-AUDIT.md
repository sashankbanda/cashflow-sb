# UX / IA audit — screen → issue → law → fix → status

Applied against `ux-laws (1).md`. The IA was already sound (dock + one primary
action per screen), so these are targeted fixes, not a re-architecture.

| Screen | What's wrong | Law | Fix | Status |
|---|---|---|---|---|
| Budgets, Categories, Recurring, Notifications | Back button in the top-**right** | Jakob's | Moved Back to the top-left `leading` slot | ✅ P3 `feat(p3): uniform top-left Back` |
| All secondary screens | No way to swipe back (PWA has no browser gesture) | Jakob's | `EdgeSwipeBack` left-edge drag-to-pop | ✅ P3 |
| All inputs | 15px (13px in TagPicker) → iOS zoom on focus | Postel's / native | Unlayered 16px rule on form controls | ✅ P3 |
| Reports | "Share" opened a new browser tab | Jakob's | `navigator.share` OS sheet with the PNG | ✅ P3 |
| Every non-Home route | Blank freeze on the previous screen while loading | Doherty | Deferred `loading.tsx` skeletons (invisible <200ms) | ✅ P1 |
| Whole app | Taps waited on the server before anything moved | Doherty | Optimistic add (outbox) + optimistic ledger delete | ✅ P1 |
| Profile | "Appearance" row is a dead `<div>` (chevron, no action) | Postel's / Aesthetic-Usability | Removed the dead affordance | ✅ P5 |
| Search | Full-screen spinner while querying | Doherty | Result skeleton rows instead of a spinner | ✅ P5 |
| Home / lists | "See all" & row links hover-only, small target | Fitts's | Press (`active:`) state + ≥44px target | ✅ P5 |
| Expenses | Personal rows tappable, group-share rows not — identical look | Law of Similarity | Interactive rows have `active:` press feedback that static rows lack; fuller visual distinction in Phase 6 | ◑ Partial |
| Group detail, Budgets | Densest screens (~8–12 controls at once) | Hick's / Miller | Demote secondary actions into an overflow sheet | ⏭ Deferred (larger IA change; needs product input) |
| Reports | Month via `‹ ›` full-page nav | Jakob's | Swipe / in-place month change | ⏭ Deferred (edge-swipe-back now covers back-nav) |
| Activity | "Load more" button vs infinite scroll | Jakob's | Intersection-observer infinite scroll | ⏭ Deferred (optional; button is acceptable) |
| Add-expense commit, settle-up | The two emotional peaks are under-celebrated | Peak-End | Success haptic + confirmation moment | ◑ Partial (Android success haptic; fuller moment in Phase 6 redesign) |

Legend: ✅ done · ◑ partial · ⏭ deferred (with reason).
