"use client";

import { cn } from "@/lib/cn";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
  /** Associate with an external label element instead of aria-label. */
  "aria-labelledby"?: string;
  className?: string;
}

/** iOS-style switch. Volt when on. */
export function Toggle({ checked, onChange, disabled, className, ...aria }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "ease-out relative h-8 w-13 shrink-0 rounded-full p-0.5 transition-colors duration-250",
        "disabled:pointer-events-none disabled:opacity-40",
        checked ? "bg-volt" : "border border-glass-border bg-glass",
        className,
      )}
      {...aria}
    >
      <span
        aria-hidden
        className={cn(
          "ease-out block size-7 rounded-full bg-white shadow-ambient transition-transform duration-250",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
