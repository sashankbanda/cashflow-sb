"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAction } from "@/server/action";
import { clearCaptureToken, setCaptureToken } from "./service";

export const generateCaptureTokenAction = authedAction({
  name: "capture.generateToken",
  schema: z.object({}),
  handler: async ({ ctx }) => {
    const { token } = await setCaptureToken(ctx.user.id);
    revalidatePath("/settings/capture");
    return { token };
  },
});

export const revokeCaptureTokenAction = authedAction({
  name: "capture.revokeToken",
  schema: z.object({}),
  handler: async ({ ctx }) => {
    await clearCaptureToken(ctx.user.id);
    revalidatePath("/settings/capture");
    return { ok: true };
  },
});
