"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useAction } from "@/hooks/useAction";
import { useSheet } from "@/hooks/useSheet";
import { archiveGroupAction } from "../actions";
import type { GroupDetail } from "../queries";
import { GroupFormSheet } from "./GroupFormSheet";

/** Group detail cover: back, gradient card, member chips, settings. */
export function GroupDetailHeader({ group }: { group: GroupDetail }) {
  const router = useRouter();
  const editSheet = useSheet();
  const archiveSheet = useSheet();

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
              <p className="mt-1 text-footnote text-white/70">
                {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
              </p>
            </div>
            {group.archived ? <Badge variant="glass">archived</Badge> : null}
          </div>
        </GlassCard>
      </div>

      <div className="scrollbar-none flex gap-2 overflow-x-auto px-5">
        {group.members.map((member) => (
          <span
            key={member.id}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-full glass-soft pr-3.5 pl-1.5",
            )}
          >
            <Avatar name={member.displayName} image={member.image} size="xs" />
            <span className="text-footnote text-fg-2">
              {member.displayName}
              {member.isGhost ? <span className="text-fg-3"> · ghost</span> : null}
            </span>
          </span>
        ))}
      </div>

      <GroupFormSheet
        open={editSheet.isOpen}
        onClose={editSheet.close}
        group={{ id: group.id, name: group.name, emoji: group.emoji, gradient: group.gradient }}
      />

      {group.myRole === "owner" && !group.archived ? (
        <div className="px-5">
          <Button variant="ghost" size="sm" onClick={archiveSheet.open}>
            Archive group
          </Button>
        </div>
      ) : null}

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
