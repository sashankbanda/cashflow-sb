"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
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
import { createPersonalExpenseAction, createSplitExpenseAction } from "../actions";

/**
 * One-screen fast entry for payments made elsewhere. Reached by sharing a UPI
 * receipt / bank SMS into the app (Android share target prefills everything)
 * or by tapping Paste (works on iPhone too): the amount and payee land
 * automatically, the user picks a category and saves.
 */
export function QuickAddScreen({
  categories,
  initial,
  defaultDate,
  splitSuggestions = [],
}: {
  categories: ReadonlyArray<CategoryOption>;
  initial: ParsedUpiText;
  /** Default entry date (ISO day; follows the app-wide period). */
  defaultDate?: string;
  /** Names from the viewer's Splits group, offered as one-tap chips. */
  splitSuggestions?: ReadonlyArray<string>;
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
  const [categoryId, setCategoryId] = useState(
    categories.find((c) => c.kind === (initial.isIncome ? "income" : "expense"))?.id ??
      categories[0]?.id ??
      "",
  );
  const [date, setDate] = useState(() => (defaultDate ? parseISO(defaultDate) : new Date()));
  const [saving, setSaving] = useState(false);
  const [splitNames, setSplitNames] = useState<string[]>([...initial.splitWith]);
  const [splitDraft, setSplitDraft] = useState("");

  const fallback = useAction(createPersonalExpenseAction, {
    successMessage: "Saved",
    optimistic: false, // no-IndexedDB fallback only; the outbox is the fast path
    onSuccess: () => router.push("/expenses"),
  });
  const createSplit = useAction(createSplitExpenseAction, {
    successMessage: "Split added",
    optimistic: false, // creates a group expense; balances reconcile server-side
    onSuccess: () => router.push("/expenses"),
  });

  // A typed-but-not-Added split name still counts (no silent loss).
  const pendingSplitNames =
    splitDraft.trim() !== "" &&
    !splitNames.some((name) => name.toLowerCase() === splitDraft.trim().toLowerCase())
      ? [...splitNames, splitDraft.trim()]
      : splitNames;
  const splitting = entryType === "expense" && pendingSplitNames.length > 0;

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
      if (parsed.splitWith.length > 0) setSplitNames([...parsed.splitWith]);
      toast.success("Filled from your copied message");
    } catch {
      toast.error("Couldn't read the clipboard — paste into the fields instead.");
    }
  };

  const save = async () => {
    const amountMinor = amountToMinor(amount);
    const income = entryType === "income";
    const category = categories.find((option) => option.id === categoryId);
    if (splitting) {
      // Add-and-split in one go — books straight into the Splits group.
      void createSplit.execute({
        description,
        amountMinor,
        categoryId,
        expenseDate: formatISODate(date),
        names: pendingSplitNames,
      });
      return;
    }
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
          onChange={(next) => {
            setEntryType(next);
            setCategoryId(
              categories.find((c) => c.kind === (next === "income" ? "income" : "expense"))?.id ??
                "",
            );
          }}
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
            {categories
              .filter((c) => c.kind === (entryType === "income" ? "income" : "expense"))
              .map((category) => {
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

        {entryType === "expense" ? (
          <div className="space-y-2">
            <p className="text-caption text-fg-3 uppercase">Split with (optional)</p>
            <div className="flex gap-2">
              <TextField
                placeholder="e.g. Rahul"
                value={splitDraft}
                onChange={(event) => setSplitDraft(event.target.value)}
                maxLength={50}
                className="flex-1"
              />
              <Button
                variant="glass"
                disabled={splitDraft.trim() === ""}
                onClick={() => {
                  const name = splitDraft.trim();
                  if (
                    name !== "" &&
                    !splitNames.some((n) => n.toLowerCase() === name.toLowerCase())
                  ) {
                    setSplitNames((current) => [...current, name]);
                  }
                  setSplitDraft("");
                }}
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {splitSuggestions
                .filter((s) => !splitNames.some((n) => n.toLowerCase() === s.toLowerCase()))
                .map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setSplitNames((current) => [...current, suggestion])}
                    className="ease-out inline-flex h-9 items-center gap-1.5 rounded-full glass-soft px-3.5 text-footnote text-fg-2 transition-transform duration-150 active:scale-[0.97]"
                  >
                    + {suggestion}
                  </button>
                ))}
              {splitNames.map((name) => (
                <span
                  key={name}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-volt px-3.5 text-footnote font-medium text-on-volt"
                >
                  {name}
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => setSplitNames((current) => current.filter((n) => n !== name))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <Button
          variant="volt"
          block
          size="lg"
          loading={saving || fallback.pending || createSplit.pending}
          disabled={!valid}
          onClick={() => void save()}
        >
          {splitting
            ? `Split with ${pendingSplitNames.length + 1} people · ${formatMoney(amountToMinor(amount))}`
            : `Save ${entryType} · ${formatMoney(amountToMinor(amount))}`}
        </Button>
      </div>
    </div>
  );
}
