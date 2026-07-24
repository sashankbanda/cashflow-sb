"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import { HandCoins } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatMoney } from "@/lib/format";
import { formatSectionLabel } from "@/lib/dates";
import type { CategoryOption } from "@/features/categories/queries";
import { CategoryBadge } from "@/features/categories/icons";
import type { GroupDetail } from "@/features/groups/queries";
import type { TimelineExpense, TimelineItem, TimelineSettlement } from "../queries";
import { ExpenseDetailSheet } from "./ExpenseDetailSheet";

function dateOf(item: TimelineItem): string {
  return item.kind === "expense" ? item.expenseDate : item.date;
}

function groupByDay(items: ReadonlyArray<TimelineItem>): Array<[string, TimelineItem[]]> {
  const sections = new Map<string, TimelineItem[]>();
  for (const item of items) {
    const list = sections.get(dateOf(item)) ?? [];
    list.push(item);
    sections.set(dateOf(item), list);
  }
  return [...sections.entries()];
}

const METHOD_LABEL: Record<TimelineSettlement["method"], string> = {
  upi: "UPI",
  cash: "cash",
  bank: "bank transfer",
  other: "other",
};

function SettlementRow({ settlement }: { settlement: TimelineSettlement }) {
  return (
    <div className="flex w-full items-center gap-3 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-mint-3">
        <HandCoins className="size-5 text-mint-1" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body text-fg-1">
          {settlement.fromLabel} paid {settlement.toLabel}
        </p>
        <p className="truncate text-footnote text-fg-3">
          {METHOD_LABEL[settlement.method]}
          {settlement.note ? ` · ${settlement.note}` : ""}
        </p>
      </div>
      <p className="shrink-0 text-body font-semibold text-positive tabular-nums">
        {formatMoney(settlement.amountMinor)}
      </p>
    </div>
  );
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
  items: ReadonlyArray<TimelineItem>;
  group: GroupDetail;
  categories: ReadonlyArray<CategoryOption>;
  viewerUserId: string;
}

/** Day-grouped group timeline: expense rows open the breakdown sheet. */
export function ExpenseTimeline({ items, group, categories, viewerUserId }: ExpenseTimelineProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sections = groupByDay(items);
  const openExpense =
    items.find(
      (item): item is { kind: "expense" } & TimelineExpense =>
        item.kind === "expense" && item.id === openId,
    ) ?? null;

  return (
    <div className="space-y-5">
      {sections.map(([date, sectionItems]) => (
        <section key={date} aria-label={formatSectionLabel(parseISO(date))}>
          <h3 className="sticky top-12 z-10 px-1 pb-2 text-caption text-fg-3 uppercase">
            {formatSectionLabel(parseISO(date))}
          </h3>
          <GlassCard elevation="inset" className="divide-y divide-white/6">
            {sectionItems.map((item) =>
              item.kind === "expense" ? (
                <ExpenseRow key={item.id} expense={item} onOpen={() => setOpenId(item.id)} />
              ) : (
                <SettlementRow key={item.id} settlement={item} />
              ),
            )}
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
