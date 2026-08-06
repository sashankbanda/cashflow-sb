"use client";

import { TextField } from "@/components/ui/TextField";
import { amountToMinor, isValidAmount, minorToAmount } from "@/lib/amount-input";
import { formatMoney } from "@/lib/format";

/** Equal-split defaults as amount strings (remainder paise go to the first few). */
export function equalShareStrings(totalMinor: number, count: number): string[] {
  const base = Math.floor(totalMinor / count);
  const remainder = totalMinor - base * count;
  return Array.from({ length: count }, (_, index) =>
    minorToAmount(base + (index < remainder ? 1 : 0)),
  );
}

/** Paise assigned so far by a set of share inputs (invalid/empty count as 0). */
export function assignedShareMinor(values: ReadonlyArray<string>): number {
  return values.reduce(
    (sum, value) => sum + (isValidAmount(value) ? amountToMinor(value) : 0),
    0,
  );
}

/**
 * Per-person amount inputs for an unequal split. `people[0]` is "You"; values
 * align with people. Controlled — the parent owns the strings and validates
 * the sum on submit; the footer shows the live remainder.
 */
export function SplitSharesEditor({
  totalMinor,
  people,
  values,
  onChange,
}: {
  totalMinor: number;
  people: ReadonlyArray<string>;
  values: ReadonlyArray<string>;
  onChange: (values: string[]) => void;
}) {
  const remainder = totalMinor - assignedShareMinor(values);
  return (
    <div className="space-y-2">
      {people.map((person, index) => (
        <div key={person} className="flex items-center gap-3">
          <p className="w-24 truncate text-body text-fg-2">{person}</p>
          <TextField
            placeholder="0"
            inputMode="decimal"
            value={values[index] ?? ""}
            onChange={(event) => {
              const next = [...values];
              next[index] = event.target.value;
              onChange(next);
            }}
            maxLength={12}
            className="flex-1"
            aria-label={`${person}'s share`}
          />
        </div>
      ))}
      <p
        role={remainder === 0 ? undefined : "alert"}
        className={`text-footnote ${remainder === 0 ? "text-fg-3" : "text-negative"}`}
      >
        {remainder === 0
          ? `All ${formatMoney(totalMinor)} assigned`
          : remainder > 0
            ? `${formatMoney(remainder)} left to assign`
            : `${formatMoney(-remainder)} over the total`}
      </p>
    </div>
  );
}
