import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { env } from "@/env";
import { createMemoryLimiter, type RateLimiter } from "./ratelimit-memory";

export type { RateLimiter } from "./ratelimit-memory";

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

/** Named sliding-window limiter: Upstash when configured, memory otherwise. */
export function createRateLimiter(name: string, limit: number, windowSeconds: number): RateLimiter {
  if (redis) {
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `rl:${name}`,
    });
    return {
      async limit(key: string) {
        const { success } = await limiter.limit(key);
        return { success };
      },
    };
  }
  return createMemoryLimiter(limit, windowSeconds);
}

/** Default per-user budget for mutations: 60/min. */
export const mutationLimiter = createRateLimiter("mutation", 60, 60);

/** Public token lookups (invite links): 10/min per IP. */
export const inviteLookupLimiter = createRateLimiter("invite-lookup", 10, 60);

/** Receipt uploads: 30/min per user (route handler, outside authedAction). */
export const uploadLimiter = createRateLimiter("upload", 30, 60);
