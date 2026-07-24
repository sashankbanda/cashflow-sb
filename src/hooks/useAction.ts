"use client";

import { useCallback, useState } from "react";
import type { ActionResult } from "@/lib/action-result";
import { toast } from "@/components/ui/Toast";

export interface UseActionOptions<TOutput> {
  onSuccess?: (data: TOutput) => void;
  onError?: (message: string) => void;
  /** Toast shown on success. */
  successMessage?: string;
  /** Show an error toast for non-validation failures (default true). */
  errorToast?: boolean;
}

export interface UseActionState<TInput, TOutput> {
  execute: (input: TInput) => Promise<ActionResult<TOutput>>;
  pending: boolean;
  fieldErrors: Record<string, string[]>;
  /** First error for a field, for inline display. */
  fieldError: (field: string) => string | undefined;
  reset: () => void;
}

/**
 * Client companion to authedAction: pending state, inline field errors for
 * VALIDATION failures, toasts for everything else.
 */
export function useAction<TInput, TOutput>(
  action: (input: TInput) => Promise<ActionResult<TOutput>>,
  options: UseActionOptions<TOutput> = {},
): UseActionState<TInput, TOutput> {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const execute = useCallback(
    async (input: TInput): Promise<ActionResult<TOutput>> => {
      setPending(true);
      setFieldErrors({});
      try {
        const result = await action(input);
        if (result.ok) {
          if (options.successMessage) toast.success(options.successMessage);
          options.onSuccess?.(result.data);
        } else {
          if (result.error.code === "VALIDATION" && result.error.fieldErrors) {
            setFieldErrors(result.error.fieldErrors);
          }
          if (options.errorToast !== false && result.error.code !== "VALIDATION") {
            toast.error(result.error.message);
          }
          options.onError?.(result.error.message);
        }
        return result;
      } catch {
        const message = "Couldn't reach the server. Check your connection.";
        if (options.errorToast !== false) toast.error(message);
        options.onError?.(message);
        return { ok: false, error: { code: "INTERNAL", message } };
      } finally {
        setPending(false);
      }
    },
    [action, options],
  );

  const fieldError = useCallback((field: string) => fieldErrors[field]?.[0], [fieldErrors]);

  const reset = useCallback(() => setFieldErrors({}), []);

  return { execute, pending, fieldErrors, fieldError, reset };
}
