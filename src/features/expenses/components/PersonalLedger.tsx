"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { formatSectionLabel } from "@/lib/dates";
import { useAction } from "@/hooks/useAction";
import { CategoryBadge } from "@/features/categories/icons";
import { deletePersonalExpenseAction } from "../actions";
import type { LedgerEntry } from "../personal-queries";

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
export function PersonalLedger({ entries }: { entries: ReadonlyArray<LedgerEntry> }) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<LedgerEntry | null>(null);
  const sections = groupByDay(entries);

  const remove = useAction(deletePersonalExpenseAction, {
    successMessage: "Expense deleted",
    onSuccess: () => {
      setPendingDelete(null);
      router.refresh();
    },
  });

  return (
    <div className="space-y-5">
      {sections.map(([date, items]) => (
        <section key={date} aria-label={formatSectionLabel(parseISO(date))}>
          <h3 className="sticky top-12 z-10 px-1 pb-2 text-caption text-fg-3 uppercase">
            {formatSectionLabel(parseISO(date))}
          </h3>
          <GlassCard elevation="inset" className="divide-y divide-white/6">
            {items.map((entry) => {
              const row = (
                <>
                  <CategoryBadge
                    icon={entry.category?.icon ?? "shapes"}
                    gradient={entry.category?.gradient ?? "ocean"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body text-fg-1">{entry.description}</p>
                    <p className="truncate text-footnote text-fg-3">
                      {entry.category?.name ?? "Other"}
                      {entry.source ? (
                        <>
                          {" · "}
                          <span className="text-fg-2">via {entry.source}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <p className="shrink-0 text-body font-semibold text-fg-1 tabular-nums">
                    {formatMoney(entry.amountMinor)}
                  </p>
                </>
              );
              return entry.isPersonal ? (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setPendingDelete(entry)}
                  className="ease-out flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-glass"
                >
                  {row}
                </button>
              ) : (
                <div key={entry.id} className="flex w-full items-center gap-3 p-4">
                  {row}
                </div>
              );
            })}
          </GlassCard>
        </section>
      ))}

      <Sheet
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete expense?"
      >
        {pendingDelete ? (
          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-3">
              <CategoryBadge
                icon={pendingDelete.category?.icon ?? "shapes"}
                gradient={pendingDelete.category?.gradient ?? "ocean"}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-body">{pendingDelete.description}</p>
                <Badge variant="glass">personal</Badge>
              </div>
              <p className={cn("text-headline tabular-nums")}>
                {formatMoney(pendingDelete.amountMinor)}
              </p>
            </div>
            <Button
              variant="destructive"
              block
              size="lg"
              loading={remove.pending}
              onClick={() => void remove.execute({ expenseId: pendingDelete.expenseId })}
            >
              <Trash2 className="size-4" /> Delete expense
            </Button>
            <Button variant="ghost" block onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
