import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ChipProps extends ComponentPropsWithRef<"button"> {
  selected?: boolean;
  /** Leading adornment: an icon or emoji. */
  icon?: ReactNode;
}

/**
 * Selectable pill for filters, categories, and periods. Selection state is
 * exposed via aria-pressed.
 */
export function Chip({
  selected = false,
  icon,
  className,
  children,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-footnote select-none",
        "ease-out transition-[transform,background-color,color,box-shadow] duration-150",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        selected ? "bg-volt text-on-volt shadow-glow-volt" : "glass-soft text-fg-2 hover:text-fg-1",
        className,
      )}
      {...props}
    >
      {icon ? <span className="inline-flex items-center [&_svg]:size-4">{icon}</span> : null}
      {children}
    </button>
  );
}
