"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, LogOut, UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { IconButton } from "@/components/ui/IconButton";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { toast } from "@/components/ui/Toast";
import { useAction } from "@/hooks/useAction";
import type { GroupDetail } from "../queries";
import { addGhostAction, createInviteAction, leaveGroupAction } from "../members-actions";

async function shareUrl(url: string, groupName: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: `Join ${groupName} on Cashflow`, url });
      return;
    } catch {
      // fall through to clipboard (user may have dismissed the share sheet)
    }
  }
  await navigator.clipboard.writeText(url);
  toast.success("Invite link copied");
}

export interface MembersSheetProps {
  open: boolean;
  onClose: () => void;
  group: GroupDetail;
}

/** Member management: invite link, add ghosts, claim links, leave. */
export function MembersSheet({ open, onClose, group }: MembersSheetProps) {
  const router = useRouter();
  const [ghostName, setGhostName] = useState("");

  const invite = useAction(createInviteAction);
  const addGhost = useAction(addGhostAction, {
    onSuccess: () => {
      setGhostName("");
      router.refresh();
    },
    successMessage: "Member added",
  });
  const leave = useAction(leaveGroupAction, {
    onSuccess: () => {
      onClose();
      router.push("/groups");
      router.refresh();
    },
    successMessage: "You left the group",
  });

  const shareGroupInvite = async () => {
    const result = await invite.execute({ groupId: group.id });
    if (result.ok) await shareUrl(result.data.url, group.name);
  };

  const shareClaimInvite = async (memberId: string) => {
    const result = await invite.execute({ groupId: group.id, memberId });
    if (result.ok) await shareUrl(result.data.url, group.name);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Members">
      <div className="space-y-6 pt-1">
        <Button
          variant="volt"
          block
          size="lg"
          loading={invite.pending}
          onClick={() => void shareGroupInvite()}
        >
          <Link2 className="size-5" /> Share invite link
        </Button>

        <ul className="space-y-1" aria-label="Members">
          {group.members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 rounded-md px-2 py-2.5">
              <Avatar name={member.displayName} image={member.image} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body">
                  {member.displayName}
                  {member.id === group.myMemberId ? (
                    <span className="text-fg-3"> · you</span>
                  ) : null}
                </p>
              </div>
              {member.role === "owner" ? <Badge variant="glass">owner</Badge> : null}
              {member.isGhost ? (
                <IconButton
                  aria-label={`Share claim link for ${member.displayName}`}
                  size="sm"
                  variant="ghost"
                  onClick={() => void shareClaimInvite(member.id)}
                >
                  <Link2 />
                </IconButton>
              ) : null}
            </li>
          ))}
        </ul>

        <Divider />

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void addGhost.execute({ groupId: group.id, displayName: ghostName });
          }}
        >
          <TextField
            label="Add by name"
            placeholder="e.g. Dev Patel"
            value={ghostName}
            onChange={(event) => setGhostName(event.target.value)}
            hint="No account needed — they can claim their expenses later."
            error={addGhost.fieldError("displayName")}
            maxLength={50}
          />
          <Button
            type="submit"
            variant="glass"
            block
            loading={addGhost.pending}
            disabled={ghostName.trim().length === 0}
          >
            <UserPlus className="size-4" /> Add member
          </Button>
        </form>

        {group.myRole !== "owner" ? (
          <>
            <Divider />
            <Button
              variant="ghost"
              block
              loading={leave.pending}
              onClick={() => void leave.execute({ groupId: group.id })}
            >
              <LogOut className="size-4" /> Leave group
            </Button>
          </>
        ) : null}
      </div>
    </Sheet>
  );
}
