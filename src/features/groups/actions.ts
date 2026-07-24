"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/action";
import { archiveGroupSchema, createGroupSchema, updateGroupSchema } from "./schemas";
import { archiveGroup, createGroup, updateGroup } from "./service";

export const createGroupAction = authedAction({
  name: "groups.create",
  schema: createGroupSchema,
  handler: async ({ input, ctx }) => {
    const { groupId } = await createGroup(ctx.user, input);
    revalidatePath("/groups");
    return { groupId };
  },
});

export const updateGroupAction = authedAction({
  name: "groups.update",
  schema: updateGroupSchema,
  handler: async ({ input, ctx }) => {
    await updateGroup(ctx.user, input);
    revalidatePath("/groups");
    revalidatePath(`/groups/${input.groupId}`);
    return { groupId: input.groupId };
  },
});

export const archiveGroupAction = authedAction({
  name: "groups.archive",
  schema: archiveGroupSchema,
  handler: async ({ input, ctx }) => {
    await archiveGroup(ctx.user, input.groupId);
    revalidatePath("/groups");
    return { groupId: input.groupId };
  },
});
