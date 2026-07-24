import { boolean, char, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
  onboardedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
