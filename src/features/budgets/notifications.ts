import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";
import { logger } from "@/server/logger";
import { getBudgetOverview, type BudgetLine } from "./queries";

interface ThresholdPayload {
  budgetId: string | null;
  monthKey: string;
  level: string;
}

function dedupeKey(payload: ThresholdPayload): string {
  return `${payload.budgetId}:${payload.monthKey}:${payload.level}`;
}

/**
 * Emit a `budget_threshold` notification the first time a budget crosses into
 * warn (>80%) or over (>100%) within a month. Idempotent: one notification per
 * (budget, month, level), so re-running after every expense never duplicates.
 * Feeds the notification center that lands in P28.
 */
export async function syncBudgetThresholds(userId: string): Promise<void> {
  const overview = await getBudgetOverview(userId);
  const lines: BudgetLine[] = [
    ...(overview.overall ? [overview.overall] : []),
    ...overview.categories,
  ];
  const flagged = lines.filter((line) => line.pace.level !== "ok" && line.budgetId !== null);
  if (flagged.length === 0) return;

  const recent = await db.query.notifications.findMany({
    where: and(eq(notifications.userId, userId), eq(notifications.type, "budget_threshold")),
    orderBy: [desc(notifications.createdAt)],
    limit: 100,
  });
  const seen = new Set(recent.map((row) => dedupeKey(row.payload as unknown as ThresholdPayload)));

  const rows = flagged
    .map((line) => ({
      id: newId(),
      userId,
      type: "budget_threshold" as const,
      payload: {
        budgetId: line.budgetId,
        categoryId: line.category?.id ?? null,
        categoryName: line.category?.name ?? null,
        monthKey: overview.monthKey,
        level: line.pace.level,
        spentMinor: line.spentMinor,
        budgetMinor: line.budgetMinor,
      },
    }))
    .filter((row) => !seen.has(dedupeKey(row.payload as unknown as ThresholdPayload)));

  if (rows.length > 0) await db.insert(notifications).values(rows);
}

/**
 * Best-effort threshold sync for the users a fresh expense touched. Never
 * throws — a failed notification must not fail the expense that triggered it.
 */
export async function notifyBudgetThresholds(userIds: ReadonlyArray<string>): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  await Promise.all(
    unique.map(async (userId) => {
      try {
        await syncBudgetThresholds(userId);
      } catch (error) {
        logger.error({ err: error, userId }, "budget threshold sync failed");
      }
    }),
  );
}
