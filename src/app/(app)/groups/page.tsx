import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { myBalanceLabel } from "@/features/balances/label";
import { getMyNets } from "@/features/balances/queries";
import { GroupsView } from "@/features/groups/components/GroupsView";
import { getMyGroups } from "@/features/groups/queries";

export const metadata: Metadata = { title: "Groups" };

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await getMyGroups(user.id);
  const nets = await getMyNets(
    user.id,
    groups.map((group) => group.id),
  );
  const subtitles = Object.fromEntries(
    groups.map((group) => [group.id, myBalanceLabel(nets[group.id] ?? 0).text]),
  );
  return <GroupsView groups={groups} subtitles={subtitles} />;
}
