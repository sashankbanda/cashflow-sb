import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { categories } from "./categories";
import { users } from "./users";

export const budgetPeriod = pgEnum("budget_period", ["monthly", "weekly"]);

/** Personal budgets. categoryId NULL = the overall budget. */
export const budgets = pgTable(
  "budgets",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text().references(() => categories.id, { onDelete: "cascade" }),
    amountMinor: bigint({ mode: "number" }).notNull(),
    period: budgetPeriod().notNull().default("monthly"),
    startsOn: date({ mode: "string" }).notNull(),
    endsOn: date({ mode: "string" }),
    rollover: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("budgets_user_category_period_uq")
      .on(table.userId, table.categoryId, table.period)
      .nullsNotDistinct(),
    index("budgets_user_idx").on(table.userId),
    check("budgets_amount_positive", sql`amount_minor > 0`),
  ],
);

export type Budget = typeof budgets.$inferSelect;
