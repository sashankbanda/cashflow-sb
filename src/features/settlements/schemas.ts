import { z } from "zod";
import { MAX_AMOUNT_MINOR } from "@/lib/money";

export const recordSettlementSchema = z.object({
  groupId: z.string().min(1),
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amountMinor: z
    .number()
    .int("Amounts are whole paise.")
    .positive("Enter an amount.")
    .max(MAX_AMOUNT_MINOR, "That's beyond the supported amount."),
  method: z.enum(["cash", "upi", "bank", "other"]),
  note: z.string().trim().max(140, "Keep the note short.").optional(),
});

export type RecordSettlementInput = z.infer<typeof recordSettlementSchema>;
