"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAction } from "@/server/action";
import {
  remindSettlementSchema,
  subscribePushSchema,
  unsubscribePushSchema,
  updatePrefsSchema,
} from "./push-schemas";
import {
  remindSettlement,
  subscribePush,
  unsubscribePush,
  updateNotificationPrefs,
} from "./push-service";
import { getNotifications } from "./queries";
import { markAllNotificationsRead, markNotificationRead } from "./service";

export const listNotificationsAction = authedAction({
  name: "notifications.list",
  schema: z.object({}),
  handler: async ({ ctx }) => getNotifications(ctx.user.id),
});

export const markNotificationReadAction = authedAction({
  name: "notifications.markRead",
  schema: z.object({ id: z.string().min(1) }),
  handler: async ({ input, ctx }) => {
    await markNotificationRead(ctx.user, input.id);
    revalidatePath("/home");
    return { id: input.id };
  },
});

export const markAllNotificationsReadAction = authedAction({
  name: "notifications.markAllRead",
  schema: z.object({}),
  handler: async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user);
    revalidatePath("/home");
    return { ok: true };
  },
});

export const subscribePushAction = authedAction({
  name: "push.subscribe",
  schema: subscribePushSchema,
  handler: async ({ input, ctx }) => {
    await subscribePush(ctx.user, input);
    return { ok: true };
  },
});

export const unsubscribePushAction = authedAction({
  name: "push.unsubscribe",
  schema: unsubscribePushSchema,
  handler: async ({ input, ctx }) => {
    await unsubscribePush(ctx.user, input.endpoint);
    return { ok: true };
  },
});

export const updateNotificationPrefsAction = authedAction({
  name: "push.updatePrefs",
  schema: updatePrefsSchema,
  handler: async ({ input, ctx }) => {
    await updateNotificationPrefs(ctx.user, input.prefs);
    revalidatePath("/settings/notifications");
    return { ok: true };
  },
});

export const remindSettlementAction = authedAction({
  name: "settlements.remind",
  schema: remindSettlementSchema,
  handler: async ({ input, ctx }) => {
    await remindSettlement(ctx.user, input.groupId, input.toUserId);
    return { ok: true };
  },
});
