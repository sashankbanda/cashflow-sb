"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Settings2, UserRoundPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useAction } from "@/hooks/useAction";
import { useSheet } from "@/hooks/useSheet";
import {
  memberBalanceLabel,
  myBalanceLabel,
  toneOnGradientClass,
  toneTextClass,
} from "@/features/balances/label";
import type { GroupBalances } from "@/features/balances/queries";
import { archiveGroupAction } from "../actions";
import type { GroupDetail } from "../queries";
import { GroupFormSheet } from "./GroupFormSheet";
import { MembersSheet } from "./MembersSheet";

/** Group detail cover: back, gradient card with balances, member chips. */
export function GroupDetailHeader({
  group,
  balances,
}: {
  group: GroupDetail;
  balances: GroupBalances;
}) {
  const router = useRouter();
  const editSheet = useSheet();
  const archiveSheet = useSheet();
  const membersSheet = useSheet();

  const archive = useAction(archiveGroupAction, {
    successMessage: "Group archived",
    onSuccess: () => {
      archiveSheet.close();
      router.push("/groups");
      router.refresh();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-5 pt-safe">
        <div className="pt-4">
          <IconButton aria-label="Back to groups" size="sm" onClick={() => router.push("/groups")}>
            <ArrowLeft />
          </IconButton>
        </div>
        <div className="pt-4">
          <IconButton aria-label="Group settings" size="sm" onClick={editSheet.open}>
            <Settings2 />
          </IconButton>
        </div>
      </div>

      <div className="px-5">
        <GlassCard gradient={group.gradient} glow className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-title-1 text-white">
                {group.emoji ? (
                  <span aria-hidden className="mr-2">
                    {group.emoji}
                  </span>
                ) : null}
                {group.name}
              </h1>
              <p
                className={cn(
                  "mt-1 text-headline",
                  toneOnGradientClass[myBalanceLabel(balances.myNetMinor).tone],
                )}
              >
                {myBalanceLabel(balances.myNetMinor).text}
              </p>
              <p className="mt-0.5 text-footnote text-white/70">
                {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
              </p>
            </div>
            {group.archived ? <Badge variant="glass">archived</Badge> : null}
          </div>
        </GlassCard>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto px-5">
        <button
          type="button"
          onClick={membersSheet.open}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full glass-soft px-3.5",
            "ease-out text-footnote text-fg-2 transition-transform duration-150 active:scale-[0.97]",
          )}
        >
          <UserRoundPlus className="size-4" /> Invite
        </button>
        {group.members.map((member) => {
          const net = balances.byMember[member.id] ?? 0;
          const label = memberBalanceLabel(net);
          return (
            <span
              key={member.id}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full glass-soft pr-3.5 pl-1.5",
              )}
            >
              <Avatar name={member.displayName} image={member.image} size="xs" />
              <span className="text-footnote text-fg-2">
                {member.displayName}
                <span className={cn("ml-1.5 tabular-nums", toneTextClass[label.tone])}>
                  {label.text}
                </span>
              </span>
            </span>
          );
        })}
      </div>

      <MembersSheet open={membersSheet.isOpen} onClose={membersSheet.close} group={group} />

      <GroupFormSheet
        open={editSheet.isOpen}
        onClose={editSheet.close}
        group={{ id: group.id, name: group.name, emoji: group.emoji, gradient: group.gradient }}
      />

      <div className="flex items-center gap-3 px-5">
        <a
          href={`/api/export?type=group&groupId=${group.id}`}
          download
          className="ease-out inline-flex items-center gap-1.5 text-footnote text-fg-3 transition-colors duration-150 hover:text-fg-1"
        >
          <Download className="size-4" /> Export CSV
        </a>
        {group.myRole === "owner" && !group.archived ? (
          <Button variant="ghost" size="sm" onClick={archiveSheet.open}>
            Archive group
          </Button>
        ) : null}
      </div>

      <Sheet open={archiveSheet.isOpen} onClose={archiveSheet.close} title="Archive group?">
        <div className="space-y-4 pt-1">
          <p className="text-body text-fg-2">
            “{group.name}” will disappear from everyone&apos;s deck. Balances and history are kept,
            and nothing is deleted.
          </p>
          <Button
            variant="destructive"
            block
            size="lg"
            loading={archive.pending}
            onClick={() => void archive.execute({ groupId: group.id })}
          >
            Archive group
          </Button>
          <Button variant="ghost" block onClick={archiveSheet.close}>
            Keep it
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
