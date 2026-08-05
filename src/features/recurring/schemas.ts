import { z } from "zod";
import { MAX_AMOUNT_MINOR } from "@/lib/money";

export const expenseDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a calendar date.");

const amountMinorSchema = z
  .number()
  .int("Amounts are whole paise.")
  .positive("Enter an amount.")
  .max(MAX_AMOUNT_MINOR, "That's beyond the supported amount.");

const descriptionSchema = z
  .string()
  .trim()
  .min(1, "What was this for?")
  .max(80, "Keep it under 80 characters.");

const tagIdsSchema = z.array(z.string().min(1)).max(8).optional();

const personalTemplateSchema = z.object({
  kind: z.literal("personal"),
  description: descriptionSchema,
  amountMinor: amountMinorSchema,
  categoryId: z.string().min(1, "Pick a category."),
  tagIds: tagIdsSchema,
  /** True → each occurrence records income (e.g. monthly salary). */
  isIncome: z.boolean().optional().default(false),
});

const groupTemplateSchema = z.object({
  kind: z.literal("group"),
  groupId: z.string().min(1),
  description: descriptionSchema,
  amountMinor: amountMinorSchema,
  categoryId: z.string().min(1, "Pick a category."),
  splitType: z.enum(["equal", "exact", "percent", "shares"]),
  participants: z
    .array(
      z.object({
        memberId: z.string().min(1),
        weight: z.number().finite().nonnegative().optional(),
      }),
    )
    .min(1),
  payers: z
    .array(z.object({ memberId: z.string().min(1), amountMinor: z.number().int().positive() }))
    .min(1),
  tagIds: tagIdsSchema,
});

export const recurringTemplateSchema = z.discriminatedUnion("kind", [
  personalTemplateSchema,
  groupTemplateSchema,
]);

export const frequencySchema = z.enum(["daily", "weekly", "monthly", "yearly"]);

export const createRecurringRuleSchema = z.object({
  template: recurringTemplateSchema,
  frequency: frequencySchema,
  interval: z.number().int().min(1).max(60).default(1),
  startsOn: expenseDateSchema,
  endsOn: expenseDateSchema.nullable().optional(),
});

export const updateRecurringRuleSchema = z.object({
  ruleId: z.string().min(1),
  action: z.enum(["pause", "resume", "end"]),
});

export const deleteRecurringRuleSchema = z.object({ ruleId: z.string().min(1) });

export type RecurringTemplate = z.infer<typeof recurringTemplateSchema>;
export type CreateRecurringRuleInput = z.infer<typeof createRecurringRuleSchema>;
export type UpdateRecurringRuleInput = z.infer<typeof updateRecurringRuleSchema>;
export type DeleteRecurringRuleInput = z.infer<typeof deleteRecurringRuleSchema>;
