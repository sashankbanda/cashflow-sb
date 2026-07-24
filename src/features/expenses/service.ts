import "server-only";
import { eq, isNull } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { computeSplits, SplitError, validatePayers, type SplitShare } from "@/lib/split";
import { db, type Transaction } from "@/server/db";
import {
  activityLogs,
  categories,
  expensePayers,
  expenses,
  expenseSplits,
  groupMembers,
  groups,
  type GroupMember,
} from "@/server/db/schema";
import { forbidden, notFound, validationError } from "@/server/errors";
import type { ActionUser } from "@/server/action-core";
import { assertMember } from "@/features/groups/service";
import type { CreateExpenseInput, CreatePersonalExpenseInput, UpdateExpenseInput } from "./schemas";

interface PreparedExpense {
  group: { id: string; name: string; currency: string };
  memberById: Map<string, GroupMember>;
  shares: SplitShare[];
  payerNames: string[];
}

/** Shared validation for create/update: membership, engine math, payers. */
async function prepare(
  tx: Transaction,
  user: ActionUser,
  input: CreateExpenseInput | UpdateExpenseInput,
): Promise<PreparedExpense> {
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
  for (const payer of input.payers) {
    if (!memberById.has(payer.memberId)) {
      throw validationError("A payer isn't a member of this group.", {
        payers: ["Everyone paying must be in the group."],
      });
    }
  }
  for (const participant of input.participants) {
    if (!memberById.has(participant.memberId)) {
      throw validationError("A participant isn't a member of this group.", {
        participants: ["Everyone in the split must be in the group."],
      });
    }
  }

  try {
    validatePayers(input.amountMinor, input.payers);
    const shares = computeSplits({
      amountMinor: input.amountMinor,
      type: input.splitType,
      participants: input.participants,
    });
    return {
      group: { id: group.id, name: group.name, currency: group.currency },
      memberById,
      shares,
      payerNames: input.payers.map(
        (payer) => memberById.get(payer.memberId)?.displayName ?? "Someone",
      ),
    };
  } catch (error) {
    if (error instanceof SplitError) {
      throw validationError(error.message, { participants: [error.message] });
    }
    throw error;
  }
}

async function insertMoneyRows(
  tx: Transaction,
  expenseId: string,
  input: CreateExpenseInput | UpdateExpenseInput,
  prepared: PreparedExpense,
): Promise<void> {
  await tx.insert(expensePayers).values(
    input.payers.map((payer) => ({
      id: newId(),
      expenseId,
      memberId: payer.memberId,
      userId: prepared.memberById.get(payer.memberId)?.userId ?? null,
      amountMinor: payer.amountMinor,
    })),
  );
  await tx.insert(expenseSplits).values(
    prepared.shares.map((share) => ({
      id: newId(),
      expenseId,
      memberId: share.memberId,
      userId: prepared.memberById.get(share.memberId)?.userId ?? null,
      amountMinor: share.amountMinor,
      weight: share.weight,
    })),
  );
}

/**
 * Create a group expense (any split type, one or many payers) in a single
 * transaction. Idempotent on the client key — retries return the original.
 */
export async function createExpense(
  user: ActionUser,
  input: CreateExpenseInput,
): Promise<{ expenseId: string }> {
  return db.transaction(async (tx) => {
    const prepared = await prepare(tx, user, input);

    const expenseId = newId();
    const inserted = await tx
      .insert(expenses)
      .values({
        id: expenseId,
        groupId: input.groupId,
        description: input.description,
        amountMinor: input.amountMinor,
        currency: prepared.group.currency,
        categoryId: input.categoryId,
        splitType: input.splitType,
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

    await insertMoneyRows(tx, expenseId, input, prepared);
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
        groupName: prepared.group.name,
        payerName: prepared.payerNames[0] ?? "Someone",
      },
    });

    return { expenseId };
  });
}

/** Only the creator, a payer, or the group owner may modify an expense. */
async function assertCanModify(
  tx: Transaction,
  user: ActionUser,
  expenseId: string,
  groupId: string,
): Promise<void> {
  const expense = await tx.query.expenses.findFirst({
    where: eq(expenses.id, expenseId),
    with: { payers: { columns: { userId: true } } },
  });
  if (!expense || expense.deletedAt || expense.groupId !== groupId) throw notFound("Expense");

  const member = await assertMember(tx, user.id, groupId);
  const isCreator = expense.createdBy === user.id;
  const isPayer = expense.payers.some((payer) => payer.userId === user.id);
  const isOwner = member.role === "owner";
  if (!isCreator && !isPayer && !isOwner) {
    throw forbidden("Only the person who added or paid this expense can change it.");
  }
}

/**
 * Create a personal expense (no group): the owner is the sole payer and sole
 * participant, so it flows straight into their personal ledger. Idempotent.
 */
export async function createPersonalExpense(
  user: ActionUser,
  input: CreatePersonalExpenseInput,
): Promise<{ expenseId: string }> {
  return db.transaction(async (tx) => {
    const category = await tx.query.categories.findFirst({
      where: eq(categories.id, input.categoryId),
    });
    if (!category) throw notFound("Category");

    const expenseId = newId();
    const inserted = await tx
      .insert(expenses)
      .values({
        id: expenseId,
        groupId: null,
        description: input.description,
        amountMinor: input.amountMinor,
        currency: "INR",
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

    await tx.insert(expensePayers).values({
      id: newId(),
      expenseId,
      memberId: null,
      userId: user.id,
      amountMinor: input.amountMinor,
    });
    await tx.insert(expenseSplits).values({
      id: newId(),
      expenseId,
      memberId: null,
      userId: user.id,
      amountMinor: input.amountMinor,
      weight: null,
    });

    return { expenseId };
  });
}

/** Soft-delete a personal expense (owner only). */
export async function deletePersonalExpense(user: ActionUser, expenseId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const expense = await tx.query.expenses.findFirst({ where: eq(expenses.id, expenseId) });
    if (!expense || expense.deletedAt || expense.groupId !== null) throw notFound("Expense");
    if (expense.createdBy !== user.id) throw forbidden("That isn't your expense.");
    await tx.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, expenseId));
  });
}

/** Soft-delete an expense; balances recompute exactly without it. */
export async function deleteExpense(
  user: ActionUser,
  expenseId: string,
  groupId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    await assertCanModify(tx, user, expenseId, groupId);
    const expense = await tx.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
      columns: { description: true, amountMinor: true },
    });
    if (!expense) throw notFound("Expense");
    await tx.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, expenseId));
    await tx.insert(activityLogs).values({
      id: newId(),
      groupId,
      actorUserId: user.id,
      verb: "expense_deleted",
      objectType: "expense",
      objectId: expenseId,
      payload: { description: expense.description, amountMinor: expense.amountMinor },
    });
  });
}

/**
 * Rewrite an expense: replaces payers/splits atomically with re-validated
 * engine output; original input weights are preserved for the next edit.
 */
export async function updateExpense(
  user: ActionUser,
  input: UpdateExpenseInput,
): Promise<{ expenseId: string }> {
  return db.transaction(async (tx) => {
    await assertCanModify(tx, user, input.expenseId, input.groupId);
    const prepared = await prepare(tx, user, input);

    await tx
      .update(expenses)
      .set({
        description: input.description,
        amountMinor: input.amountMinor,
        categoryId: input.categoryId,
        splitType: input.splitType,
        expenseDate: input.expenseDate,
      })
      .where(eq(expenses.id, input.expenseId));
    await tx.delete(expensePayers).where(eq(expensePayers.expenseId, input.expenseId));
    await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, input.expenseId));
    await insertMoneyRows(tx, input.expenseId, input, prepared);

    await tx.insert(activityLogs).values({
      id: newId(),
      groupId: input.groupId,
      actorUserId: user.id,
      verb: "expense_updated",
      objectType: "expense",
      objectId: input.expenseId,
      payload: {
        description: input.description,
        amountMinor: input.amountMinor,
        groupName: prepared.group.name,
      },
    });

    return { expenseId: input.expenseId };
  });
}
