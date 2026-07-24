import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { paletteBg, paletteGlow, type Palette } from "./palette";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Icon or emoji rendered inside the gradient orb. */
  icon?: ReactNode;
  palette?: Palette;
  /** Call to action, e.g. a Button. */
  action?: ReactNode;
  className?: string;
}

/** Designed empty state: gradient orb, one-liner, optional CTA. */
export function EmptyState({
  title,
  description,
  icon,
  palette = "iris",
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-5 px-6 py-12 text-center", className)}>
      <div
        aria-hidden
        className={cn(
          "flex size-20 items-center justify-center rounded-full text-white [&_svg]:size-8",
          paletteBg[palette],
          paletteGlow[palette],
        )}
      >
        {icon}
      </div>
      <div className="space-y-1">
        <h3 className="text-headline">{title}</h3>
        {description ? <p className="text-footnote text-fg-3">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
