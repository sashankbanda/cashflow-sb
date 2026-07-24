"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/cn";
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
  const press = (key: KeypadKey) => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(3);
    }
    onChange(applyKeypadKey(value, key));
  };

  return (
    <div
      className={cn("grid grid-cols-3 gap-1", className)}
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
          onClick={() => press(key)}
          className={cn(
            "flex h-14 items-center justify-center rounded-md text-title-2 text-fg-1 select-none",
            "ease-out transition-[background-color,transform] duration-150",
            "hover:bg-glass-soft active:scale-[0.97] active:bg-glass",
          )}
        >
          {key === "backspace" ? <Delete className="size-6 text-fg-2" /> : key}
        </button>
      ))}
    </div>
  );
}
