/**
 * The one error/result shape that crosses the server boundary. Pure types —
 * imported by server wrappers and client hooks alike.
 */

export type AppErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL";

export interface ActionError {
  code: AppErrorCode;
  message: string;
  /** zod issue paths → messages, for inline form errors. */
  fieldErrors?: Record<string, string[]>;
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };
