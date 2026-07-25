import { Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Palette } from "@/components/ui/palette";
import { cn } from "@/lib/cn";

export interface InsightCardProps {
  /** One plain-language sentence, e.g. "Food is up 32% vs last month." */
  text: string;
  palette?: Palette;
  className?: string;
}

/** Gradient one-liner: the app noticing something for you. */
export function InsightCard({ text, palette = "iris", className }: InsightCardProps) {
  return (
    <GlassCard gradient={palette} glow className={cn("flex items-center gap-3 p-5", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-line-2">
        <Sparkles className="size-4 text-white" />
      </span>
      <p className="text-body font-medium text-white">{text}</p>
    </GlassCard>
  );
}
