"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { TextField } from "@/components/ui/TextField";
import { useAction } from "@/hooks/useAction";
import { updateUpiIdAction } from "../actions";

/** Profile card: set your UPI ID so friends can pay you from Settle up. */
export function UpiIdCard({ current }: { current: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const save = useAction(updateUpiIdAction, {
    successMessage: "UPI ID saved",
    optimistic: false, // validated server-side; profile re-renders on refresh
    onSuccess: () => router.refresh(),
  });

  return (
    <GlassCard className="space-y-3 p-4">
      <div>
        <p className="text-caption text-fg-3 uppercase">Your UPI ID</p>
        <p className="mt-1 text-footnote text-fg-3">
          Friends who need to pay you get a &ldquo;Pay via UPI&rdquo; button in Settle up.
        </p>
      </div>
      <div className="flex gap-2">
        <TextField
          placeholder="name@bank"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={save.fieldError("upiId")}
          maxLength={80}
          className="flex-1"
        />
        <Button
          variant="glass"
          loading={save.pending}
          disabled={value.trim() === (current ?? "")}
          onClick={() => void save.execute({ upiId: value })}
        >
          Save
        </Button>
      </div>
    </GlassCard>
  );
}
