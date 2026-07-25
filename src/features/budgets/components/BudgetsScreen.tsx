"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import { useSheet } from "@/hooks/useSheet";
import { CategoryBadge } from "@/features/categories/icons";
import { budgetToneClass, type BudgetPace } from "../pace";
import type { BudgetLine, BudgetOverview } from "../queries";
import { BudgetFormSheet, type BudgetTarget } from "./BudgetFormSheet";
import { BudgetRing } from "./BudgetRing";

function remainingLabel(pace: BudgetPace): string {
  if (pace.remainingMinor < 0) return `${formatMoney(-pace.remainingMinor)} over`;
  return `${formatMoney(pace.remainingMinor)} left`;
}

function OverallHero({ line, onEdit }: { line: BudgetLine; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="ease-out block w-full text-left transition-transform duration-150 active:scale-[0.99]"
    >
      <GlassCard className="flex items-center gap-5 p-5">
        <BudgetRing pace={line.pace} size={112} strokeWidth={10} />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-caption text-fg-3 uppercase">Overall this month</p>
          <p className="text-title-2 text-fg-1 tabular-nums">
            {formatMoney(line.spentMinor, { compact: true })}
            <span className="text-body text-fg-3">
              {" "}
              of {formatMoney(line.budgetMinor, { compact: true })}
            </span>
          </p>
          <p className={cn("text-footnote", budgetToneClass(line.pace.level))}>
            {line.pace.message}
          </p>
        </div>
      </GlassCard>
    </button>
  );
}

function CategoryCard({ line, onEdit }: { line: BudgetLine; onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="ease-out block text-left transition-transform duration-150 active:scale-[0.97]"
    >
      <GlassCard elevation="inset" className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <CategoryBadge
            icon={line.category?.icon ?? "shapes"}
            gradient={line.category?.gradient ?? "ocean"}
          />
          <BudgetRing pace={line.pace} size={44} strokeWidth={5} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-footnote text-fg-1">{line.category?.name ?? "Category"}</p>
          <p className="truncate text-caption text-fg-3 tabular-nums">
            {formatMoney(line.spentMinor, { compact: true })} of{" "}
            {formatMoney(line.budgetMinor, { compact: true })}
          </p>
          <p className={cn("truncate text-caption", budgetToneClass(line.pace.level))}>
            {remainingLabel(line.pace)}
          </p>
        </div>
      </GlassCard>
    </button>
  );
}

/** Budgets home: overall pace hero + per-category ring grid. */
export function BudgetsScreen({ overview }: { overview: BudgetOverview }) {
  const router = useRouter();
  const sheet = useSheet();
  const [editing, setEditing] = useState<BudgetTarget | undefined>(undefined);

  const overall = overview.overall;
  const hasOverall = overall !== null;
  const canAdd = !hasOverall || overview.addableCategories.length > 0;

  const openCreate = () => {
    setEditing(undefined);
    sheet.open();
  };
  const openEdit = (line: BudgetLine) => {
    if (!line.budgetId) return;
    setEditing({
      budgetId: line.budgetId,
      categoryId: line.category?.id ?? null,
      name: line.category?.name ?? "Overall",
      amountMinor: line.budgetMinor,
    });
    sheet.open();
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Budgets"
        eyebrow={overview.monthLabel}
        leading={
          <IconButton aria-label="Back" size="sm" onClick={() => router.push("/profile")}>
            <ArrowLeft />
          </IconButton>
        }
        trailing={
          <IconButton
            aria-label="New budget"
            size="sm"
            variant="volt"
            disabled={!canAdd}
            onClick={openCreate}
          >
            <Plus />
          </IconButton>
        }
      />

      <div className="space-y-6 px-5">
        <section className="space-y-2">
          {overall ? (
            <OverallHero line={overall} onEdit={() => openEdit(overall)} />
          ) : (
            <GlassCard className="flex flex-col items-center gap-3 p-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-md bg-grad-aurora text-white">
                <Wallet className="size-6" aria-hidden />
              </span>
              <div>
                <p className="text-body text-fg-1">No overall budget yet</p>
                <p className="text-footnote text-fg-3">
                  Set a monthly ceiling and we&apos;ll pace it for you.
                </p>
              </div>
              <Button variant="volt" onClick={openCreate}>
                <Plus className="size-4" /> Set overall budget
              </Button>
            </GlassCard>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-caption text-fg-3 uppercase">By category</h2>
            <span className="text-caption text-fg-3">
              {overview.daysRemaining} {overview.daysRemaining === 1 ? "day" : "days"} left
            </span>
          </div>
          {overview.categories.length === 0 ? (
            <GlassCard elevation="inset" className="p-5">
              <p className="text-footnote text-fg-3">
                No category budgets. Add one to watch a single kind of spending.
              </p>
            </GlassCard>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {overview.categories.map((line) => (
                <CategoryCard key={line.budgetId} line={line} onEdit={() => openEdit(line)} />
              ))}
            </div>
          )}
          {canAdd ? (
            <Button variant="glass" block onClick={openCreate}>
              <Plus className="size-4" /> Add a budget
            </Button>
          ) : null}
        </section>
      </div>

      <BudgetFormSheet
        open={sheet.isOpen}
        onClose={sheet.close}
        target={editing}
        addable={overview.addableCategories}
        hasOverall={hasOverall}
      />
    </div>
  );
}
