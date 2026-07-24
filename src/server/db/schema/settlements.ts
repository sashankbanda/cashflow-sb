import { sql } from "drizzle-orm";
import { bigint, check, index, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { groupMembers, groups } from "./groups";
import { users } from "./users";

export const settlementMethod = pgEnum("settlement_method", ["cash", "upi", "bank", "other"]);

/** A recorded payment between two members — first-class, not a fake expense. */
export const settlements = pgTable(
  "settlements",
  {
    id: text().primaryKey(),
    groupId: text()
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fromMemberId: text()
      .notNull()
      .references(() => groupMembers.id),
    toMemberId: text()
      .notNull()
      .references(() => groupMembers.id),
    amountMinor: bigint({ mode: "number" }).notNull(),
    method: settlementMethod().notNull().default("upi"),
    note: text(),
    settledAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdBy: text()
      .notNull()
      .references(() => users.id),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("settlements_group_idx").on(table.groupId, table.settledAt.desc()),
    index("settlements_from_member_idx").on(table.fromMemberId),
    index("settlements_to_member_idx").on(table.toMemberId),
    check("settlements_amount_positive", sql`amount_minor > 0`),
    check("settlements_distinct_parties", sql`from_member_id <> to_member_id`),
  ],
);

export type Settlement = typeof settlements.$inferSelect;
