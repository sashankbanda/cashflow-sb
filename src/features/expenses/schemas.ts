import { z } from "zod";
import { MAX_AMOUNT_MINOR } from "@/lib/money";

export const expenseDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a calendar date.");

const participantSchema = z.object({
  memberId: z.string().min(1),
  /** exact → paise · percent → % · shares → count. Absent for equal. */
  weight: z.number().finite().nonnegative().optional(),
});

const payerSchema = z.object({
  memberId: z.string().min(1),
  amountMinor: z.number().int().positive(),
});

const expenseCoreSchema = z.object({
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
  splitType: z.enum(["equal", "exact", "percent", "shares"]),
  participants: z.array(participantSchema).min(1, "Pick at least one person to split with."),
  payers: z.array(payerSchema).min(1, "Who paid?"),
});

const tagIdsSchema = z.array(z.string().min(1)).max(8).optional();

export const createExpenseSchema = expenseCoreSchema.extend({
  /** Client-generated; makes offline retries and double-taps idempotent. */
  idempotencyKey: z.string().uuid(),
  tagIds: tagIdsSchema,
});

export const updateExpenseSchema = expenseCoreSchema.extend({
  expenseId: z.string().min(1),
});

/** A personal expense: no group, no split — the owner pays and consumes 100%. */
export const createPersonalExpenseSchema = z.object({
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
  idempotencyKey: z.string().uuid(),
  tagIds: tagIdsSchema,
  /** True records money coming in (income) instead of a spend. */
  isIncome: z.boolean().optional().default(false),
});

/** Edit a personal entry: amount, description, category, date, direction. */
export const updatePersonalExpenseSchema = z.object({
  expenseId: z.string().min(1),
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
  isIncome: z.boolean().optional().default(false),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type CreatePersonalExpenseInput = z.infer<typeof createPersonalExpenseSchema>;
export type UpdatePersonalExpenseInput = z.infer<typeof updatePersonalExpenseSchema>;
