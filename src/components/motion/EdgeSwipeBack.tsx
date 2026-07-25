"use client";

import { useRef, type ReactNode, type TouchEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useHaptics } from "@/hooks/useHaptics";

/** Dock roots don't pop — a back-swipe there would leave the app. */
const ROOT_TABS = new Set(["/home", "/groups", "/insights", "/profile"]);

const EDGE_PX = 24; // must start within this many px of the left edge
const ARM_PX = 10; // horizontal travel before we commit to the gesture
const TRIGGER_FRACTION = 0.32; // release past this fraction of the width → back

/**
 * The honest PWA stand-in for iOS edge-swipe-back: a left-edge drag that follows
 * the finger 1:1 and is interruptible. Past ~a third of the width (or a flick)
 * it pops; otherwise it springs back. Disabled on the dock roots and when the
 * user prefers reduced motion is irrelevant (this is navigation, not decoration).
 * The OS rubber-band physics can't be matched in a browser — logged in the report.
 */
export function EdgeSwipeBack({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const haptics = useHaptics();

  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const dx = useRef(0);
  const tracking = useRef(false);
  const armed = useRef(false);
  const passedTrigger = useRef(false);

  const canPop = !ROOT_TABS.has(pathname);

  const setTransform = (x: number, animate: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = animate ? "transform 200ms cubic-bezier(0.25,1,0.5,1)" : "none";
    el.style.transform = x > 0 ? `translateX(${x}px)` : "";
  };

  const onTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    tracking.current = false;
    armed.current = false;
    passedTrigger.current = false;
    if (!canPop || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (!touch || touch.clientX > EDGE_PX) return;
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    dx.current = 0;
    tracking.current = true;
  };

  const onTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!tracking.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    const mx = touch.clientX - startX.current;
    const my = touch.clientY - startY.current;

    if (!armed.current) {
      if (Math.abs(my) > Math.abs(mx) && Math.abs(my) > ARM_PX) {
        tracking.current = false; // it's a vertical scroll, not a back-swipe
        return;
      }
      if (mx > ARM_PX) {
        armed.current = true;
        if (ref.current) ref.current.style.willChange = "transform";
      } else {
        return;
      }
    }

    dx.current = Math.max(0, mx);
    setTransform(dx.current, false);

    const trigger = window.innerWidth * TRIGGER_FRACTION;
    if (!passedTrigger.current && dx.current > trigger) {
      passedTrigger.current = true;
      haptics.select(); // tactile confirm you've pulled far enough
    } else if (passedTrigger.current && dx.current <= trigger) {
      passedTrigger.current = false;
    }
  };

  const onTouchEnd = () => {
    if (!tracking.current || !armed.current) {
      tracking.current = false;
      return;
    }
    tracking.current = false;
    const el = ref.current;
    if (el) el.style.willChange = "";
    if (passedTrigger.current) {
      setTransform(window.innerWidth, true);
      router.back();
      // The previous screen replaces our subtree; clear the transform for it.
      window.setTimeout(() => setTransform(0, false), 260);
    } else {
      setTransform(0, true);
    }
  };

  return (
    <div ref={ref} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {children}
    </div>
  );
}
