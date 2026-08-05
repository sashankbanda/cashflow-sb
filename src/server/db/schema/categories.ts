import { index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

/** Categories: userId NULL = system defaults, otherwise user-custom. */
export const categories = pgTable(
  "categories",
  {
    id: text().primaryKey(),
    userId: text().references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    icon: text().notNull(),
    gradient: text().notNull(),
    /** "expense" | "income" — pickers only show the matching kind. */
    kind: text().notNull().default("expense"),
    sort: integer().notNull().default(0),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("categories_user_name_uq").on(table.userId, table.name).nullsNotDistinct(),
    index("categories_user_idx").on(table.userId),
  ],
);

export type Category = typeof categories.$inferSelect;
