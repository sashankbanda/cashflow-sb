"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { authedAction } from "@/server/action";
import { groupBalancesTag } from "@/features/balances/queries";
import { notifyBudgetThresholds } from "@/features/budgets/notifications";
import { createExpenseSchema, createPersonalExpenseSchema, updateExpenseSchema } from "./schemas";
import {
  createExpense,
  createPersonalExpense,
  deleteExpense,
  deletePersonalExpense,
  updateExpense,
} from "./service";

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
