"use client";

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { formatMoney } from "@/lib/format";
import { OUTBOX_CHANGED, listQueued } from "@/lib/outbox";
import type { OutboxExpense } from "@/lib/outbox-model";
import { CategoryBadge } from "@/features/categories/icons";

/** Optimistic rows for expenses queued offline, shown atop the ledger. */
export function PendingExpenses() {
  const [items, setItems] = useState<OutboxExpense[]>([]);

  useEffect(() => {
    const load = () => {
      void listQueued().then(setItems);
    };
    load();
    window.addEventListener(OUTBOX_CHANGED, load);
    window.addEventListener("online", load);
    return () => {
      window.removeEventListener(OUTBOX_CHANGED, load);
      window.removeEventListener("online", load);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <GlassCard elevation="inset" className="divide-y divide-white/6">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-3 p-4 opacity-70">
          <CategoryBadge
            icon={item.payload.categoryIcon}
            gradient={item.payload.categoryGradient}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body text-fg-1">{item.payload.description}</p>
            <p className="truncate text-footnote text-fg-3">
              {item.payload.categoryName} · pending sync
            </p>
          </div>
          <p className="shrink-0 text-body font-semibold text-fg-2 tabular-nums">
            {formatMoney(item.payload.amountMinor)}
          </p>
        </div>
      ))}
    </GlassCard>
  );
}
