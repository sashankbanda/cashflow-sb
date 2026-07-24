import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";

type IconButtonVariant = "glass" | "ghost" | "volt";
type IconButtonSize = "sm" | "md";

const variantClasses: Record<IconButtonVariant, string> = {
  glass: "glass text-fg-2 hover:text-fg-1 hover:brightness-115",
  ghost: "text-fg-2 hover:bg-glass-soft hover:text-fg-1",
  volt: "bg-volt text-on-volt shadow-glow-volt hover:brightness-105",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "size-9 [&_svg]:size-4",
  md: "size-11 [&_svg]:size-5",
};

export interface IconButtonProps extends ComponentPropsWithRef<"button"> {
  /** Accessible name — icon-only controls must always be labelled. */
  "aria-label": string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

/** Circular icon-only button (header trailing actions, row affordances). */
export function IconButton({
  variant = "glass",
  size = "md",
  className,
  children,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-full select-none",
        "ease-out transition-[transform,filter,background-color,color] duration-150",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
