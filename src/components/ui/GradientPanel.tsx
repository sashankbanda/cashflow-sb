import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";
import { paletteBg, paletteGlow, type Palette } from "./palette";

export interface GradientPanelProps extends ComponentPropsWithRef<"div"> {
  palette: Palette;
  glow?: boolean;
}

/**
 * A saturated gradient surface (widget hero panels, group covers). Text inside
 * defaults to white; keep secondary text on the dark half of the gradient.
 */
export function GradientPanel({
  palette,
  glow = true,
  className,
  children,
  ...props
}: GradientPanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line text-white",
        paletteBg[palette],
        glow && paletteGlow[palette],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
