"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/action";
import { createExpenseSchema, updateExpenseSchema } from "./schemas";
import { createExpense, updateExpense } from "./service";

export const createExpenseAction = authedAction({
  name: "expenses.create",
  schema: createExpenseSchema,
  handler: async ({ input, ctx }) => {
    const { expenseId } = await createExpense(ctx.user, input);
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
    revalidatePath(`/groups/${input.groupId}`);
    revalidatePath("/groups");
    revalidatePath("/home");
    return { expenseId };
  },
});
