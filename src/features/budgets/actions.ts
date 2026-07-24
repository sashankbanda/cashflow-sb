"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/action";
import { deleteBudgetSchema, setBudgetSchema } from "./schemas";
import { deleteBudget, setBudget } from "./service";

const revalidateBudgetSurfaces = () => {
  revalidatePath("/budgets");
  revalidatePath("/home");
};

export const setBudgetAction = authedAction({
  name: "budgets.set",
  schema: setBudgetSchema,
  handler: async ({ input, ctx }) => {
    const result = await setBudget(ctx.user, input);
    revalidateBudgetSurfaces();
    return result;
  },
});

export const deleteBudgetAction = authedAction({
  name: "budgets.delete",
  schema: deleteBudgetSchema,
  handler: async ({ input, ctx }) => {
    await deleteBudget(ctx.user, input.budgetId);
    revalidateBudgetSurfaces();
    return { budgetId: input.budgetId };
  },
});
