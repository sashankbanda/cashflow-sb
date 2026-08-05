"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Repeat } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { formatSectionLabel } from "@/lib/dates";
import { useAction } from "@/hooks/useAction";
import { SwipeableRow } from "@/components/motion/SwipeableRow";
import { CategoryBadge } from "@/features/categories/icons";
import type { CategoryOption } from "@/features/categories/queries";
import { deletePersonalExpenseAction } from "../actions";
import type { LedgerEntry } from "../personal-queries";
import { PersonalEntrySheet } from "./PersonalEntrySheet";

function groupByDay(entries: ReadonlyArray<LedgerEntry>): Array<[string, LedgerEntry[]]> {
  const sections = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const list = sections.get(entry.expenseDate) ?? [];
    list.push(entry);
    sections.set(entry.expenseDate, list);
  }
  return [...sections.entries()];
}

/** Unified personal ledger: standalone spends + your share of group expenses. */
export function PersonalLedger({
  entries,
  categories,
}: {
  entries: ReadonlyArray<LedgerEntry>;
  categories: ReadonlyArray<CategoryOption>;
}) {
  const router = useRouter();
  const [active, setActive] = useState<LedgerEntry | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string | null>(null);

  const remove = useAction(deletePersonalExpenseAction, {
    successMessage: "Expense deleted",
    optimistic: {
      state: entries,
      apply: (current, input: { expenseId: string }) =>
        current.filter((entry) => entry.expenseId !== input.expenseId),
    },
    onSuccess: () => router.refresh(),
  });
  // Render from the optimistic overlay: a deleted row vanishes on tap and
  // comes back if the server rejects it.
  const liveEntries = remove.optimisticState;

  const allTags = useMemo(() => {
    const byId = new Map<string, string>();
    for (const entry of liveEntries) {
      for (const tag of entry.tags) byId.set(tag.id, tag.name);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [liveEntries]);

  // Months present in the ledger (newest first), as YYYY-MM keys.
  const months = useMemo(
    () => [...new Set(liveEntries.map((entry) => entry.expenseDate.slice(0, 7)))].sort().reverse(),
    [liveEntries],
  );

  const visible = liveEntries.filter(
    (entry) =>
      (!tagFilter || entry.tags.some((tag) => tag.id === tagFilter)) &&
      (!monthFilter || entry.expenseDate.startsWith(monthFilter)),
  );
  const sections = groupByDay(visible);

  return (
    <div className="space-y-5">
      {months.length > 1 ? (
        <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1">
          <Chip selected={monthFilter === null} onClick={() => setMonthFilter(null)}>
            All
          </Chip>
          {months.map((month) => (
            <Chip
              key={month}
              selected={monthFilter === month}
              onClick={() => setMonthFilter(monthFilter === month ? null : month)}
            >
              {format(parseISO(`${month}-01`), "MMM yyyy")}
            </Chip>
          ))}
        </div>
      ) : null}
      {allTags.length > 0 ? (
        <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1">
          {allTags.map((tag) => (
            <Chip
              key={tag.id}
              selected={tagFilter === tag.id}
              onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}
            >
              #{tag.name}
            </Chip>
          ))}
        </div>
      ) : null}

      {sections.map(([date, items]) => (
        <section key={date} aria-label={formatSectionLabel(parseISO(date))}>
          <h3 className="sticky top-12 z-10 px-1 pb-2 text-caption text-fg-3 uppercase">
            {formatSectionLabel(parseISO(date))}
          </h3>
          <GlassCard elevation="inset" className="divide-y divide-hairline overflow-hidden">
            {items.map((entry) => {
              const row = (
                <>
                  <CategoryBadge
                    icon={entry.category?.icon ?? "shapes"}
                    gradient={entry.category?.gradient ?? "ocean"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-body text-fg-1">
                      {entry.description}
                      {entry.isRecurring ? (
                        <Repeat className="size-3.5 shrink-0 text-fg-3" aria-label="Recurring" />
                      ) : null}
                    </p>
                    <p className="truncate text-footnote text-fg-3">
                      {entry.isIncome ? "Income" : (entry.category?.name ?? "Other")}
                      {entry.source ? (
                        <>
                          {" · "}
                          <span className="text-fg-2">via {entry.source}</span>
                        </>
                      ) : null}
                      {entry.tags.length > 0
                        ? ` · ${entry.tags.map((tag) => `#${tag.name}`).join(" ")}`
                        : ""}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-body font-semibold tabular-nums",
                      entry.isIncome ? "text-positive" : "text-fg-1",
                    )}
                  >
                    {formatMoney(entry.amountMinor, entry.isIncome ? { sign: "always" } : {})}
                  </p>
                </>
              );
              return entry.isPersonal ? (
                <SwipeableRow
                  key={entry.id}
                  onEdit={() => setActive(entry)}
                  onDelete={() => void remove.execute({ expenseId: entry.expenseId })}
                >
                  <button
                    type="button"
                    onClick={() => setActive(entry)}
                    className="ease-out flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-glass"
                  >
                    {row}
                  </button>
                </SwipeableRow>
              ) : (
                <div key={entry.id} className="flex w-full items-center gap-3 p-4">
                  {row}
                </div>
              );
            })}
          </GlassCard>
        </section>
      ))}

      <PersonalEntrySheet
        entry={active}
        categories={categories}
        onClose={() => setActive(null)}
        onDelete={(expenseId) => {
          setActive(null);
          void remove.execute({ expenseId });
        }}
      />
    </div>
  );
}
