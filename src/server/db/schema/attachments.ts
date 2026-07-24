import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { expenses } from "./expenses";
import { users } from "./users";

/** Receipt images attached to expenses (stored via the storage adapter). */
export const attachments = pgTable(
  "attachments",
  {
    id: text().primaryKey(),
    expenseId: text()
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    uploadedBy: text()
      .notNull()
      .references(() => users.id),
    url: text().notNull(),
    mime: text().notNull(),
    sizeBytes: integer().notNull(),
    width: integer(),
    height: integer(),
    blurhash: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("attachments_expense_idx").on(table.expenseId)],
);

export type Attachment = typeof attachments.$inferSelect;
