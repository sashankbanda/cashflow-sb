import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Palette } from "@/components/ui/palette";

export type WidgetSize = "sm" | "md" | "lg";

const sizeClasses: Record<WidgetSize, string> = {
  sm: "col-span-1 min-h-42",
  md: "col-span-2",
  lg: "col-span-2 min-h-52",
};

export interface WidgetProps {
  /** sm = 1×1 tile · md = full-width row · lg = full-width hero. */
  size?: WidgetSize;
  gradient?: Palette;
  glow?: boolean;
  /** Uppercase caption at the top of the widget. */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Widget anatomy shared by every dashboard tile: caption label row on top,
 * hero content below. Compose inside a WidgetGrid.
 */
export function Widget({ size = "sm", gradient, glow, label, children, className }: WidgetProps) {
  return (
    <GlassCard
      gradient={gradient}
      glow={glow}
      className={cn("flex flex-col p-5", sizeClasses[size], className)}
    >
      <p className={cn("text-caption uppercase", gradient ? "text-white/70" : "text-fg-3")}>
        {label}
      </p>
      <div className="flex min-h-0 flex-1 flex-col justify-end pt-3">{children}</div>
    </GlassCard>
  );
}

/** 2-column widget grid with token gaps. */
export function WidgetGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3", className)}>{children}</div>;
}
