// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ActionResult } from "@/lib/action-result";
import { useAction } from "./useAction";

// The Toast module pulls in motion/portals; stub it — we assert on state, not UI.
vi.mock("@/components/ui/Toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

/** Reducer under test: drop the value 2 from the list. */
const dropTwo = (current: number[]) => current.filter((n) => n !== 2);

describe("useAction — optimistic overlay", () => {
  it("reverts to the base state when the action FAILS (never keeps a failed value)", async () => {
    const failing = (): Promise<ActionResult<{ ok: true }>> =>
      Promise.resolve({ ok: false, error: { code: "INTERNAL", message: "boom" } });

    const { result } = renderHook(() =>
      useAction(failing, {
        errorToast: false,
        optimistic: { state: [1, 2, 3], apply: dropTwo },
      }),
    );

    expect(result.current.optimisticState).toEqual([1, 2, 3]);

    await act(async () => {
      await result.current.execute(undefined);
    });

    // Failed → React discards the overlay → base restored, NOT [1,3]. A money
    // app must never silently keep a failed optimistic value.
    expect(result.current.optimisticState).toEqual([1, 2, 3]);
  });

  it("applies the overlay while in flight, then hands back to base on success", async () => {
    let settle: ((r: ActionResult<{ ok: true }>) => void) | null = null;
    const deferred = (): Promise<ActionResult<{ ok: true }>> =>
      new Promise((resolve) => {
        settle = resolve;
      });

    const { result } = renderHook(() =>
      useAction(deferred, {
        errorToast: false,
        optimistic: { state: [1, 2, 3], apply: dropTwo },
      }),
    );

    act(() => {
      void result.current.execute(undefined);
    });

    // Overlay applied immediately (2 removed) while pending.
    await waitFor(() => expect(result.current.optimisticState).toEqual([1, 3]));
    expect(result.current.pending).toBe(true);

    await act(async () => {
      settle?.({ ok: true, data: { ok: true } });
    });

    await waitFor(() => expect(result.current.pending).toBe(false));
    // Settled → overlay discarded; base shows until the real revalidation lands.
    expect(result.current.optimisticState).toEqual([1, 2, 3]);
  });

  it("does not apply any overlay when optimistic is false", async () => {
    const ok = (): Promise<ActionResult<{ ok: true }>> =>
      Promise.resolve({ ok: true, data: { ok: true } });

    const { result } = renderHook(() => useAction(ok, { optimistic: false }));

    expect(result.current.optimisticState).toBeUndefined();
    await act(async () => {
      await result.current.execute(undefined);
    });
    expect(result.current.optimisticState).toBeUndefined();
  });
});
