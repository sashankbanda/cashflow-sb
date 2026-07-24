"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { authedAction } from "@/server/action";
import { groupBalancesTag } from "@/features/balances/queries";
import { createExpenseSchema, updateExpenseSchema } from "./schemas";
import { createExpense, deleteExpense, updateExpense } from "./service";

export const createExpenseAction = authedAction({
  name: "expenses.create",
  schema: createExpenseSchema,
  handler: async ({ input, ctx }) => {
    const { expenseId } = await createExpense(ctx.user, input);
    revalidateTag(groupBalancesTag(input.groupId), "max");
    revalidatePath(`/groups/${input.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/home");
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
    return { expenseId };
  },
});
