"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { AmountKeypad } from "@/components/ui/AmountKeypad";
import { Button } from "@/components/ui/Button";
import { DateChip } from "@/components/ui/DateChip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { asPalette, paletteBg } from "@/components/ui/palette";
import { cn } from "@/lib/cn";
import { amountToMinor, isValidAmount, minorToAmount } from "@/lib/amount-input";
import { formatISODate } from "@/lib/dates";
import { useAction } from "@/hooks/useAction";
import { CategoryGlyph } from "@/features/categories/icons";
import type { CategoryOption } from "@/features/categories/queries";
import { updatePersonalExpenseAction } from "../actions";
import type { LedgerEntry } from "../personal-queries";

function Form({
  entry,
  categories,
  onClose,
  onDelete,
}: {
  entry: LedgerEntry;
  categories: ReadonlyArray<CategoryOption>;
  onClose: () => void;
  onDelete: (expenseId: string) => void;
}) {
  const router = useRouter();
  const [entryType, setEntryType] = useState<"expense" | "income">(
    entry.isIncome ? "income" : "expense",
  );
  const [amount, setAmount] = useState(minorToAmount(entry.amountMinor));
  const [description, setDescription] = useState(entry.description);
  const [categoryId, setCategoryId] = useState(entry.category?.id ?? categories[0]?.id ?? "");
  const [date, setDate] = useState(() => parseISO(entry.expenseDate));

  const update = useAction(updatePersonalExpenseAction, {
    successMessage: "Saved",
    optimistic: false, // the ledger re-renders from the server on refresh
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  const valid = isValidAmount(amount) && description.trim().length > 0 && categoryId !== "";

  return (
    <div className="space-y-5 pt-1">
      <SegmentedControl
        aria-label="Entry type"
        value={entryType}
        onChange={setEntryType}
        options={[
          { value: "expense", label: "Expense" },
          { value: "income", label: "Income" },
        ]}
      />

      <AmountDisplay value={amount} />
      <AmountKeypad value={amount} onChange={setAmount} />

      <TextField
        label={entryType === "income" ? "What's it from?" : "What was it for?"}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        error={update.fieldError("description")}
        maxLength={80}
      />

      <div className="space-y-2">
        <p className="text-caption text-fg-3 uppercase">Category</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const selected = category.id === categoryId;
            return (
              <button
                key={category.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategoryId(category.id)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-footnote",
                  "ease-out transition-[transform,background-color] duration-150 active:scale-[0.97]",
                  selected
                    ? cn("text-white", paletteBg[asPalette(category.gradient)])
                    : "glass-soft text-fg-2",
                )}
              >
                <CategoryGlyph icon={category.icon} className="size-4" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-caption text-fg-3 uppercase">Date</p>
        <DateChip value={date} onChange={setDate} />
      </div>

      <div className="space-y-2">
        <Button
          variant="volt"
          block
          size="lg"
          loading={update.pending}
          disabled={!valid}
          onClick={() =>
            void update.execute({
              expenseId: entry.expenseId,
              description,
              amountMinor: amountToMinor(amount),
              categoryId,
              expenseDate: formatISODate(date),
              isIncome: entryType === "income",
            })
          }
        >
          Save changes
        </Button>
        <Button variant="destructive" block onClick={() => onDelete(entry.expenseId)}>
          <Trash2 className="size-4" /> Delete entry
        </Button>
        <Button variant="ghost" block onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

/** Edit / delete sheet for a personal ledger entry — full CRUD in one place. */
export function PersonalEntrySheet({
  entry,
  categories,
  onClose,
  onDelete,
}: {
  entry: LedgerEntry | null;
  categories: ReadonlyArray<CategoryOption>;
  onClose: () => void;
  onDelete: (expenseId: string) => void;
}) {
  return (
    <Sheet open={entry !== null} onClose={onClose} title="Edit entry">
      {entry ? (
        <Form
          key={entry.id}
          entry={entry}
          categories={categories}
          onClose={onClose}
          onDelete={onDelete}
        />
      ) : null}
    </Sheet>
  );
}
