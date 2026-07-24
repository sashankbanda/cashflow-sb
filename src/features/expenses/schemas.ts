import { z } from "zod";
import { MAX_AMOUNT_MINOR } from "@/lib/money";

export const expenseDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a calendar date.");

export const createExpenseSchema = z.object({
  groupId: z.string().min(1),
  description: z
    .string()
    .trim()
    .min(1, "What was this for?")
    .max(80, "Keep it under 80 characters."),
  amountMinor: z
    .number()
    .int("Amounts are whole paise.")
    .positive("Enter an amount.")
    .max(MAX_AMOUNT_MINOR, "That's beyond the supported amount."),
  categoryId: z.string().min(1, "Pick a category."),
  expenseDate: expenseDateSchema,
  paidByMemberId: z.string().min(1, "Who paid?"),
  participantMemberIds: z
    .array(z.string().min(1))
    .min(1, "Pick at least one person to split with."),
  /** Client-generated; makes offline retries and double-taps idempotent. */
  idempotencyKey: z.string().uuid(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
