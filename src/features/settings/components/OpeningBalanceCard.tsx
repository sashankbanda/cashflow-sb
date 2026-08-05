"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { TextField } from "@/components/ui/TextField";
import { amountToMinor, isValidAmount, minorToAmount } from "@/lib/amount-input";
import { useAction } from "@/hooks/useAction";
import { updateOpeningBalanceAction } from "../actions";

/** Profile card: set a starting balance so Home shows a true account balance. */
export function OpeningBalanceCard({ current }: { current: number | null }) {
  const router = useRouter();
  const [value, setValue] = useState(current !== null ? minorToAmount(current) : "");
  const save = useAction(updateOpeningBalanceAction, {
    successMessage: "Balance saved",
    optimistic: false, // Home hero re-renders from the server
    onSuccess: () => router.refresh(),
  });

  const parsedMinor = value.trim() === "" ? null : amountToMinor(value);
  const valid = value.trim() === "" || isValidAmount(value);

  return (
    <GlassCard className="space-y-3 p-4">
      <div>
        <p className="text-caption text-fg-3 uppercase">Starting balance</p>
        <p className="mt-1 text-footnote text-fg-3">
          What you have right now (₹). Home then shows your account balance — this amount plus
          everything in, minus everything out. Leave empty to show monthly balance instead.
        </p>
      </div>
      <div className="flex gap-2">
        <TextField
          placeholder="e.g. 25000"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={save.fieldError("amountMinor")}
          maxLength={12}
          className="flex-1"
        />
        <Button
          variant="glass"
          loading={save.pending}
          disabled={!valid || parsedMinor === current}
          onClick={() => void save.execute({ amountMinor: parsedMinor })}
        >
          Save
        </Button>
      </div>
    </GlassCard>
  );
}
