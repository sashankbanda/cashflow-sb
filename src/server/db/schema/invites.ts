import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { groupMembers, groups } from "./groups";
import { users } from "./users";

/**
 * Shareable invite links. memberId NULL = generic "join this group" link;
 * set = claim link for a specific ghost member.
 */
export const invites = pgTable(
  "invites",
  {
    id: text().primaryKey(),
    token: text().notNull().unique(),
    groupId: text()
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    memberId: text().references(() => groupMembers.id, { onDelete: "cascade" }),
    createdBy: text()
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    maxUses: integer(),
    useCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("invites_group_idx").on(table.groupId)],
);

export type Invite = typeof invites.$inferSelect;
