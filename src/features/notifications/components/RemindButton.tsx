"use client";

import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAction } from "@/hooks/useAction";
import { remindSettlementAction } from "../actions";

/** Nudge a friend who owes you to settle up (notification + push). */
export function RemindButton({ toUserId, groupId }: { toUserId: string; groupId: string }) {
  const remind = useAction(remindSettlementAction, {
    successMessage: "Reminder sent",
    optimistic: false, // fire-and-forget notification; no state to overlay
  });
  return (
    <Button
      variant="glass"
      size="sm"
      loading={remind.pending}
      onClick={() => void remind.execute({ groupId, toUserId })}
    >
      <BellRing className="size-3.5" /> Remind to settle
    </Button>
  );
}
