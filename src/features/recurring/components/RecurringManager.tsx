"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { ArrowLeft, CalendarClock, Pause, Play, Repeat, Square, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Sheet } from "@/components/ui/Sheet";
import { formatDayLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { useAction } from "@/hooks/useAction";
import { CategoryBadge } from "@/features/categories/icons";
import { deleteRecurringRuleAction, updateRecurringRuleAction } from "../actions";
import type { RecurringRuleView, UpcomingOccurrence } from "../queries";

function statusLine(rule: RecurringRuleView): string {
  if (rule.ended) return "Ended";
  if (rule.paused) return "Paused";
  return `${rule.frequencyLabel} · next ${formatDayLabel(parseISO(rule.nextRunOn))}`;
}

export function RecurringManager({
  rules,
  upcoming,
}: {
  rules: ReadonlyArray<RecurringRuleView>;
  upcoming: ReadonlyArray<UpcomingOccurrence>;
}) {
  const router = useRouter();
  const [active, setActive] = useState<RecurringRuleView | null>(null);

  const refresh = () => {
    setActive(null);
    router.refresh();
  };
  const update = useAction(updateRecurringRuleAction, { onSuccess: refresh });
  const remove = useAction(deleteRecurringRuleAction, {
    successMessage: "Recurring expense deleted",
    onSuccess: refresh,
  });
  const pending = update.pending || remove.pending;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Recurring"
        trailing={
          <IconButton aria-label="Back" size="sm" onClick={() => router.push("/profile")}>
            <ArrowLeft />
          </IconButton>
        }
      />

      <div className="space-y-6 px-5">
        {upcoming.length > 0 ? (
          <section className="space-y-2">
            <h2 className="text-caption text-fg-3 uppercase">Upcoming</h2>
            <GlassCard elevation="inset" className="divide-y divide-white/6">
              {upcoming.map((item) => (
                <div key={`${item.ruleId}-${item.date}`} className="flex items-center gap-3 p-4">
                  <CategoryBadge
                    icon={item.category?.icon ?? "repeat"}
                    gradient={item.category?.gradient ?? "iris"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body text-fg-1">{item.description}</p>
                    <p className="truncate text-footnote text-fg-3">
                      {formatDayLabel(parseISO(item.date))}
                      {item.groupName ? ` · ${item.groupName}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-body text-fg-2 tabular-nums">
                    {formatMoney(item.amountMinor)}
                  </p>
                </div>
              ))}
            </GlassCard>
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-caption text-fg-3 uppercase">Rules</h2>
          {rules.length === 0 ? (
            <GlassCard
              elevation="inset"
              className="flex flex-col items-center gap-2 p-6 text-center"
            >
              <span className="flex size-11 items-center justify-center rounded-md bg-grad-iris text-white">
                <Repeat className="size-5" aria-hidden />
              </span>
              <p className="text-footnote text-fg-3">
                No recurring expenses yet. Toggle &ldquo;Repeat&rdquo; when adding an expense to set
                one up.
              </p>
            </GlassCard>
          ) : (
            <GlassCard elevation="inset" className="divide-y divide-white/6">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setActive(rule)}
                  className="ease-out flex w-full items-center gap-3 p-4 text-left transition-colors duration-150 active:bg-glass"
                >
                  <CategoryBadge
                    icon={rule.category?.icon ?? "repeat"}
                    gradient={rule.category?.gradient ?? "iris"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body text-fg-1">{rule.description}</p>
                    <p className="truncate text-footnote text-fg-3">{statusLine(rule)}</p>
                  </div>
                  {rule.paused && !rule.ended ? <Badge variant="glass">paused</Badge> : null}
                  <p className="shrink-0 text-body text-fg-2 tabular-nums">
                    {formatMoney(rule.amountMinor)}
                  </p>
                </button>
              ))}
            </GlassCard>
          )}
        </section>
      </div>

      <Sheet
        open={active !== null}
        onClose={() => setActive(null)}
        title={active?.description ?? "Recurring expense"}
      >
        {active ? (
          <div className="space-y-2 pt-1">
            <p className="pb-2 text-footnote text-fg-3">
              {active.frequencyLabel}
              {active.groupName ? ` · ${active.groupName}` : " · Personal"} ·{" "}
              {formatMoney(active.amountMinor)}
            </p>

            {!active.ended ? (
              active.paused ? (
                <Button
                  variant="glass"
                  block
                  loading={pending}
                  onClick={() => void update.execute({ ruleId: active.id, action: "resume" })}
                >
                  <Play className="size-4" /> Resume
                </Button>
              ) : (
                <Button
                  variant="glass"
                  block
                  loading={pending}
                  onClick={() => void update.execute({ ruleId: active.id, action: "pause" })}
                >
                  <Pause className="size-4" /> Pause
                </Button>
              )
            ) : null}

            {!active.ended ? (
              <Button
                variant="glass"
                block
                loading={pending}
                onClick={() => void update.execute({ ruleId: active.id, action: "end" })}
              >
                <Square className="size-4" /> End (keep history)
              </Button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-2 text-footnote text-fg-3">
                <CalendarClock className="size-4" /> This rule has ended.
              </div>
            )}

            <Button
              variant="destructive"
              block
              loading={remove.pending}
              onClick={() => void remove.execute({ ruleId: active.id })}
            >
              <Trash2 className="size-4" /> Delete rule
            </Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
