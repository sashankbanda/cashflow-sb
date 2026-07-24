import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { requireUser } from "@/features/auth/session";
import { myBalanceLabel, toneTextClass } from "@/features/balances/label";
import { getFriendBalances } from "@/features/balances/queries";

export const metadata: Metadata = { title: "Friends" };

export default async function FriendsPage() {
  const user = await requireUser();
  const friends = await getFriendBalances(user.id);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Friends" eyebrow="Balances across all groups" />
      <div className="px-5">
        {friends.length === 0 ? (
          <GlassCard elevation="inset">
            <EmptyState
              icon={<UsersRound />}
              palette="mint"
              title="No friends yet"
              description="Invite people to a group and their balances with you appear here."
            />
          </GlassCard>
        ) : (
          <GlassCard elevation="inset" className="divide-y divide-white/6">
            {friends.map((friend) => {
              const label = myBalanceLabel(friend.netMinor);
              return (
                <div key={friend.userId} className="space-y-2 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={friend.name} image={friend.image} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium">{friend.name}</p>
                      <p className="text-footnote text-fg-3">
                        {friend.groups.length} shared group
                        {friend.groups.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "shrink-0 text-headline tabular-nums",
                        toneTextClass[label.tone],
                      )}
                    >
                      {friend.netMinor === 0 ? "Settled" : formatMoney(Math.abs(friend.netMinor))}
                    </p>
                  </div>
                  {friend.netMinor !== 0 ? (
                    <p className={cn("text-footnote", toneTextClass[label.tone])}>{label.text}</p>
                  ) : null}
                  <div className="space-y-1">
                    {friend.groups
                      .filter((line) => line.netMinor !== 0)
                      .map((line) => {
                        const lineLabel = myBalanceLabel(line.netMinor);
                        return (
                          <p
                            key={line.groupId}
                            className="flex items-center justify-between text-footnote text-fg-3"
                          >
                            <span className="truncate">
                              {line.emoji ? `${line.emoji} ` : ""}
                              {line.groupName}
                            </span>
                            <span className={cn("tabular-nums", toneTextClass[lineLabel.tone])}>
                              {lineLabel.text}
                            </span>
                          </p>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </GlassCard>
        )}
      </div>
    </div>
  );
}
