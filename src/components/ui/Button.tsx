import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant = "volt" | "glass" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  volt: "bg-volt text-on-volt shadow-glow-volt hover:brightness-105",
  glass: "glass text-fg-1 hover:brightness-115",
  ghost: "text-fg-2 hover:bg-glass-soft hover:text-fg-1",
  destructive: "bg-negative text-white shadow-glow-ember hover:brightness-110",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-4 text-footnote",
  md: "h-11 gap-2 px-5 text-body font-medium",
  lg: "h-14 gap-2 px-6 text-headline",
};

export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Stretch to the container width (primary CTAs on mobile). */
  block?: boolean;
}

/** Pill button. All variants share the 0.97 press-scale physicality. */
export function Button({
  variant = "glass",
  size = "md",
  loading = false,
  block = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-full select-none",
        "ease-out transition-[transform,filter,background-color,color] duration-150",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        variantClasses[variant],
        sizeClasses[size],
        block && "flex w-full",
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
}
