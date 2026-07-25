import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";
import { paletteBg, paletteGlow, type Palette } from "./palette";

type Elevation = "inset" | "raised" | "floating";

const elevationClasses: Record<Elevation, string> = {
  inset: "glass-soft",
  raised: "glass",
  floating: "glass-floating",
};

export interface GlassCardProps extends ComponentPropsWithRef<"div"> {
  /** E1 inset · E2 raised (default) · E3 floating. Ignored when gradient is set. */
  elevation?: Elevation;
  /** Render as a gradient panel instead of frosted glass. */
  gradient?: Palette;
  /** Add the palette-matched glow shadow (gradient panels only). */
  glow?: boolean;
}

/**
 * The base surface of the design system. Every card, widget, and panel in the
 * app is a GlassCard; radius defaults to `rounded-lg` (28px) and can be
 * overridden via className.
 */
export function GlassCard({
  elevation = "raised",
  gradient,
  glow = false,
  className,
  children,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg",
        gradient
          ? cn(
              paletteBg[gradient],
              "border border-line text-white",
              glow && paletteGlow[gradient],
            )
          : elevationClasses[elevation],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
