import type { Metadata } from "next";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { requireUser } from "@/features/auth/session";
import { ActivityFeed } from "@/features/activity/components/ActivityFeed";
import { getActivityFeed } from "@/features/activity/queries";
import { getMyGroups } from "@/features/groups/queries";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage() {
  const user = await requireUser();
  const [initial, groups] = await Promise.all([getActivityFeed(user.id), getMyGroups(user.id)]);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Activity" eyebrow="What's been happening" />
      <div className="px-5">
        <ActivityFeed
          initial={initial}
          groups={groups.map((group) => ({
            id: group.id,
            name: group.name,
            emoji: group.emoji,
          }))}
        />
      </div>
    </div>
  );
}
