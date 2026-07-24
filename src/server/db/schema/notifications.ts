import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationType = pgEnum("notification_type", [
  "expense_added",
  "settlement_recorded",
  "settlement_reminder",
  "member_joined",
  "member_claimed",
  "budget_threshold",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType().notNull(),
    payload: jsonb().notNull().$type<Record<string, unknown>>(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_user_read_idx").on(table.userId, table.readAt, table.createdAt.desc()),
  ],
);

/** Web Push subscriptions (VAPID); endpoint is globally unique per browser. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text().notNull().unique(),
  keys: jsonb().notNull().$type<{ p256dh: string; auth: string }>(),
  userAgent: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export type Notification = typeof notifications.$inferSelect;
export type NotificationType = (typeof notificationType.enumValues)[number];
