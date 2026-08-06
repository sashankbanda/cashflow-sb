import { bigint, boolean, char, date, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Per-type push preferences; an absent key means enabled. */
export type NotificationPrefs = Partial<Record<string, boolean>>;

/**
 * Application users. Shape is Better Auth-compatible (id/name/email/
 * emailVerified/image/createdAt/updatedAt) so the auth phase plugs in with a
 * custom model name instead of a parallel table.
 */
export const users = pgTable("users", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  defaultCurrency: char({ length: 3 }).notNull().default("INR"),
  timezone: text().notNull().default("Asia/Kolkata"),
  notificationPrefs: jsonb().notNull().default({}).$type<NotificationPrefs>(),
  /** Secret for the SMS auto-capture webhook (iOS Shortcut / Tasker). */
  captureToken: text().unique(),
  /** UPI ID (VPA) so friends can pay this user straight from Settle up. */
  upiId: text(),
  /** Starting balance in paise; when set, Home shows a true account balance. */
  openingBalanceMinor: bigint({ mode: "number" }),
  /**
   * Day the starting balance was captured (user's timezone). Only entries
   * dated on/after it move the account balance — history before it is already
   * inside the entered figure and must not be replayed.
   */
  openingBalanceSetOn: date({ mode: "string" }),
  onboardedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
