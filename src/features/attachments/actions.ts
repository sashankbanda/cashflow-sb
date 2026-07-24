"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authedAction } from "@/server/action";
import { isStorageConfigured } from "@/server/storage";
import { getExpenseAttachments } from "./queries";
import { deleteAttachment } from "./service";

export const listAttachmentsAction = authedAction({
  name: "attachments.list",
  schema: z.object({ expenseId: z.string().min(1) }),
  handler: async ({ input, ctx }) => ({
    configured: isStorageConfigured(),
    items: await getExpenseAttachments(ctx.user.id, input.expenseId),
  }),
});

export const deleteAttachmentAction = authedAction({
  name: "attachments.delete",
  schema: z.object({ id: z.string().min(1), groupId: z.string().min(1).optional() }),
  handler: async ({ input, ctx }) => {
    await deleteAttachment(ctx.user, input.id);
    if (input.groupId) revalidatePath(`/groups/${input.groupId}`);
    revalidatePath("/expenses");
    return { id: input.id };
  },
});
