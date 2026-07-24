import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AppError } from "./errors";
import type { RateLimiter } from "./ratelimit-memory";

/**
 * The one gate every mutation passes through:
 *   session → rate limit → zod parse → handler → typed result.
 * Pure factory (no Next.js imports) so the pipeline is unit-testable; the
 * production binding lives in server/action.ts.
 */

export interface ActionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface ActionContext {
  user: ActionUser;
  requestId: string;
}

export interface ActionLogger {
  info(payload: Record<string, unknown>, message: string): void;
  warn(payload: Record<string, unknown>, message: string): void;
  error(payload: Record<string, unknown>, message: string): void;
}

export interface ActionDeps {
  getUser: () => Promise<ActionUser | null>;
  logger: ActionLogger;
  newRequestId: () => string;
}

export interface ActionConfig<TSchema extends z.ZodType, TOutput> {
  /** Stable name for logs and rate-limit keys, e.g. "groups.create". */
  name: string;
  schema: TSchema;
  /** Per-user limiter; defaults to the shared mutation budget in action.ts. */
  limiter?: RateLimiter;
  handler: (args: { input: z.infer<TSchema>; ctx: ActionContext }) => Promise<TOutput>;
}

export function buildAuthedAction(deps: ActionDeps) {
  return function authedAction<TSchema extends z.ZodType, TOutput>(
    config: ActionConfig<TSchema, TOutput>,
  ): (input: unknown) => Promise<ActionResult<TOutput>> {
    return async (rawInput: unknown): Promise<ActionResult<TOutput>> => {
      const requestId = deps.newRequestId();
      const startedAt = Date.now();

      const user = await deps.getUser();
      if (!user) {
        return { ok: false, error: { code: "UNAUTHORIZED", message: "Sign in to continue." } };
      }

      if (config.limiter) {
        const { success } = await config.limiter.limit(`${config.name}:${user.id}`);
        if (!success) {
          deps.logger.warn(
            { requestId, userId: user.id, action: config.name },
            "action rate limited",
          );
          return {
            ok: false,
            error: { code: "RATE_LIMITED", message: "Too many requests — try again shortly." },
          };
        }
      }

      const parsed = config.schema.safeParse(rawInput);
      if (!parsed.success) {
        const flattened = z.flattenError(parsed.error);
        return {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "Please check the highlighted fields.",
            fieldErrors: flattened.fieldErrors as Record<string, string[]>,
          },
        };
      }

      try {
        const data = await config.handler({ input: parsed.data, ctx: { user, requestId } });
        deps.logger.info(
          {
            requestId,
            userId: user.id,
            action: config.name,
            durationMs: Date.now() - startedAt,
          },
          "action ok",
        );
        return { ok: true, data };
      } catch (error) {
        if (error instanceof AppError) {
          deps.logger.warn(
            { requestId, userId: user.id, action: config.name, code: error.code },
            error.message,
          );
          return {
            ok: false,
            error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors },
          };
        }
        deps.logger.error(
          {
            requestId,
            userId: user.id,
            action: config.name,
            err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          },
          "action failed",
        );
        return {
          ok: false,
          error: { code: "INTERNAL", message: "Something went wrong. Please try again." },
        };
      }
    };
  };
}
