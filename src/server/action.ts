import "server-only";
import { randomUUID } from "node:crypto";
import { getSession } from "@/features/auth/session";
import { buildAuthedAction, type ActionConfig, type ActionUser } from "./action-core";
import { logger } from "./logger";
import { mutationLimiter } from "./ratelimit";
import type { ActionResult } from "@/lib/action-result";
import type { z } from "zod";

async function getUser(): Promise<ActionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
}

const bound = buildAuthedAction({
  getUser,
  logger,
  newRequestId: () => randomUUID(),
});

/**
 * Production authedAction: session → per-user rate limit (default 60/min)
 * → zod → handler → typed ActionResult. Handlers call revalidateTag/Path
 * themselves after successful writes.
 */
export function authedAction<TSchema extends z.ZodType, TOutput>(
  config: ActionConfig<TSchema, TOutput>,
): (input: unknown) => Promise<ActionResult<TOutput>> {
  return bound({ limiter: mutationLimiter, ...config });
}

export type { ActionContext, ActionUser } from "./action-core";
