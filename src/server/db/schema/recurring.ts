import { sql } from "drizzle-orm";
import { date, index, integer, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { users } from "./users";

export const recurringFrequency = pgEnum("recurring_frequency", [
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

/**
 * Recurring expense rules. `template` holds the full expense payload
 * (zod-validated by the recurring feature before writes); the daily cron
 * materializes due rules into real expenses and advances `nextRunOn`.
 */
export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: text().references(() => groups.id, { onDelete: "cascade" }),
    template: jsonb().notNull().$type<Record<string, unknown>>(),
    frequency: recurringFrequency().notNull(),
    interval: integer().notNull().default(1),
    nextRunOn: date({ mode: "string" }).notNull(),
    endsOn: date({ mode: "string" }),
    pausedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("recurring_rules_next_run_idx")
      .on(table.nextRunOn)
      .where(sql`paused_at is null`),
    index("recurring_rules_user_idx").on(table.userId),
  ],
);

export type RecurringRule = typeof recurringRules.$inferSelect;
