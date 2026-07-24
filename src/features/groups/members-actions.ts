"use server";

import { revalidatePath } from "next/cache";
import { env } from "@/env";
import { authedAction } from "@/server/action";
import {
  addGhostSchema,
  claimGhostSchema,
  createInviteSchema,
  joinInviteSchema,
  leaveGroupSchema,
} from "./schemas";
import {
  addGhostMember,
  claimGhost,
  createInvite,
  joinViaInvite,
  leaveGroup,
} from "./members-service";

export const addGhostAction = authedAction({
  name: "members.addGhost",
  schema: addGhostSchema,
  handler: async ({ input, ctx }) => {
    const { memberId } = await addGhostMember(ctx.user, input);
    revalidatePath(`/groups/${input.groupId}`);
    return { memberId };
  },
});

export const createInviteAction = authedAction({
  name: "members.createInvite",
  schema: createInviteSchema,
  handler: async ({ input, ctx }) => {
    const { token } = await createInvite(ctx.user, input);
    return { url: `${env.BETTER_AUTH_URL}/join/${token}` };
  },
});

export const joinInviteAction = authedAction({
  name: "members.join",
  schema: joinInviteSchema,
  handler: async ({ input, ctx }) => {
    const { groupId } = await joinViaInvite(ctx.user, input.token);
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    return { groupId };
  },
});

export const claimGhostAction = authedAction({
  name: "members.claim",
  schema: claimGhostSchema,
  handler: async ({ input, ctx }) => {
    const { groupId } = await claimGhost(ctx.user, input.token, input.memberId);
    revalidatePath("/groups");
    revalidatePath(`/groups/${groupId}`);
    return { groupId };
  },
});

export const leaveGroupAction = authedAction({
  name: "members.leave",
  schema: leaveGroupSchema,
  handler: async ({ input, ctx }) => {
    await leaveGroup(ctx.user, input.groupId);
    revalidatePath("/groups");
    return { left: true };
  },
});
