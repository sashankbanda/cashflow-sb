import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientPanel } from "@/components/ui/GradientPanel";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { asPalette, paletteBg } from "@/components/ui/palette";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import type { MonthlyReport } from "../queries";
import { ReportActions } from "./ReportActions";

const navClass =
  "ease-out flex size-9 items-center justify-center rounded-full glass text-fg-2 transition-transform duration-150 hover:text-fg-1 active:scale-[0.97] [&_svg]:size-4";

export function ReportsView({
  report,
  prevHref,
  nextHref,
}: {
  report: MonthlyReport;
  prevHref: string;
  nextHref: string | null;
}) {
  const csvHref = `/api/export?type=personal&from=${report.start}&to=${report.end}`;
  const cardHref = `/api/report/image?month=${report.monthKey}`;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Reports" eyebrow="Monthly summary" />

      <div className="space-y-5 px-5">
        <div className="flex items-center justify-between">
          <Link href={prevHref} aria-label="Previous month" className={navClass}>
            <ChevronLeft />
          </Link>
          <p className="text-headline tabular-nums">{report.monthLabel}</p>
          {nextHref ? (
            <Link href={nextHref} aria-label="Next month" className={navClass}>
              <ChevronRight />
            </Link>
          ) : (
            <span className="size-9" aria-hidden />
          )}
        </div>

        <GradientPanel palette="aurora" className="p-6">
          <p className="text-caption text-white/70 uppercase">Spent</p>
          <p className="mt-2 font-dot text-display font-black text-white tabular-nums">
            {formatMoney(report.totalMinor, { compact: report.totalMinor >= 10_000_00 })}
          </p>
          <p className="mt-1 text-footnote text-white/70">
            {formatMoney(report.avgPerDayMinor)}/day ·{" "}
            {report.netMinor >= 0
              ? `owed ${formatMoney(report.netMinor)}`
              : `you owe ${formatMoney(-report.netMinor)}`}
          </p>
        </GradientPanel>

        <section className="space-y-2">
          <h2 className="text-caption text-fg-3 uppercase">Top categories</h2>
          {report.topCategories.length === 0 ? (
            <GlassCard elevation="inset" className="p-5">
              <p className="text-footnote text-fg-3">No spending recorded this month.</p>
            </GlassCard>
          ) : (
            <GlassCard elevation="inset" className="divide-y divide-white/6">
              {report.topCategories.map((category) => (
                <div key={category.name} className="flex items-center gap-3 p-4">
                  <span
                    className={cn("size-3 rounded-full", paletteBg[asPalette(category.gradient)])}
                    aria-hidden
                  />
                  <p className="flex-1 truncate text-body text-fg-1">{category.name}</p>
                  <p className="text-body text-fg-2 tabular-nums">
                    {formatMoney(category.amountMinor)}
                  </p>
                </div>
              ))}
            </GlassCard>
          )}
        </section>

        <ReportActions csvHref={csvHref} cardHref={cardHref} monthLabel={report.monthLabel} />
      </div>
    </div>
  );
}
