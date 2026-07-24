import "server-only";
import { addDays, parseISO } from "date-fns";
import { and, eq, isNull, lte } from "drizzle-orm";
import { formatISODate } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { db } from "@/server/db";
import { recurringRules, users, type RecurringRule } from "@/server/db/schema";
import { forbidden, notFound } from "@/server/errors";
import { logger } from "@/server/logger";
import type { ActionUser } from "@/server/action-core";
import { notifyBudgetThresholds } from "@/features/budgets/notifications";
import { createExpense, createPersonalExpense } from "@/features/expenses/service";
import type { CreateExpenseInput, CreatePersonalExpenseInput } from "@/features/expenses/schemas";
import { advanceDate, anchorDayOf, type Frequency } from "./recurrence";
import type { CreateRecurringRuleInput, RecurringTemplate } from "./schemas";

/** Stored template shape: the create payload plus the monthly anchor day. */
type StoredTemplate = RecurringTemplate & { anchorDay: number };

function occurrenceKey(ruleId: string, date: string): string {
  return `recur:${ruleId}:${date}`;
}

/** Materialize one occurrence of a rule into a real expense (idempotent). */
async function materializeOccurrence(
  user: ActionUser,
  rule: { id: string; template: StoredTemplate },
  date: string,
): Promise<{ expenseId: string; userIds: string[] }> {
  const template = rule.template;
  const idempotencyKey = occurrenceKey(rule.id, date);

  if (template.kind === "personal") {
    const input: CreatePersonalExpenseInput = {
      description: template.description,
      amountMinor: template.amountMinor,
      categoryId: template.categoryId,
      expenseDate: date,
      idempotencyKey,
      tagIds: template.tagIds,
    };
    const { expenseId } = await createPersonalExpense(user, input, { recurringRuleId: rule.id });
    return { expenseId, userIds: [user.id] };
  }

  const input: CreateExpenseInput = {
    groupId: template.groupId,
    description: template.description,
    amountMinor: template.amountMinor,
    categoryId: template.categoryId,
    expenseDate: date,
    splitType: template.splitType,
    participants: template.participants,
    payers: template.payers,
    idempotencyKey,
    tagIds: template.tagIds,
  };
  const { expenseId, participantUserIds } = await createExpense(user, input, {
    recurringRuleId: rule.id,
  });
  return { expenseId, userIds: participantUserIds };
}

/**
 * Create a recurring rule and immediately materialize its first occurrence
 * (on `startsOn`), then advance the cursor to the next date. If the first
 * expense fails validation the rule is rolled back so nothing dangles.
 */
export async function createRecurringRule(
  user: ActionUser,
  input: CreateRecurringRuleInput,
): Promise<{ ruleId: string; expenseId: string }> {
  const ruleId = newId();
  const anchorDay = anchorDayOf(input.startsOn);
  const template: StoredTemplate = { ...input.template, anchorDay };
  const groupId = input.template.kind === "group" ? input.template.groupId : null;

  await db.insert(recurringRules).values({
    id: ruleId,
    userId: user.id,
    groupId,
    template,
    frequency: input.frequency,
    interval: input.interval,
    nextRunOn: input.startsOn,
    endsOn: input.endsOn ?? null,
  });

  try {
    const { expenseId, userIds } = await materializeOccurrence(
      user,
      { id: ruleId, template },
      input.startsOn,
    );
    const next = advanceDate(input.startsOn, input.frequency, input.interval, anchorDay);
    await db.update(recurringRules).set({ nextRunOn: next }).where(eq(recurringRules.id, ruleId));
    await notifyBudgetThresholds(userIds);
    return { ruleId, expenseId };
  } catch (error) {
    await db.delete(recurringRules).where(eq(recurringRules.id, ruleId));
    throw error;
  }
}

async function assertOwnRule(userId: string, ruleId: string): Promise<RecurringRule> {
  const rule = await db.query.recurringRules.findFirst({ where: eq(recurringRules.id, ruleId) });
  if (!rule) throw notFound("Recurring rule");
  if (rule.userId !== userId) throw forbidden("That isn't your recurring rule.");
  return rule;
}

export async function pauseRule(user: ActionUser, ruleId: string): Promise<void> {
  await assertOwnRule(user.id, ruleId);
  await db
    .update(recurringRules)
    .set({ pausedAt: new Date() })
    .where(eq(recurringRules.id, ruleId));
}

export async function resumeRule(user: ActionUser, ruleId: string): Promise<void> {
  await assertOwnRule(user.id, ruleId);
  await db.update(recurringRules).set({ pausedAt: null }).where(eq(recurringRules.id, ruleId));
}

/** End a rule now — it keeps its history but never runs again. */
export async function endRule(user: ActionUser, ruleId: string): Promise<void> {
  const rule = await assertOwnRule(user.id, ruleId);
  // Set endsOn to the day before the next run so it can never fire again.
  const endsOn = formatISODate(addDays(parseISO(rule.nextRunOn), -1));
  await db.update(recurringRules).set({ endsOn }).where(eq(recurringRules.id, ruleId));
}

export async function deleteRule(user: ActionUser, ruleId: string): Promise<void> {
  await assertOwnRule(user.id, ruleId);
  await db.delete(recurringRules).where(eq(recurringRules.id, ruleId));
}

async function actionUserFor(userId: string): Promise<ActionUser | null> {
  const row = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, image: row.image ?? null };
}

/**
 * Cron core: create exactly one expense for each rule due on or before `today`,
 * then advance its cursor by one interval. Idempotent — the occurrence key
 * blocks duplicates if a run is retried, and re-running after a successful run
 * finds nothing due. A rule whose materialization fails is paused, not retried
 * forever.
 */
export async function materializeDueRules(
  today: string,
): Promise<{ processed: number; created: number; paused: number }> {
  const due = await db.query.recurringRules.findMany({
    where: and(isNull(recurringRules.pausedAt), lte(recurringRules.nextRunOn, today)),
  });

  let created = 0;
  let paused = 0;
  for (const rule of due) {
    if (rule.endsOn && rule.nextRunOn > rule.endsOn) continue; // ended
    const occurrence = rule.nextRunOn;
    const user = await actionUserFor(rule.userId);
    if (!user) continue;

    const template = rule.template as StoredTemplate;
    const anchorDay = template.anchorDay ?? anchorDayOf(occurrence);
    try {
      const { userIds } = await materializeOccurrence(user, { id: rule.id, template }, occurrence);
      const next = advanceDate(occurrence, rule.frequency as Frequency, rule.interval, anchorDay);
      await db
        .update(recurringRules)
        .set({ nextRunOn: next })
        .where(eq(recurringRules.id, rule.id));
      created += 1;
      await notifyBudgetThresholds(userIds);
    } catch (error) {
      logger.error({ err: error, ruleId: rule.id }, "recurring materialize failed; pausing rule");
      await db
        .update(recurringRules)
        .set({ pausedAt: new Date() })
        .where(eq(recurringRules.id, rule.id));
      paused += 1;
    }
  }

  return { processed: due.length, created, paused };
}
