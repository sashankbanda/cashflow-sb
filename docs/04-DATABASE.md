# Cashflow — Database Design (PostgreSQL + Drizzle)

> Conventions: PKs are `id text` (UUIDv7 — time-ordered, index-friendly). All money is `amount_minor bigint` (paise) + `currency char(3)` (default `'INR'`). Timestamps are `timestamptz` (`created_at` default now, `updated_at` on write). Soft delete via `deleted_at` where noted. Enums as Postgres enums.

---

## 1. Entity overview

```
users ─┬─ sessions/accounts/verifications (Better Auth)
       ├─ group_members ── groups
       │      │
       │      ├─ expenses ──┬─ expense_payers
       │      │             ├─ expense_splits
       │      │             ├─ attachments
       │      │             └─ expense_tags ── tags
       │      ├─ settlements
       │      ├─ invites
       │      └─ activity_logs
       ├─ categories (system rows have user_id NULL)
       ├─ budgets
       ├─ recurring_rules
       ├─ notifications
       └─ push_subscriptions
```

**Two key design decisions:**

1. **`group_members` is the identity used by all money tables** (`expense_payers.member_id`, `expense_splits.member_id`, `settlements.from/to_member_id`) — *not* `users.id`. This is what makes **ghost members** work: a member row can exist with `user_id NULL` (just a display name). When that friend signs up and claims an invite, we set `user_id` on the member row and their entire history attaches instantly — no money rows ever move.
2. **Personal expenses reuse the same `expenses` table** with `group_id NULL` (payer = owner, one split = owner). One table → personal analytics can aggregate "my share of everything" with a single indexed query over `expense_splits`.

## 2. Tables

### users
| column | type | notes |
|---|---|---|
| id | text PK | UUIDv7 |
| name | text NOT NULL | |
| email | text UNIQUE NOT NULL | citext behavior via lower-index |
| email_verified | boolean | |
| image | text | avatar URL |
| default_currency | char(3) default 'INR' | |
| timezone | text default 'Asia/Kolkata' | for daily analytics bucketing |
| onboarded_at, created_at, updated_at | timestamptz | |

Plus Better Auth tables: `sessions`, `accounts`, `verifications` (managed migrations).

### groups
| column | type | notes |
|---|---|---|
| id | text PK | |
| name | text NOT NULL | |
| emoji | text | cover emoji |
| gradient | text NOT NULL default 'ocean' | design-system palette key |
| currency | char(3) NOT NULL default 'INR' | |
| created_by | text FK users | |
| archived_at | timestamptz NULL | archive instead of delete |
| created_at, updated_at | | |

### group_members
| column | type | notes |
|---|---|---|
| id | text PK | **the money identity** |
| group_id | text FK groups ON DELETE CASCADE | |
| user_id | text FK users NULL | **NULL = ghost member** |
| display_name | text NOT NULL | snapshot; shown for ghosts |
| role | enum('owner','member') default 'member' | |
| joined_at | timestamptz | |
| left_at | timestamptz NULL | can only leave at zero balance |
- UNIQUE `(group_id, user_id)` WHERE user_id IS NOT NULL
- INDEX `(user_id)` — "my groups"; INDEX `(group_id)`

### categories
| column | type | notes |
|---|---|---|
| id | text PK | |
| user_id | text FK users NULL | **NULL = system category** (seeded: Food & Drinks, Travel, Groceries, Entertainment, Rent & Utilities, Shopping, Health, Fuel, Subscriptions, Other) |
| name | text NOT NULL | |
| icon | text NOT NULL | lucide icon name |
| gradient | text NOT NULL | palette key |
| sort | int | |
| archived_at | timestamptz NULL | |
- UNIQUE `(user_id, name)`; INDEX `(user_id)`

### expenses
| column | type | notes |
|---|---|---|
| id | text PK | |
| group_id | text FK groups NULL | **NULL = personal expense** |
| description | text NOT NULL | |
| amount_minor | bigint NOT NULL CHECK (> 0) | |
| currency | char(3) NOT NULL | |
| category_id | text FK categories | |
| split_type | enum('equal','exact','percent','shares') | |
| expense_date | date NOT NULL | user-chosen, drives analytics |
| notes | text | plain text |
| created_by | text FK users NOT NULL | |
| recurring_rule_id | text FK NULL | provenance of auto-created rows |
| idempotency_key | text NULL UNIQUE | dedupe offline retries |
| deleted_at | timestamptz NULL | soft delete |
| created_at, updated_at | | |
- INDEX `(group_id, expense_date DESC)` WHERE deleted_at IS NULL — group timeline
- INDEX `(created_by, expense_date DESC)` WHERE group_id IS NULL — personal ledger
- INDEX `(category_id)`

### expense_payers  (supports multiple payers)
| column | type |
|---|---|
| expense_id | text FK expenses ON DELETE CASCADE |
| member_id | text FK group_members / NULL for personal (then user via expense.created_by) |
| user_id | text FK users NULL | denormalized for personal-analytics speed |
| amount_minor | bigint CHECK (> 0) |
- PK `(expense_id, member_id)`; INDEX `(member_id)`
- Transaction invariant: Σ payers = expense.amount_minor

### expense_splits
| column | type | notes |
|---|---|---|
| expense_id | text FK expenses ON DELETE CASCADE | |
| member_id | text FK group_members NULL | NULL for personal |
| user_id | text FK users NULL | denormalized: filled when member is claimed |
| amount_minor | bigint NOT NULL CHECK (>= 0) | computed share in paise |
| weight | numeric NULL | original input (%, shares) for edit round-trip |
- PK `(expense_id, member_id)`; INDEX `(member_id)`
- **INDEX `(user_id, expense_id)`** — powers "my share of everything" personal analytics
- Transaction invariant: Σ splits = expense.amount_minor

### settlements
| column | type | notes |
|---|---|---|
| id | text PK | |
| group_id | text FK groups NOT NULL | |
| from_member_id / to_member_id | text FK group_members | payer → receiver |
| amount_minor | bigint CHECK (> 0) | partial payments allowed |
| method | enum('cash','upi','bank','other') | informational |
| note | text | |
| settled_at | timestamptz NOT NULL | |
| created_by | text FK users | |
| deleted_at | timestamptz NULL | |
- INDEX `(group_id, settled_at DESC)`; INDEX `(from_member_id)`, `(to_member_id)`

### invites
| column | type | notes |
|---|---|---|
| id | text PK; token | text UNIQUE (128-bit random) |
| group_id | FK groups; member_id | FK group_members NULL — set = claim link for that ghost |
| created_by | FK users; expires_at | timestamptz; revoked_at | NULL |
| max_uses / use_count | int | |
- INDEX `(token)` UNIQUE

### budgets
| column | type | notes |
|---|---|---|
| id | text PK; user_id | FK users |
| category_id | FK categories NULL | **NULL = overall budget** |
| amount_minor | bigint CHECK (> 0) | |
| period | enum('monthly','weekly') default 'monthly' | |
| starts_on | date; ends_on | date NULL (open-ended) |
| rollover | boolean default false | |
- UNIQUE `(user_id, category_id, period)` (active); INDEX `(user_id)`

### recurring_rules
| column | type | notes |
|---|---|---|
| id | text PK; user_id | FK users; group_id | FK NULL |
| template | jsonb | full expense payload (validated by zod) |
| frequency | enum('daily','weekly','monthly','yearly'); interval | int default 1 |
| next_run_on | date NOT NULL; ends_on | date NULL; paused_at | NULL |
- INDEX `(next_run_on)` WHERE paused_at IS NULL — cron scan

### activity_logs (append-only)
| column | type | notes |
|---|---|---|
| id | text PK (UUIDv7 = time-ordered cursor) | |
| group_id | FK NULL; actor_user_id | FK users |
| verb | enum('expense_added','expense_updated','expense_deleted','settlement_recorded','member_joined','member_claimed','group_created','group_updated','budget_hit', …) |
| object_type / object_id | text | polymorphic ref |
| payload | jsonb | denormalized snapshot for rendering without joins |
| created_at | timestamptz | |
- INDEX `(group_id, id DESC)`; INDEX `(actor_user_id, id DESC)`

### notifications
| column | type |
|---|---|
| id PK; user_id FK; type enum; payload jsonb; read_at NULL; created_at |
- INDEX `(user_id, read_at, created_at DESC)` — unread badge + feed

### push_subscriptions
`id PK; user_id FK; endpoint text UNIQUE; keys jsonb; user_agent; created_at`

### attachments
`id PK; expense_id FK CASCADE; uploaded_by FK users; url text; mime text; size_bytes int; width/height int; blurhash text; created_at`
- INDEX `(expense_id)`

### tags / expense_tags
`tags: id PK; user_id FK; name; UNIQUE(user_id, name)` · `expense_tags: PK(expense_id, tag_id)`

## 3. Balance computation (read path)

Net balance per member in a group — one aggregation, fully index-covered:

```sql
SELECT m.id,
       COALESCE(paid.total,0) - COALESCE(owed.total,0)
       + COALESCE(sett_out.total,0) - COALESCE(sett_in.total,0) AS net_minor
FROM group_members m
LEFT JOIN (payers grouped)      -- Σ expense_payers per member (live expenses)
LEFT JOIN (splits grouped)      -- Σ expense_splits per member
LEFT JOIN (settlements sent)    -- Σ from_member
LEFT JOIN (settlements received)-- Σ to_member
WHERE m.group_id = $1;
```

Invariant: Σ net over members = 0 (asserted in tests and as a runtime sanity check). Result cached with `revalidateTag`. **Scaling reserve:** if groups ever exceed ~10k expenses, add a `member_balances` cache table maintained in the write transaction — schema requires no change to adopt it.

## 4. Integrity rules enforced in transactions

1. Σ expense_splits = Σ expense_payers = expenses.amount_minor (paise-exact).
2. Every member_id in payers/splits belongs to the expense's group.
3. Members can leave only at net 0; groups archive rather than delete.
4. Settlement parties must be distinct members of the group.
5. Every money mutation writes exactly one activity_log row in the same transaction.
6. Ghost claim: `UPDATE group_members SET user_id = $claimer WHERE id = $member AND user_id IS NULL` + backfill `expense_splits.user_id` / `expense_payers.user_id` — atomic, idempotent.

## 5. Migration & scale notes

Additive-first migrations (never drop/rename in the same release as dependent code). UUIDv7 keeps B-trees append-friendly. All hot paths are single-group or single-user scans → horizontal read scaling is trivial; the jsonb columns (payload, template) absorb feature growth without schema churn. Multi-currency later = add `fx_rate` columns to expenses/settlements + a rates table; no structural change.
