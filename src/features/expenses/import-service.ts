import "server-only";
import { deterministicUuid } from "@/server/hash-id";
import type { ActionUser } from "@/server/action-core";
import { resolveCategoryId } from "./categorize";
import { createPersonalExpense } from "./service";

export interface ImportRow {
  /** ISO day. */
  date: string;
  description: string;
  amountMinor: number;
  isIncome: boolean;
}

/**
 * Book parsed statement rows as personal entries. Each row's idempotency key
 * is derived from its content, so re-importing an overlapping CSV (last
 * month's statement again) silently skips what's already in — never doubles.
 * Categories come from merchant memory with the usual fallback.
 */
export async function importStatementRows(
  user: ActionUser,
  rows: ReadonlyArray<ImportRow>,
): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    const resolved = await resolveCategoryId(user.id, row.description, row.isIncome);
    if (!resolved) {
      skipped += 1;
      continue;
    }
    const result = await createPersonalExpense(user, {
      description: row.description,
      amountMinor: row.amountMinor,
      categoryId: resolved.categoryId,
      expenseDate: row.date,
      idempotencyKey: deterministicUuid(
        user.id,
        "statement-import",
        row.date,
        String(row.amountMinor),
        row.isIncome ? "in" : "out",
        row.description.toLowerCase(),
      ),
      tagIds: [],
      isIncome: row.isIncome,
    });
    if (result.created) created += 1;
    else skipped += 1;
  }
  return { created, skipped };
}
