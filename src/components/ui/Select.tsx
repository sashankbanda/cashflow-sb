"use client";

import { useId, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSheet } from "@/hooks/useSheet";
import { Sheet } from "./Sheet";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  description?: string;
}

export interface SelectProps<T extends string> {
  options: ReadonlyArray<SelectOption<T>>;
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  sheetTitle: string;
  className?: string;
}

/** Sheet-based select: the mobile-native alternative to a dropdown. */
export function Select<T extends string>({
  options,
  value,
  onChange,
  label,
  placeholder = "Select…",
  sheetTitle,
  className,
}: SelectProps<T>) {
  const sheet = useSheet();
  const id = useId();
  const selected = options.find((option) => option.value === value);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-caption text-fg-3 uppercase">
          {label}
        </label>
      ) : null}
      <button
        id={id}
        type="button"
        onClick={sheet.open}
        aria-haspopup="dialog"
        className={cn(
          "flex h-12 items-center justify-between gap-2.5 rounded-sm glass-soft px-4",
          "text-left transition-colors duration-150 active:bg-glass",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {selected?.icon ? (
            <span className="shrink-0 text-fg-2 [&_svg]:size-4">{selected.icon}</span>
          ) : null}
          <span className={cn("truncate text-body", selected ? "text-fg-1" : "text-fg-3")}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-fg-3" />
      </button>

      <Sheet open={sheet.isOpen} onClose={sheet.close} title={sheetTitle}>
        <ul className="flex flex-col gap-1" role="listbox" aria-label={sheetTitle}>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    sheet.close();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-4 py-3.5 text-left",
                    "transition-colors duration-150 active:bg-glass",
                    isSelected ? "bg-glass-soft" : "hover:bg-glass-soft",
                  )}
                >
                  {option.icon ? (
                    <span className="shrink-0 text-fg-2 [&_svg]:size-5">{option.icon}</span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body text-fg-1">{option.label}</span>
                    {option.description ? (
                      <span className="block truncate text-footnote text-fg-3">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                  {isSelected ? <Check className="size-5 shrink-0 text-volt" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}
