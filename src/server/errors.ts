import type { AppErrorCode } from "@/lib/action-result";

/**
 * The only error class services throw across the action boundary. Anything
 * else is treated as INTERNAL and logged with its request id.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: AppErrorCode,
    message: string,
    options?: { fieldErrors?: Record<string, string[]>; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
  }
}

export const unauthorized = (): AppError => new AppError("UNAUTHORIZED", "Sign in to continue.");

export const forbidden = (message = "You don't have access to this."): AppError =>
  new AppError("FORBIDDEN", message);

export const notFound = (entity = "Resource"): AppError =>
  new AppError("NOT_FOUND", `${entity} not found.`);

export const conflict = (message: string): AppError => new AppError("CONFLICT", message);

export const validationError = (
  message: string,
  fieldErrors?: Record<string, string[]>,
): AppError => new AppError("VALIDATION", message, { fieldErrors });
