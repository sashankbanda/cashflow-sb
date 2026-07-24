/** Rate limiter contract + in-process fallback. No environment dependency. */

export interface RateLimiter {
  /** Returns success=false when the key has exhausted its window. */
  limit(key: string): Promise<{ success: boolean }>;
}

/**
 * Sliding-window limiter over an in-process map — the development fallback
 * when Upstash credentials are absent. Not shared across instances, which is
 * exactly right for local dev and wrong for production (use Upstash there).
 */
export function createMemoryLimiter(limit: number, windowSeconds: number): RateLimiter {
  const hits = new Map<string, number[]>();
  const windowMs = windowSeconds * 1000;
  return {
    limit(key: string): Promise<{ success: boolean }> {
      const now = Date.now();
      const timestamps = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
      if (timestamps.length >= limit) {
        hits.set(key, timestamps);
        return Promise.resolve({ success: false });
      }
      timestamps.push(now);
      hits.set(key, timestamps);
      return Promise.resolve({ success: true });
    },
  };
}
