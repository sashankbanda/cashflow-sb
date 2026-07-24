"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { ChevronsDownUp } from "lucide-react";
import { springSmooth } from "@/components/motion/transitions";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/hooks/useHaptics";
import type { GroupSummary } from "../queries";
import { GroupCard } from "./GroupCard";

export interface GroupsDeckProps {
  groups: ReadonlyArray<GroupSummary>;
  /** Per-group subtitle (balance line once the balance engine lands). */
  subtitles?: Record<string, string>;
}

/**
 * The stacked wallet deck from the reference boards: cards overlap showing
 * 64px header peeks; the first tap fans the deck open with springs; tapping
 * a fanned card opens the group.
 */
export function GroupsDeck({ groups, subtitles }: GroupsDeckProps) {
  const router = useRouter();
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();
  const stackable = groups.length > 2;
  const [fanned, setFanned] = useState(!stackable);

  const open = (groupId: string) => {
    haptics.tap();
    router.push(`/groups/${groupId}`);
  };

  return (
    <section aria-label="Your groups">
      {stackable ? (
        <div className="mb-2 flex h-8 items-center justify-end px-1">
          {fanned ? (
            <IconButton
              aria-label="Stack groups"
              size="sm"
              variant="ghost"
              onClick={() => setFanned(false)}
            >
              <ChevronsDownUp />
            </IconButton>
          ) : (
            <p className="text-caption text-fg-3 uppercase">Tap to fan out</p>
          )}
        </div>
      ) : null}

      <div>
        {groups.map((group, index) => (
          <motion.button
            key={group.id}
            type="button"
            layout
            transition={reducedMotion ? { duration: 0 } : springSmooth}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            onClick={() => {
              if (!fanned) {
                haptics.select();
                setFanned(true);
              } else {
                open(group.id);
              }
            }}
            aria-label={fanned ? `Open ${group.name}` : `Fan out groups`}
            className={cn(
              "relative block w-full rounded-lg text-left select-none",
              index > 0 && (fanned ? "mt-3" : "-mt-16"),
            )}
            style={{ zIndex: index + 1 }}
          >
            <GroupCard group={group} subtitle={subtitles?.[group.id]} />
          </motion.button>
        ))}
      </div>
    </section>
  );
}
