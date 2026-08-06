import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  date,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { groupMembers, groups } from "./groups";
import { recurringRules } from "./recurring";
import { users } from "./users";

export const splitTypeEnum = pgEnum("split_type", ["equal", "exact", "percent", "shares"]);

/** One expense. groupId NULL = personal expense (payer = owner, one split). */
export const expenses = pgTable(
  "expenses",
  {
    id: text().primaryKey(),
    groupId: text().references(() => groups.id),
    description: text().notNull(),
    amountMinor: bigint({ mode: "number" }).notNull(),
    currency: char({ length: 3 }).notNull().default("INR"),
    /** Money in, not out. Personal-only; excluded from all spend totals. */
    isIncome: boolean().notNull().default(false),
    categoryId: text().references(() => categories.id),
    splitType: splitTypeEnum().notNull(),
    expenseDate: date({ mode: "string" }).notNull(),
    notes: text(),
    createdBy: text()
      .notNull()
      .references(() => users.id),
    recurringRuleId: text().references(() => recurringRules.id),
    /** Client/dedup key — unique PER USER (see index), so one user's key can
     *  never collide with (or block) another user's insert. */
    idempotencyKey: text(),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("expenses_group_date_idx")
      .on(table.groupId, table.expenseDate.desc())
      .where(sql`deleted_at is null`),
    index("expenses_creator_date_idx")
      .on(table.createdBy, table.expenseDate.desc())
      .where(sql`group_id is null and deleted_at is null`),
    index("expenses_category_idx").on(table.categoryId),
    // Category usage ranking counts a user's own expenses per category.
    index("expenses_creator_category_idx")
      .on(table.createdBy, table.categoryId)
      .where(sql`deleted_at is null`),
    uniqueIndex("expenses_owner_idempotency_uq").on(table.createdBy, table.idempotencyKey),
    check("expenses_amount_positive", sql`amount_minor > 0`),
  ],
);

/** Who put money down (supports multiple payers). memberId NULL = personal. */
export const expensePayers = pgTable(
  "expense_payers",
  {
    id: text().primaryKey(),
    expenseId: text()
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    memberId: text().references(() => groupMembers.id),
    /** Denormalized user link; filled on ghost claim for personal analytics. */
    userId: text().references(() => users.id),
    amountMinor: bigint({ mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("expense_payers_expense_member_uq")
      .on(table.expenseId, table.memberId)
      .where(sql`member_id is not null`),
    // Plain expense_id lookup (the partial unique above can't serve it, since
    // it only applies WHERE member_id IS NOT NULL).
    index("expense_payers_expense_idx").on(table.expenseId),
    index("expense_payers_member_idx").on(table.memberId),
    index("expense_payers_user_idx").on(table.userId),
    check("expense_payers_amount_positive", sql`amount_minor > 0`),
  ],
);

/** Each participant's exact computed share. memberId NULL = personal. */
export const expenseSplits = pgTable(
  "expense_splits",
  {
    id: text().primaryKey(),
    expenseId: text()
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    memberId: text().references(() => groupMembers.id),
    /** Denormalized user link; powers "my share of everything" analytics. */
    userId: text().references(() => users.id),
    amountMinor: bigint({ mode: "number" }).notNull(),
    /** Original input weight (%, shares, exact paise) for edit round-trips. */
    weight: doublePrecision(),
  },
  (table) => [
    uniqueIndex("expense_splits_expense_member_uq")
      .on(table.expenseId, table.memberId)
      .where(sql`member_id is not null`),
    index("expense_splits_expense_idx").on(table.expenseId),
    index("expense_splits_member_idx").on(table.memberId),
    index("expense_splits_user_expense_idx").on(table.userId, table.expenseId),
    check("expense_splits_amount_non_negative", sql`amount_minor >= 0`),
  ],
);

export type Expense = typeof expenses.$inferSelect;
export type ExpensePayer = typeof expensePayers.$inferSelect;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
