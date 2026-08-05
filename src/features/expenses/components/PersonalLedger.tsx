"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { ChevronRight, Repeat } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { formatSectionLabel } from "@/lib/dates";
import { useAction } from "@/hooks/useAction";
import { SwipeableRow } from "@/components/motion/SwipeableRow";
import { CategoryBadge } from "@/features/categories/icons";
import type { CategoryOption } from "@/features/categories/queries";
import { deletePersonalExpenseAction, restorePersonalExpenseAction } from "../actions";
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
  const [sort, setSort] = useState<"new" | "old" | "high" | "low">("new");

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

  // The regret window: after a delete, a 6-second Undo pill restores the row
  // (soft-delete makes this a one-column flip server-side).
  const [undoId, setUndoId] = useState<string | null>(null);
  const undoTimer = useRef<number | null>(null);
  const restore = useAction(restorePersonalExpenseAction, {
    successMessage: "Restored",
    optimistic: false, // the ledger re-renders from the server on refresh
    onSuccess: () => router.refresh(),
  });
  const deleteWithUndo = (expenseId: string) => {
    void remove.execute({ expenseId });
    if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    setUndoId(expenseId);
    undoTimer.current = window.setTimeout(() => setUndoId(null), 6000);
  };
  useEffect(
    () => () => {
      if (undoTimer.current !== null) window.clearTimeout(undoTimer.current);
    },
    [],
  );

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

  // Date sorts keep the day sections; amount sorts render one flat list.
  let sections: Array<[string, LedgerEntry[]]>;
  if (sort === "high" || sort === "low") {
    const byAmount = [...visible].sort((a, b) =>
      sort === "high" ? b.amountMinor - a.amountMinor : a.amountMinor - b.amountMinor,
    );
    sections = byAmount.length > 0 ? [[sort === "high" ? "Highest first" : "Lowest first", byAmount]] : [];
  } else {
    const byDay = groupByDay(visible);
    sections = (sort === "old" ? [...byDay].reverse() : byDay).map(([date, items]) => [
      formatSectionLabel(parseISO(date)),
      sort === "old" ? [...items].reverse() : items,
    ]);
  }

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

      <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1">
        {(
          [
            ["new", "Newest"],
            ["old", "Oldest"],
            ["high", "Highest"],
            ["low", "Lowest"],
          ] as const
        ).map(([key, label]) => (
          <Chip key={key} selected={sort === key} onClick={() => setSort(key)}>
            {label}
          </Chip>
        ))}
      </div>

      {sections.map(([label, items]) => (
        <section key={label} aria-label={label}>
          <h3 className="sticky top-12 z-10 px-1 pb-2 text-caption text-fg-3 uppercase">
            {label}
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
                  onDelete={() => deleteWithUndo(entry.expenseId)}
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
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => entry.groupId && router.push(`/groups/${entry.groupId}`)}
                  className="ease-out flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-glass"
                >
                  {row}
                  <ChevronRight className="size-4 shrink-0 text-fg-3" aria-hidden />
                </button>
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
          deleteWithUndo(expenseId);
        }}
      />

      {undoId ? (
        <div className="fixed inset-x-0 bottom-[calc(var(--dock-height)+env(safe-area-inset-bottom))] z-40 flex justify-center px-5">
          <div className="flex items-center gap-4 rounded-full glass-floating px-5 py-2.5">
            <span className="text-footnote text-fg-2">Entry deleted</span>
            <button
              type="button"
              onClick={() => {
                const expenseId = undoId;
                setUndoId(null);
                void restore.execute({ expenseId });
              }}
              className="text-footnote font-bold text-volt"
            >
              Undo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
