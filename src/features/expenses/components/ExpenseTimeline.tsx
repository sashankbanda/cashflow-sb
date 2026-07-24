import { parseISO } from "date-fns";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { formatSectionLabel } from "@/lib/dates";
import { CategoryBadge } from "@/features/categories/icons";
import type { TimelineExpense } from "../queries";

function groupByDay(items: ReadonlyArray<TimelineExpense>): Array<[string, TimelineExpense[]]> {
  const sections = new Map<string, TimelineExpense[]>();
  for (const item of items) {
    const list = sections.get(item.expenseDate) ?? [];
    list.push(item);
    sections.set(item.expenseDate, list);
  }
  return [...sections.entries()];
}

export function ExpenseRow({ expense }: { expense: TimelineExpense }) {
  return (
    <div className="flex items-center gap-3 p-4">
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
        <p className={cn("text-caption tabular-nums", "text-fg-3")}>
          {expense.myShareMinor > 0
            ? `your share ${formatMoney(expense.myShareMinor)}`
            : "not involved"}
        </p>
      </div>
    </div>
  );
}

/** Day-grouped expense list with sticky section captions. */
export function ExpenseTimeline({ expenses }: { expenses: ReadonlyArray<TimelineExpense> }) {
  const sections = groupByDay(expenses);

  return (
    <div className="space-y-5">
      {sections.map(([date, items]) => (
        <section key={date} aria-label={formatSectionLabel(parseISO(date))}>
          <h3 className="sticky top-12 z-10 px-1 pb-2 text-caption text-fg-3 uppercase">
            {formatSectionLabel(parseISO(date))}
          </h3>
          <GlassCard elevation="inset" className="divide-y divide-white/6">
            {items.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} />
            ))}
          </GlassCard>
        </section>
      ))}
    </div>
  );
}
