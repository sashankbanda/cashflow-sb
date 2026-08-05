"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { authedAction } from "@/server/action";

/** Save (or clear, with "") the user's UPI ID so friends can pay them directly. */
export const updateUpiIdAction = authedAction({
  name: "settings.updateUpiId",
  schema: z.object({
    upiId: z
      .string()
      .trim()
      .max(80)
      .refine((value) => value === "" || /^[\w.-]{2,64}@[a-z]{2,32}$/i.test(value), {
        message: "That doesn't look like a UPI ID (e.g. name@bank).",
      }),
  }),
  handler: async ({ input, ctx }) => {
    await db
      .update(users)
      .set({ upiId: input.upiId === "" ? null : input.upiId })
      .where(eq(users.id, ctx.user.id));
    revalidatePath("/profile");
    return { ok: true };
  },
});
