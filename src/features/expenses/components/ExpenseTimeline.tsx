"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatMoney } from "@/lib/format";
import { formatSectionLabel } from "@/lib/dates";
import type { CategoryOption } from "@/features/categories/queries";
import { CategoryBadge } from "@/features/categories/icons";
import type { GroupDetail } from "@/features/groups/queries";
import type { TimelineExpense } from "../queries";
import { ExpenseDetailSheet } from "./ExpenseDetailSheet";

function groupByDay(items: ReadonlyArray<TimelineExpense>): Array<[string, TimelineExpense[]]> {
  const sections = new Map<string, TimelineExpense[]>();
  for (const item of items) {
    const list = sections.get(item.expenseDate) ?? [];
    list.push(item);
    sections.set(item.expenseDate, list);
  }
  return [...sections.entries()];
}

function ExpenseRow({ expense, onOpen }: { expense: TimelineExpense; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${expense.description}, ${formatMoney(expense.amountMinor)}`}
      className="ease-out flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-glass"
    >
      <CategoryBadge
        icon={expense.category?.icon ?? "shapes"}
        gradient={expense.category?.gradient ?? "ocean"}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-fg-1">{expense.description}</p>
        <p className="truncate text-footnote text-fg-3">
          {expense.payerLabel} paid · split {expense.participantCount} way
          {expense.participantCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-body font-semibold text-fg-1 tabular-nums">
          {formatMoney(expense.amountMinor)}
        </p>
        <p className="text-caption text-fg-3 tabular-nums">
          {expense.myShareMinor > 0
            ? `your share ${formatMoney(expense.myShareMinor)}`
            : "not involved"}
        </p>
      </div>
    </button>
  );
}

export interface ExpenseTimelineProps {
  expenses: ReadonlyArray<TimelineExpense>;
  group: GroupDetail;
  categories: ReadonlyArray<CategoryOption>;
  viewerUserId: string;
}

/** Day-grouped expense list; rows open the full breakdown sheet. */
export function ExpenseTimeline({
  expenses,
  group,
  categories,
  viewerUserId,
}: ExpenseTimelineProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sections = groupByDay(expenses);
  const openExpense = expenses.find((expense) => expense.id === openId) ?? null;

  return (
    <div className="space-y-5">
      {sections.map(([date, items]) => (
        <section key={date} aria-label={formatSectionLabel(parseISO(date))}>
          <h3 className="sticky top-12 z-10 px-1 pb-2 text-caption text-fg-3 uppercase">
            {formatSectionLabel(parseISO(date))}
          </h3>
          <GlassCard elevation="inset" className="divide-y divide-white/6">
            {items.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} onOpen={() => setOpenId(expense.id)} />
            ))}
          </GlassCard>
        </section>
      ))}

      <ExpenseDetailSheet
        expense={openExpense}
        onClose={() => setOpenId(null)}
        group={group}
        categories={categories}
        viewerUserId={viewerUserId}
      />
    </div>
  );
}
