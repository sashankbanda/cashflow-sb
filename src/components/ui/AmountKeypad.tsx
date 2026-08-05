"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/hooks/useHaptics";
import { applyKeypadKey, type KeypadKey } from "@/lib/amount-input";

const KEYS: ReadonlyArray<KeypadKey> = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  ".",
  "0",
  "backspace",
];

export interface AmountKeypadProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * In-app numeric keypad — amounts never use the OS keyboard. Pure controlled
 * component over the lib/amount-input draft model.
 */
export function AmountKeypad({ value, onChange, className }: AmountKeypadProps) {
  const haptics = useHaptics();

  return (
    <div
      className={cn("grid grid-cols-3 gap-1.5", className)}
      role="group"
      aria-label="Amount keypad"
    >
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-label={
            key === "backspace" ? "Delete last digit" : key === "." ? "Decimal point" : key
          }
          // Haptic fires on pointer-DOWN so the tick lands with the touch,
          // not after the click resolves; the value updates on click.
          onPointerDown={() => haptics.tap()}
          onClick={() => onChange(applyKeypadKey(value, key))}
          className={cn(
            "flex h-16 items-center justify-center rounded-lg select-none",
            "font-dot text-title-1 font-semibold text-fg-1 tabular-nums",
            "ease-out transition-[background-color,transform] duration-100",
            "glass-soft hover:bg-glass active:scale-[0.94] active:bg-glass",
          )}
        >
          {key === "backspace" ? <Delete className="size-7 text-fg-2" /> : key}
        </button>
      ))}
    </div>
  );
}
