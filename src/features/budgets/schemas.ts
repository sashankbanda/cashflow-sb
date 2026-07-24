import { z } from "zod";
import { MAX_AMOUNT_MINOR } from "@/lib/money";

/** Set (create or replace) a monthly budget. categoryId null = overall budget. */
export const setBudgetSchema = z.object({
  categoryId: z.string().min(1).nullable(),
  amountMinor: z
    .number()
    .int("Enter a whole paise amount.")
    .positive("Budget must be more than ₹0.")
    .max(MAX_AMOUNT_MINOR, "That budget is too large."),
});

export const deleteBudgetSchema = z.object({ budgetId: z.string().min(1) });

export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
export type DeleteBudgetInput = z.infer<typeof deleteBudgetSchema>;
