"use client";

import { useId, type ComponentPropsWithRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldChromeProps {
  label?: string;
  error?: string;
  hint?: string;
}

export interface TextFieldProps extends ComponentPropsWithRef<"input">, FieldChromeProps {
  leading?: ReactNode;
  trailing?: ReactNode;
}

/** Single-line text input on a glass-soft field with label / hint / error. */
export function TextField({
  label,
  error,
  hint,
  leading,
  trailing,
  className,
  id: idProp,
  ...props
}: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-caption text-fg-3 uppercase">
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-sm glass-soft px-4",
          "transition-colors duration-150 focus-within:border-volt/60",
          error && "border-negative/60",
        )}
      >
        {leading ? <span className="text-fg-3 [&_svg]:size-4">{leading}</span> : null}
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-w-0 flex-1 bg-transparent text-body text-fg-1 outline-none placeholder:text-fg-3"
          {...props}
        />
        {trailing ? <span className="text-fg-3 [&_svg]:size-4">{trailing}</span> : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-footnote text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-footnote text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface TextAreaProps extends ComponentPropsWithRef<"textarea">, FieldChromeProps {}

/** Multi-line variant for notes. */
export function TextArea({ label, error, hint, className, id: idProp, ...props }: TextAreaProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={id} className="text-caption text-fg-3 uppercase">
          {label}
        </label>
      ) : null}
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "rounded-sm glass-soft px-4 py-3 text-body text-fg-1 outline-none placeholder:text-fg-3",
          "resize-none transition-colors duration-150 focus:border-volt/60",
          error && "border-negative/60",
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="text-footnote text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-footnote text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
