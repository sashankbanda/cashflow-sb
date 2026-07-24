# Cashflow — Product Specification

> Working name: **Cashflow**. A premium, mobile-first money app: group expense splitting that feels effortless, growing into a complete personal finance companion. Design language: Apple HIG × VisionOS depth × liquid glass (see `02-DESIGN-SYSTEM.md`).

---

## 1. Vision

One app, two lenses on the same money:

1. **Group lens** — friends share expenses (trips, dinners, rent). The app tracks who paid, splits fairly, and settles everyone with the minimum number of transfers.
2. **Personal lens** — every rupee you spend (including _your share_ of group expenses) flows into one personal ledger: categories, budgets, trends, insights.

The integration is the moat: when a friend pays ₹2,500 for dinner and your share is ₹500, that ₹500 automatically appears in your personal "Food & Drinks" spend for the month. No double entry, ever.

## 2. Target user & core scenario

Groups of 3–8 friends in India (₹ INR first, multi-currency later). Ages 18–35, iPhone/Android, expect Apple-level polish.

**Canonical scenario:** 5 friends on a weekend trip. A pays ₹2,500 (restaurant), B pays ₹1,200 (movie), C pays ₹900 (petrol), D pays ₹8,000 (hotel). The app continuously answers:

- Who owes whom, and how much?
- What is _my_ net position (owed to me − I owe)?
- What is the **minimal set of transfers** that settles everyone?

## 3. Product principles

1. **Adding an expense must take < 10 seconds.** Amount → who paid → split → done. Smart defaults everywhere (last group, equal split, auto-category).
2. **Never make the user do math.** Splits, remainders, balances, settlements — all computed, all exact (integer paise).
3. **No account required to be owed money.** Friends can be added by name ("ghost members") and claim their history later via invite link. This is the #1 adoption lever.
4. **Balances are always trustworthy.** Deterministic, exhaustively tested settlement math. Money is never floats.
5. **Premium or nothing.** Every screen matches the design language; no unstyled intermediate states ship.

## 4. Feature map

### 4.1 Groups & splitting (core)

- Groups with name, emoji, gradient cover, currency; archive when done
- Members: registered users + **ghost members** (name-only, claimable via invite link)
- Invite via shareable link / QR
- Expenses: description, amount, date, category, notes, receipt photo, tags
- **Payers:** single or multiple payers per expense
- **Split types:** equally · unequally (exact amounts) · by percentage · by shares (2x, 1x…) · payer-excluded / subset of members
- Per-group balances: net per member + pairwise "who owes whom"
- **Settlement engine:** debt simplification → ≤ (n−1) transfers; "Settle up" suggests transfers; record full/partial payments (cash/UPI note)
- Friend view: net balance with each friend aggregated across all shared groups
- Expense edit/delete with soft delete + activity trail (auditability builds trust)

### 4.2 Personal finance

- Personal expense quick-add (no group)
- Unified personal ledger = personal expenses + my share of group expenses
- Categories (system defaults + custom, icon + gradient) and tags
- Budgets: overall + per-category, monthly (weekly later), pace indicator ("₹400/day left")
- Recurring expenses (rent, subscriptions) with auto-materialization
- Savings goals (later milestone)

### 4.3 Analytics & insights

- Spend trend (daily/weekly/monthly), period-over-period compare
- Category breakdown (donut + ranked list)
- Cash flow: in (owed to me, settlements received) vs out
- Calendar heatmap of daily spend
- Rule-based insight cards ("Food is up 32% vs last month", "You're owed ₹3,200 across 2 groups", "At this pace you'll exceed your Travel budget by the 24th")
- Monthly report + CSV export

### 4.4 Engagement & platform

- Activity timeline per group + global (append-only log of every change)
- In-app notification center; web push (expense added, you were paid, settlement reminder, budget threshold)
- Global search (expenses, groups, friends) + filters (date range, category, member, amount)
- Dark mode default (light theme later), PWA installable, offline read + queued expense add
- Receipt attachments with image optimization

### 4.5 Deliberately deferred (post-v1 backlog)

Multi-currency conversion · OCR receipt scanning · UPI deep-link payments · bank sync (Account Aggregator) · shared budgets · savings goals · widgets/home-screen shortcuts (native) · AI insights.

## 5. Information architecture

Floating dock (5 items, center is the primary action):

```
🏠 Home    👥 Groups    [＋ Add]    📊 Insights    👤 Profile
```

### Screen inventory

| #   | Screen           | Purpose / key elements                                                                                                                                                           |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Onboarding       | 3 swipe slides, gradient hero, "Continue with Google / email"                                                                                                                    |
| S2  | Auth             | Sign in / sign up / verify — glass forms                                                                                                                                         |
| S3  | **Home**         | Greeting header · hero net-position widget (dot-matrix numerals) · "Owed to you / You owe" pair widgets · month-spend widget with sparkline · budget ring · recent activity list |
| S4  | Groups list      | **Stacked wallet cards** (gradient per group, peek headers, tap to expand)                                                                                                       |
| S5  | Group detail     | Balance header, member chips with mini-balances, day-grouped expense timeline, floating "Settle up" pill                                                                         |
| S6  | Add expense      | Full-screen sheet, 3 steps: amount (custom keypad + description + category) → paid by → split; works for group _and_ personal                                                    |
| S7  | Expense detail   | Breakdown per member, payer(s), receipt, edit/delete, activity                                                                                                                   |
| S8  | Settle up        | Suggested minimal transfers, select & record payment (partial allowed)                                                                                                           |
| S9  | Friends          | Per-friend aggregate balance, drill into shared history                                                                                                                          |
| S10 | Insights         | Period selector chips · trend area chart · category donut · heatmap · insight cards · cashflow                                                                                   |
| S11 | Budgets          | Ring grid per category, overall ring, pace line                                                                                                                                  |
| S12 | Activity         | Global + per-group feeds, unread notifications                                                                                                                                   |
| S13 | Search           | Omnisearch with filter sheet                                                                                                                                                     |
| S14 | Profile/Settings | Account, appearance, notifications, categories manager, export, sign out                                                                                                         |
| S15 | Invite/claim     | Public invite landing → join group / claim ghost member                                                                                                                          |

### Navigation model

- Tab switches: crossfade + subtle vertical parallax (no full slide)
- Add expense / settle up / detail: **bottom sheets** (drag-to-dismiss), stacking depth like the reference cards
- Deep links: `/g/[groupId]`, `/g/[groupId]/e/[expenseId]`, `/join/[token]`

## 6. Settlement logic (product-level definition)

1. **Split exactness:** each expense's splits sum _exactly_ to the amount, in paise, using largest-remainder distribution (₹100 / 3 → 3334 + 3333 + 3333 paise; deterministic member ordering).
2. **Net balance** per member = Σ paid − Σ owed share ± settlements.
3. **Simplification:** greedy max-creditor ↔ max-debtor matching → guarantees ≤ n−1 transfers and zeroing of all balances. (True minimum-transaction count is NP-hard; greedy n−1 is the industry standard and is presented as "minimal transfers".)
4. Settlements are first-class records (not fake expenses) with their own timeline entries and notifications.
5. All math is pure TypeScript, no I/O, property-tested (see `03-ARCHITECTURE.md` §Testing).

## 7. Success criteria for v1

- Add expense flow ≤ 10s / ≤ 12 taps for the default path
- Balance & settlement math: 100% property-test pass, zero float usage
- LCP < 2.0s on mid-range Android over 4G; interactions at 60fps
- Lighthouse: Performance ≥ 90, Accessibility ≥ 95 (mobile)
- Installable PWA; core reads work offline
