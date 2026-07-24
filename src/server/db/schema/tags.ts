import { pgTable, primaryKey, text, timestamp, unique } from "drizzle-orm/pg-core";
import { expenses } from "./expenses";
import { users } from "./users";

export const tags = pgTable(
  "tags",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("tags_user_name_uq").on(table.userId, table.name)],
);

export const expenseTags = pgTable(
  "expense_tags",
  {
    expenseId: text()
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    tagId: text()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.expenseId, table.tagId] })],
);

export type Tag = typeof tags.$inferSelect;
