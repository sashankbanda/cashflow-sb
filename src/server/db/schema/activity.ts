import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { users } from "./users";

export const activityVerb = pgEnum("activity_verb", [
  "group_created",
  "group_updated",
  "group_archived",
  "member_added",
  "member_joined",
  "member_claimed",
  "member_left",
  "invite_created",
  "expense_added",
  "expense_updated",
  "expense_deleted",
  "settlement_recorded",
  "settlement_deleted",
  "budget_hit",
]);

/**
 * Append-only audit trail. `payload` carries a denormalized snapshot so feeds
 * render without joins; UUIDv7 ids double as time-ordered pagination cursors.
 */
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: text().primaryKey(),
    groupId: text().references(() => groups.id, { onDelete: "cascade" }),
    actorUserId: text()
      .notNull()
      .references(() => users.id),
    verb: activityVerb().notNull(),
    objectType: text().notNull(),
    objectId: text().notNull(),
    payload: jsonb().notNull().$type<Record<string, unknown>>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_logs_group_idx").on(table.groupId, table.id.desc()),
    index("activity_logs_actor_idx").on(table.actorUserId, table.id.desc()),
  ],
);

export type ActivityLog = typeof activityLogs.$inferSelect;
export type ActivityVerb = (typeof activityVerb.enumValues)[number];
