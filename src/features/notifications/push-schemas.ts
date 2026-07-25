import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "expense_added",
  "settlement_recorded",
  "settlement_reminder",
  "member_joined",
  "budget_threshold",
] as const;

export const subscribePushSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
  userAgent: z.string().max(400).optional(),
});

export const unsubscribePushSchema = z.object({ endpoint: z.string().url() });

export const updatePrefsSchema = z.object({
  // Partial map of notification type → enabled. Unknown keys are ignored server-side.
  prefs: z.record(z.string().max(40), z.boolean()),
});

export const remindSettlementSchema = z.object({
  groupId: z.string().min(1),
  toUserId: z.string().min(1),
});

export type SubscribePushInput = z.infer<typeof subscribePushSchema>;
export type UpdatePrefsInput = z.infer<typeof updatePrefsSchema>;
