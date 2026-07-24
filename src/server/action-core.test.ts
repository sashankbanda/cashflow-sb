import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { buildAuthedAction, type ActionDeps, type ActionUser } from "./action-core";
import { AppError, forbidden } from "./errors";
import { createMemoryLimiter } from "./ratelimit-memory";

const user: ActionUser = {
  id: "u1",
  name: "Dev User",
  email: "dev@cashflow.local",
  image: null,
};

function makeDeps(overrides: Partial<ActionDeps> = {}): ActionDeps & {
  logs: { warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
} {
  const warn = vi.fn();
  const error = vi.fn();
  return {
    getUser: () => Promise.resolve(user),
    logger: { info: vi.fn(), warn, error },
    newRequestId: () => "req-1",
    ...overrides,
    logs: { warn, error },
  };
}

const schema = z.object({ name: z.string().min(2) });

describe("authedAction pipeline", () => {
  it("returns UNAUTHORIZED without a session", async () => {
    const deps = makeDeps({ getUser: () => Promise.resolve(null) });
    const action = buildAuthedAction(deps)({
      name: "test.noop",
      schema,
      handler: async () => "never",
    });
    const result = await action({ name: "ok" });
    expect(result).toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Sign in to continue." },
    });
  });

  it("returns VALIDATION with field paths on bad input", async () => {
    const deps = makeDeps();
    const action = buildAuthedAction(deps)({
      name: "test.validate",
      schema,
      handler: async () => "never",
    });
    const result = await action({ name: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION");
      expect(result.error.fieldErrors?.name?.[0]).toBeTruthy();
    }
  });

  it("returns RATE_LIMITED once the window is exhausted", async () => {
    const deps = makeDeps();
    const action = buildAuthedAction(deps)({
      name: "test.limited",
      schema,
      limiter: createMemoryLimiter(1, 60),
      handler: async () => "done",
    });
    expect((await action({ name: "ok" })).ok).toBe(true);
    const second = await action({ name: "ok" });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("RATE_LIMITED");
    expect(deps.logs.warn).toHaveBeenCalled();
  });

  it("maps a thrown AppError to its typed code", async () => {
    const deps = makeDeps();
    const action = buildAuthedAction(deps)({
      name: "test.forbidden",
      schema,
      handler: async () => {
        throw forbidden("Members only.");
      },
    });
    const result = await action({ name: "ok" });
    expect(result).toEqual({
      ok: false,
      error: { code: "FORBIDDEN", message: "Members only.", fieldErrors: undefined },
    });
  });

  it("surfaces AppError fieldErrors", async () => {
    const deps = makeDeps();
    const action = buildAuthedAction(deps)({
      name: "test.appvalidation",
      schema,
      handler: async () => {
        throw new AppError("VALIDATION", "Split doesn't add up.", {
          fieldErrors: { amount: ["₹120 left to assign"] },
        });
      },
    });
    const result = await action({ name: "ok" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.fieldErrors?.amount?.[0]).toBe("₹120 left to assign");
  });

  it("hides unknown errors behind INTERNAL and logs them", async () => {
    const deps = makeDeps();
    const action = buildAuthedAction(deps)({
      name: "test.boom",
      schema,
      handler: async () => {
        throw new Error("db exploded");
      },
    });
    const result = await action({ name: "ok" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INTERNAL");
      expect(result.error.message).not.toContain("db exploded");
    }
    expect(deps.logs.error).toHaveBeenCalledTimes(1);
  });

  it("returns handler data on success with parsed input and context", async () => {
    const deps = makeDeps();
    const action = buildAuthedAction(deps)({
      name: "test.echo",
      schema,
      handler: async ({ input, ctx }) => ({ echoed: input.name, by: ctx.user.id }),
    });
    const result = await action({ name: "Goa trip" });
    expect(result).toEqual({ ok: true, data: { echoed: "Goa trip", by: "u1" } });
  });
});

describe("memory limiter", () => {
  it("frees the window after it elapses", async () => {
    vi.useFakeTimers();
    const limiter = createMemoryLimiter(1, 1);
    expect((await limiter.limit("k")).success).toBe(true);
    expect((await limiter.limit("k")).success).toBe(false);
    vi.advanceTimersByTime(1100);
    expect((await limiter.limit("k")).success).toBe(true);
    vi.useRealTimers();
  });
});
