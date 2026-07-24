"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { cn } from "@/lib/cn";
import { useAction } from "@/hooks/useAction";
import type { PublicInvite } from "../members-service";
import { claimGhostAction, joinInviteAction } from "../members-actions";

export interface JoinGroupViewProps {
  invite: PublicInvite;
  viewerName: string;
}

/**
 * Authenticated join flow on the invite landing: join as yourself, or claim
 * a ghost so your existing history attaches to your account.
 */
export function JoinGroupView({ invite, viewerName }: JoinGroupViewProps) {
  const router = useRouter();
  const [selectedGhost, setSelectedGhost] = useState<string | null>(invite.claimTarget?.id ?? null);

  const join = useAction(joinInviteAction, {
    successMessage: `Welcome to ${invite.group.name}!`,
    onSuccess: ({ groupId }) => {
      router.push(`/groups/${groupId}`);
      router.refresh();
    },
  });
  const claim = useAction(claimGhostAction, {
    successMessage: "That's you now — history attached.",
    onSuccess: ({ groupId }) => {
      router.push(`/groups/${groupId}`);
      router.refresh();
    },
  });
  const pending = join.pending || claim.pending;

  const submit = () => {
    if (selectedGhost) {
      void claim.execute({ token: invite.token, memberId: selectedGhost });
    } else {
      void join.execute({ token: invite.token });
    }
  };

  const claimOnly = invite.claimTarget !== null;

  return (
    <div className="space-y-5">
      {!claimOnly ? (
        <button
          type="button"
          aria-pressed={selectedGhost === null}
          onClick={() => setSelectedGhost(null)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md p-4 text-left",
            "ease-out transition-colors duration-150",
            selectedGhost === null ? "glass" : "glass-soft hover:bg-glass",
          )}
        >
          <span className="flex size-8 items-center justify-center rounded-full bg-glass">
            <UserRound className="size-4 text-fg-2" />
          </span>
          <span className="flex-1">
            <span className="block text-body text-fg-1">Join as {viewerName}</span>
            <span className="block text-footnote text-fg-3">Fresh start, no history</span>
          </span>
          {selectedGhost === null ? <Check className="size-5 text-volt" /> : null}
        </button>
      ) : null}

      {invite.ghosts.length > 0 ? (
        <>
          {!claimOnly ? (
            <div className="flex items-center gap-3">
              <Divider className="flex-1" />
              <p className="text-caption text-fg-3 uppercase">or claim your name</p>
              <Divider className="flex-1" />
            </div>
          ) : null}
          <ul className="space-y-2">
            {(claimOnly && invite.claimTarget ? [invite.claimTarget] : invite.ghosts).map(
              (ghost) => (
                <li key={ghost.id}>
                  <button
                    type="button"
                    aria-pressed={selectedGhost === ghost.id}
                    onClick={() => setSelectedGhost(ghost.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md p-4 text-left",
                      "ease-out transition-colors duration-150",
                      selectedGhost === ghost.id ? "glass" : "glass-soft hover:bg-glass",
                    )}
                  >
                    <Avatar name={ghost.displayName} size="sm" />
                    <span className="flex-1">
                      <span className="block text-body text-fg-1">{ghost.displayName}</span>
                      <span className="block text-footnote text-fg-3">
                        Their expenses become yours
                      </span>
                    </span>
                    {selectedGhost === ghost.id ? <Check className="size-5 text-volt" /> : null}
                  </button>
                </li>
              ),
            )}
          </ul>
        </>
      ) : null}

      <Button variant="volt" block size="lg" loading={pending} onClick={submit}>
        {selectedGhost ? "Claim and join" : "Join group"}
      </Button>
    </div>
  );
}
