import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "volt" | "glass" | "negative" | "positive";

const variantClasses: Record<BadgeVariant, string> = {
  volt: "bg-volt text-on-volt",
  glass: "bg-glass text-fg-2 border border-glass-border",
  negative: "bg-negative text-white",
  positive: "bg-mint-3 text-mint-1 border border-mint-2/30",
};

export interface BadgeProps extends ComponentPropsWithRef<"span"> {
  variant?: BadgeVariant;
}

/** Small status/count pill: unread counts, "pending", "settled". */
export function Badge({ variant = "glass", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-caption font-semibold",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
