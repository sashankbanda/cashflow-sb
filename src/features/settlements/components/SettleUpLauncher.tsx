"use client";

import { HandCoins } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/hooks/useHaptics";
import { useSheet } from "@/hooks/useSheet";
import type { GroupBalances } from "@/features/balances/queries";
import { SettleUpSheet } from "./SettleUpSheet";

export interface SettleUpLauncherProps {
  groupId: string;
  balances: GroupBalances;
  viewerUserId: string;
}

/**
 * Floating "Settle up" pill above the dock on group screens with open
 * balances. Hidden when the group is at zero.
 */
export function SettleUpLauncher({ groupId, balances, viewerUserId }: SettleUpLauncherProps) {
  const sheet = useSheet();
  const haptics = useHaptics();
  const hasOpenBalances = balances.members.some((member) => member.netMinor !== 0);

  if (!hasOpenBalances) return null;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--dock-height)+env(safe-area-inset-bottom)+1rem)] z-30 flex justify-center">
        <button
          type="button"
          onClick={() => {
            haptics.tap();
            sheet.open();
          }}
          className={cn(
            "pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-volt px-5",
            "text-body font-medium text-on-volt shadow-glow-volt",
            "ease-out transition-transform duration-150 active:scale-[0.97]",
          )}
        >
          <HandCoins className="size-4" /> Settle up
        </button>
      </div>

      <SettleUpSheet
        open={sheet.isOpen}
        onClose={sheet.close}
        groupId={groupId}
        balances={balances}
        viewerUserId={viewerUserId}
      />
    </>
  );
}
