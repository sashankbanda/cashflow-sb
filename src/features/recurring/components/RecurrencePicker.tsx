"use client";

import { Repeat } from "lucide-react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import type { Frequency } from "../recurrence";

export interface RecurrenceValue {
  enabled: boolean;
  frequency: Frequency;
}

const OPTIONS: ReadonlyArray<{ value: Frequency; label: string }> = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/** "Repeat" switch + frequency picker for the add-expense flow. */
export function RecurrencePicker({
  value,
  onChange,
}: {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Repeat className="size-4 text-fg-3" aria-hidden />
        <span id="repeat-label" className="flex-1 text-footnote text-fg-2">
          Repeat
        </span>
        <Toggle
          aria-labelledby="repeat-label"
          checked={value.enabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
        />
      </div>
      {value.enabled ? (
        <SegmentedControl
          aria-label="Repeat frequency"
          options={OPTIONS}
          value={value.frequency}
          onChange={(frequency) => onChange({ ...value, frequency })}
        />
      ) : null}
    </div>
  );
}
