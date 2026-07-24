"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/action";
import { createExpenseSchema } from "./schemas";
import { createExpense } from "./service";

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
