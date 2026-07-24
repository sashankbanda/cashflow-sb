import { sql } from "drizzle-orm";
import { char, index, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";

export const memberRole = pgEnum("member_role", ["owner", "member"]);

export const groups = pgTable("groups", {
  id: text().primaryKey(),
  name: text().notNull(),
  emoji: text(),
  gradient: text().notNull().default("ocean"),
  currency: char({ length: 3 }).notNull().default("INR"),
  createdBy: text()
    .notNull()
    .references(() => users.id),
  archivedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * The money identity: every payer/split/settlement references a member row,
 * never a user directly. userId NULL = ghost member (name-only, claimable).
 */
export const groupMembers = pgTable(
  "group_members",
  {
    id: text().primaryKey(),
    groupId: text()
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text().references(() => users.id),
    displayName: text().notNull(),
    role: memberRole().notNull().default("member"),
    joinedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    uniqueIndex("group_members_group_user_uq")
      .on(table.groupId, table.userId)
      .where(sql`user_id is not null`),
    index("group_members_user_idx").on(table.userId),
    index("group_members_group_idx").on(table.groupId),
  ],
);

export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
