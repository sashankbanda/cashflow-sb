"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { authedAction } from "@/server/action";
import { sendPushToUsers } from "@/server/push";
import { groupBalancesTag } from "@/features/balances/queries";
import { notifyBudgetThresholds } from "@/features/budgets/notifications";
import {
  createExpenseSchema,
  createPersonalExpenseSchema,
  createSplitExpenseSchema,
  updateExpenseSchema,
  updatePersonalExpenseSchema,
} from "./schemas";
import {
  createExpense,
  createPersonalExpense,
  createSplitExpense,
  deleteExpense,
  deletePersonalExpense,
  findDuplicateEntry,
  restorePersonalExpense,
  splitPersonalExpense,
  updateExpense,
  updatePersonalExpense,
} from "./service";

/**
 * Soft pre-save check: is there already a live entry with this amount today?
 * The add flows warn once ("Save anyway") — never block; failures are treated
 * as "no duplicate" so the guard can't stop an offline save.
 */
export const checkDuplicateAction = authedAction({
  name: "expenses.checkDuplicate",
  schema: z.object({
    amountMinor: z.number().int().positive(),
    expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isIncome: z.boolean().optional().default(false),
  }),
  handler: async ({ input, ctx }) => ({
    duplicate: await findDuplicateEntry(ctx.user.id, input),
  }),
});

export const createExpenseAction = authedAction({
  name: "expenses.create",
  schema: createExpenseSchema,
  handler: async ({ input, ctx }) => {
    const { expenseId, participantUserIds } = await createExpense(ctx.user, input);
    revalidateTag(groupBalancesTag(input.groupId), "max");
    revalidatePath(`/groups/${input.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/home");
    revalidatePath("/budgets");
    await notifyBudgetThresholds(participantUserIds);
    await sendPushToUsers(
      participantUserIds.filter((id) => id !== ctx.user.id),
      "expense_added",
      {
        title: "New expense",
        body: `${ctx.user.name} added ${input.description}`,
        url: `/groups/${input.groupId}`,
        tag: `expense-${expenseId}`,
      },
    );
    return { expenseId };
  },
});

export const deleteExpenseAction = authedAction({
  name: "expenses.delete",
  schema: z.object({ expenseId: z.string().min(1), groupId: z.string().min(1) }),
  handler: async ({ input, ctx }) => {
    await deleteExpense(ctx.user, input.expenseId, input.groupId);
    revalidateTag(groupBalancesTag(input.groupId), "max");
    revalidatePath(`/groups/${input.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/home");
    revalidatePath("/budgets");
    return { deleted: true };
  },
});

export const createPersonalExpenseAction = authedAction({
  name: "expenses.createPersonal",
  schema: createPersonalExpenseSchema,
  handler: async ({ input, ctx }) => {
    const { expenseId } = await createPersonalExpense(ctx.user, input);
    revalidatePath("/expenses");
    revalidatePath("/home");
    revalidatePath("/insights");
    revalidatePath("/budgets");
    await notifyBudgetThresholds([ctx.user.id]);
    return { expenseId };
  },
});

export const restorePersonalExpenseAction = authedAction({
  name: "expenses.restorePersonal",
  schema: z.object({ expenseId: z.string().min(1) }),
  handler: async ({ input, ctx }) => {
    await restorePersonalExpense(ctx.user, input.expenseId);
    revalidatePath("/expenses");
    revalidatePath("/home");
    revalidatePath("/insights");
    revalidatePath("/budgets");
    return { restored: true };
  },
});

export const createSplitExpenseAction = authedAction({
  name: "expenses.createSplit",
  schema: createSplitExpenseSchema,
  handler: async ({ input, ctx }) => {
    const { groupId, expenseId } = await createSplitExpense(ctx.user, input);
    revalidateTag(groupBalancesTag(groupId), "max");
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    revalidatePath("/expenses");
    revalidatePath("/home");
    revalidatePath("/friends");
    revalidatePath("/budgets");
    return { groupId, expenseId };
  },
});

export const splitPersonalExpenseAction = authedAction({
  name: "expenses.splitPersonal",
  schema: z.object({
    expenseId: z.string().min(1),
    names: z.array(z.string().trim().min(1).max(50)).min(1).max(10),
    exactShares: z.array(z.number().int().nonnegative()).max(11).optional(),
  }),
  handler: async ({ input, ctx }) => {
    const { groupId, expenseId } = await splitPersonalExpense(ctx.user, input);
    revalidateTag(groupBalancesTag(groupId), "max");
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    revalidatePath("/expenses");
    revalidatePath("/home");
    revalidatePath("/friends");
    revalidatePath("/budgets");
    return { groupId, expenseId };
  },
});

export const updatePersonalExpenseAction = authedAction({
  name: "expenses.updatePersonal",
  schema: updatePersonalExpenseSchema,
  handler: async ({ input, ctx }) => {
    const { expenseId } = await updatePersonalExpense(ctx.user, input);
    revalidatePath("/expenses");
    revalidatePath("/home");
    revalidatePath("/insights");
    revalidatePath("/budgets");
    await notifyBudgetThresholds([ctx.user.id]);
    return { expenseId };
  },
});

export const deletePersonalExpenseAction = authedAction({
  name: "expenses.deletePersonal",
  schema: z.object({ expenseId: z.string().min(1) }),
  handler: async ({ input, ctx }) => {
    await deletePersonalExpense(ctx.user, input.expenseId);
    revalidatePath("/expenses");
    revalidatePath("/home");
    revalidatePath("/insights");
    revalidatePath("/budgets");
    return { deleted: true };
  },
});

export const updateExpenseAction = authedAction({
  name: "expenses.update",
  schema: updateExpenseSchema,
  handler: async ({ input, ctx }) => {
    const { expenseId } = await updateExpense(ctx.user, input);
    revalidateTag(groupBalancesTag(input.groupId), "max");
    revalidatePath(`/groups/${input.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/home");
    revalidatePath("/budgets");
    return { expenseId };
  },
});
