import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { asPalette, type Palette } from "@/components/ui/palette";
import { db } from "@/server/db";
import { groupMembers } from "@/server/db/schema";
import { notFound } from "@/server/errors";
import { assertMember } from "./service";

export interface GroupMemberSummary {
  id: string;
  displayName: string;
  image: string | null;
  isGhost: boolean;
  role: "owner" | "member";
  /** Linked account, null for ghosts. Used to spot "you" in member lists. */
  userId: string | null;
}

export interface GroupSummary {
  id: string;
  name: string;
  emoji: string | null;
  gradient: Palette;
  memberCount: number;
  members: GroupMemberSummary[];
  archived: boolean;
}

export interface GroupDetail extends GroupSummary {
  myMemberId: string;
  myRole: "owner" | "member";
  currency: string;
}

function toMemberSummary(member: {
  id: string;
  displayName: string;
  userId: string | null;
  role: "owner" | "member";
  user: { image: string | null } | null;
}): GroupMemberSummary {
  return {
    id: member.id,
    displayName: member.displayName,
    image: member.user?.image ?? null,
    isGhost: member.userId === null,
    role: member.role,
    userId: member.userId,
  };
}

/** Active (non-archived) groups for the user, newest first. */
export async function getMyGroups(userId: string): Promise<GroupSummary[]> {
  const memberships = await db.query.groupMembers.findMany({
    where: and(eq(groupMembers.userId, userId), isNull(groupMembers.leftAt)),
    with: {
      group: {
        with: {
          members: {
            where: isNull(groupMembers.leftAt),
            with: { user: { columns: { image: true } } },
          },
        },
      },
    },
  });

  return memberships
    .filter((membership) => membership.group && !membership.group.archivedAt)
    .map((membership) => {
      const group = membership.group;
      return {
        id: group.id,
        name: group.name,
        emoji: group.emoji,
        gradient: asPalette(group.gradient),
        memberCount: group.members.length,
        members: group.members.map(toMemberSummary),
        archived: Boolean(group.archivedAt),
      };
    })
    .sort((a, b) => (a.id < b.id ? 1 : -1)); // UUIDv7: newest first
}

/** Full group view for a member; FORBIDDEN for anyone else. */
export async function getGroupDetail(userId: string, groupId: string): Promise<GroupDetail> {
  const myMember = await assertMember(db, userId, groupId);
  const group = await db.query.groups.findFirst({
    where: (table, { eq: whereEq }) => whereEq(table.id, groupId),
    with: {
      members: {
        where: isNull(groupMembers.leftAt),
        with: { user: { columns: { image: true } } },
      },
    },
  });
  if (!group) throw notFound("Group");

  return {
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    gradient: asPalette(group.gradient),
    memberCount: group.members.length,
    members: group.members.map(toMemberSummary),
    archived: Boolean(group.archivedAt),
    myMemberId: myMember.id,
    myRole: myMember.role,
    currency: group.currency,
  };
}
