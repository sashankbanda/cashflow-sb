"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { authedAction } from "@/server/action";
import { groupBalancesTag } from "@/features/balances/queries";
import { createExpenseSchema, updateExpenseSchema } from "./schemas";
import { createExpense, updateExpense } from "./service";

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
