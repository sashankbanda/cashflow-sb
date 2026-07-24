"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { env } from "@/env";
import { authedAction } from "@/server/action";
import { groupBalancesTag } from "@/features/balances/queries";
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
    revalidateTag(groupBalancesTag(input.groupId), "max");
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
    revalidateTag(groupBalancesTag(groupId), "max");
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
    revalidateTag(groupBalancesTag(groupId), "max");
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
    revalidateTag(groupBalancesTag(input.groupId), "max");
    revalidatePath("/groups");
    return { left: true };
  },
});
