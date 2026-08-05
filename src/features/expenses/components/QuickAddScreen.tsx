"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste } from "lucide-react";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { AmountKeypad } from "@/components/ui/AmountKeypad";
import { Button } from "@/components/ui/Button";
import { DateChip } from "@/components/ui/DateChip";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TextField } from "@/components/ui/TextField";
import { toast } from "@/components/ui/Toast";
import { asPalette, paletteBg } from "@/components/ui/palette";
import { cn } from "@/lib/cn";
import { amountToMinor, isValidAmount, minorToAmount } from "@/lib/amount-input";
import { formatISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { enqueueExpense } from "@/lib/outbox";
import { parseUpiText, type ParsedUpiText } from "@/lib/upi-parse";
import { useAction } from "@/hooks/useAction";
import { CategoryGlyph } from "@/features/categories/icons";
import type { CategoryOption } from "@/features/categories/queries";
import { createPersonalExpenseAction } from "../actions";

/**
 * One-screen fast entry for payments made elsewhere. Reached by sharing a UPI
 * receipt / bank SMS into the app (Android share target prefills everything)
 * or by tapping Paste (works on iPhone too): the amount and payee land
 * automatically, the user picks a category and saves.
 */
export function QuickAddScreen({
  categories,
  initial,
}: {
  categories: ReadonlyArray<CategoryOption>;
  initial: ParsedUpiText;
}) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [entryType, setEntryType] = useState<"expense" | "income">(
    initial.isIncome ? "income" : "expense",
  );
  const [amount, setAmount] = useState(
    initial.amountMinor !== null ? minorToAmount(initial.amountMinor) : "",
  );
  const [description, setDescription] = useState(initial.description);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date());
  const [saving, setSaving] = useState(false);

  const fallback = useAction(createPersonalExpenseAction, {
    successMessage: "Saved",
    optimistic: false, // no-IndexedDB fallback only; the outbox is the fast path
    onSuccess: () => router.push("/expenses"),
  });

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const parsed = parseUpiText(text);
      if (!parsed.matched) {
        toast.error("Couldn't find an amount in the copied text.");
        return;
      }
      setAmount(minorToAmount(parsed.amountMinor ?? 0));
      if (parsed.description) setDescription(parsed.description);
      setEntryType(parsed.isIncome ? "income" : "expense");
      toast.success("Filled from your copied message");
    } catch {
      toast.error("Couldn't read the clipboard — paste into the fields instead.");
    }
  };

  const save = async () => {
    const amountMinor = amountToMinor(amount);
    const income = entryType === "income";
    const category = categories.find((option) => option.id === categoryId);
    setSaving(true);
    const queued = await enqueueExpense({
      id: idempotencyKey,
      attempts: 0,
      payload: {
        description,
        amountMinor,
        categoryId,
        expenseDate: formatISODate(date),
        tagIds: [],
        isIncome: income,
        categoryName: category?.name ?? "Other",
        categoryIcon: category?.icon ?? "shapes",
        categoryGradient: category?.gradient ?? "ocean",
      },
    });
    if (queued) {
      toast.success(income ? "Income added" : "Expense added");
      router.push("/expenses");
      return;
    }
    setSaving(false);
    void fallback.execute({
      description,
      amountMinor,
      categoryId,
      expenseDate: formatISODate(date),
      idempotencyKey,
      tagIds: [],
      isIncome: income,
    });
  };

  const valid = isValidAmount(amount) && description.trim().length > 0 && categoryId !== "";

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Quick add" eyebrow="From a UPI payment" />
      <div className="space-y-5 px-5">
        <Button variant="glass" block onClick={() => void paste()}>
          <ClipboardPaste className="size-4" /> Paste a payment message
        </Button>

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
          placeholder={entryType === "income" ? "e.g. Salary" : "e.g. Zomato"}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
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

        <Button
          variant="volt"
          block
          size="lg"
          loading={saving || fallback.pending}
          disabled={!valid}
          onClick={() => void save()}
        >
          Save {entryType} · {formatMoney(amountToMinor(amount))}
        </Button>
      </div>
    </div>
  );
}
