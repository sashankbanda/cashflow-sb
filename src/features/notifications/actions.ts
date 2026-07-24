"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAction } from "@/server/action";
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
