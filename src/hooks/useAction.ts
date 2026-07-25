"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";
import { toast } from "@/components/ui/Toast";

export interface OptimisticConfig<TInput, TState> {
  /** Current server state the optimistic overlay is applied on top of. */
  state: TState;
  /** Derive the optimistic state from the in-flight input. */
  apply: (current: TState, input: TInput) => TState;
}

export interface UseActionOptions<TInput, TOutput, TState = unknown> {
  onSuccess?: (data: TOutput) => void;
  onError?: (message: string) => void;
  /** Toast shown on success. */
  successMessage?: string;
  /** Show an error toast for non-validation failures (default true). */
  errorToast?: boolean;
  /**
   * Opt in to optimistic UI. `state` is overlaid with `apply(state, input)` the
   * instant `execute` is called and automatically reverts to `state` if the
   * action fails — or hands off seamlessly when the server revalidation supplies
   * matching fresh state. This is the ONE optimistic path: call sites pass their
   * base state + reducer; the hook owns apply → await → reconcile/revert.
   */
  optimistic?: OptimisticConfig<TInput, TState>;
}

export interface UseActionState<TInput, TOutput, TState = unknown> {
  execute: (input: TInput) => Promise<ActionResult<TOutput>>;
  pending: boolean;
  /** Optimistic-overlaid state; equals the base state when nothing is in flight. */
  optimisticState: TState;
  fieldErrors: Record<string, string[]>;
  /** First error for a field, for inline display. */
  fieldError: (field: string) => string | undefined;
  reset: () => void;
}

/**
 * Client companion to authedAction: pending state, inline field errors for
 * VALIDATION failures, toasts for everything else, and opt-in optimistic UI.
 */
export function useAction<TInput, TOutput, TState = unknown>(
  action: (input: TInput) => Promise<ActionResult<TOutput>>,
  options: UseActionOptions<TInput, TOutput, TState> = {},
): UseActionState<TInput, TOutput, TState> {
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isTransitionPending, startTransition] = useTransition();

  const [optimisticState, addOptimistic] = useOptimistic<TState, TInput>(
    options.optimistic?.state as TState,
    (current, input) => (options.optimistic ? options.optimistic.apply(current, input) : current),
  );

  const run = useCallback(
    async (input: TInput): Promise<ActionResult<TOutput>> => {
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
      }
    },
    [action, options],
  );

  const execute = useCallback(
    (input: TInput): Promise<ActionResult<TOutput>> => {
      // Optimistic path: apply the overlay inside a transition (required by
      // useOptimistic). React discards the overlay when the action settles and
      // the base state re-renders — revert on failure, hand off on success.
      if (options.optimistic) {
        return new Promise<ActionResult<TOutput>>((resolve) => {
          startTransition(async () => {
            addOptimistic(input);
            resolve(await run(input));
          });
        });
      }
      // Default path: imperative pending flag, unchanged from before.
      setPending(true);
      return run(input).finally(() => setPending(false));
    },
    [options, run, addOptimistic],
  );

  const fieldError = useCallback((field: string) => fieldErrors[field]?.[0], [fieldErrors]);
  const reset = useCallback(() => setFieldErrors({}), []);

  return {
    execute,
    pending: pending || isTransitionPending,
    optimisticState,
    fieldErrors,
    fieldError,
    reset,
  };
}
