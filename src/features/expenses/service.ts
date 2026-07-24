import "server-only";
import { eq, isNull } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { computeSplits } from "@/lib/split";
import { db } from "@/server/db";
import {
  activityLogs,
  categories,
  expensePayers,
  expenses,
  expenseSplits,
  groupMembers,
  groups,
} from "@/server/db/schema";
import { notFound, validationError } from "@/server/errors";
import type { ActionUser } from "@/server/action-core";
import { assertMember } from "@/features/groups/service";
import type { CreateExpenseInput } from "./schemas";

/**
 * Create a group expense with an equal split. Runs entirely in one
 * transaction: expense + payer + exact splits + activity. Idempotent on the
 * client-generated key — retries and double-taps return the original row.
 */
export async function createExpense(
  user: ActionUser,
  input: CreateExpenseInput,
): Promise<{ expenseId: string }> {
  return db.transaction(async (tx) => {
    await assertMember(tx, user.id, input.groupId);

    const group = await tx.query.groups.findFirst({
      where: eq(groups.id, input.groupId),
      with: { members: { where: isNull(groupMembers.leftAt) } },
    });
    if (!group || group.archivedAt) throw notFound("Group");

    const category = await tx.query.categories.findFirst({
      where: eq(categories.id, input.categoryId),
    });
    if (!category) throw notFound("Category");

    const memberById = new Map(group.members.map((member) => [member.id, member]));
    const payer = memberById.get(input.paidByMemberId);
    if (!payer) {
      throw validationError("The payer isn't a member of this group.", {
        paidByMemberId: ["Pick someone from the group."],
      });
    }
    for (const participantId of input.participantMemberIds) {
      if (!memberById.has(participantId)) {
        throw validationError("A participant isn't a member of this group.", {
          participantMemberIds: ["Everyone in the split must be in the group."],
        });
      }
    }

    // Idempotency: a retry with the same key returns the original expense.
    const expenseId = newId();
    const inserted = await tx
      .insert(expenses)
      .values({
        id: expenseId,
        groupId: input.groupId,
        description: input.description,
        amountMinor: input.amountMinor,
        currency: group.currency,
        categoryId: input.categoryId,
        splitType: "equal",
        expenseDate: input.expenseDate,
        createdBy: user.id,
        idempotencyKey: input.idempotencyKey,
      })
      .onConflictDoNothing({ target: expenses.idempotencyKey })
      .returning({ id: expenses.id });

    if (inserted.length === 0) {
      const existing = await tx.query.expenses.findFirst({
        where: eq(expenses.idempotencyKey, input.idempotencyKey),
        columns: { id: true },
      });
      if (!existing) throw notFound("Expense");
      return { expenseId: existing.id };
    }

    const shares = computeSplits({
      amountMinor: input.amountMinor,
      type: "equal",
      participants: input.participantMemberIds.map((memberId) => ({ memberId })),
    });

    await tx.insert(expensePayers).values({
      id: newId(),
      expenseId,
      memberId: payer.id,
      userId: payer.userId,
      amountMinor: input.amountMinor,
    });
    await tx.insert(expenseSplits).values(
      shares.map((share) => ({
        id: newId(),
        expenseId,
        memberId: share.memberId,
        userId: memberById.get(share.memberId)?.userId ?? null,
        amountMinor: share.amountMinor,
        weight: share.weight,
      })),
    );
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: input.groupId,
      actorUserId: user.id,
      verb: "expense_added",
      objectType: "expense",
      objectId: expenseId,
      payload: {
        description: input.description,
        amountMinor: input.amountMinor,
        groupName: group.name,
        payerName: payer.displayName,
      },
    });

    return { expenseId };
  });
}
