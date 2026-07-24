"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/hooks/useHaptics";

const THRESHOLD_PX = 80;
const MAX_PULL_PX = 120;

/**
 * iOS-style pull-to-refresh for the app shell: drag down from the top of a
 * screen to re-fetch its server data (router.refresh in a transition).
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const haptics = useHaptics();
  const [isPending, startTransition] = useTransition();
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const firedRef = useRef(false);

  const onTouchStart = (event: React.TouchEvent) => {
    if (window.scrollY <= 0) {
      startY.current = event.touches[0]?.clientY ?? null;
      firedRef.current = false;
    } else {
      startY.current = null;
    }
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (startY.current === null || window.scrollY > 0) return;
    const currentY = event.touches[0]?.clientY ?? 0;
    const delta = currentY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    const damped = Math.min(delta * 0.45, MAX_PULL_PX);
    if (damped >= THRESHOLD_PX && !firedRef.current) {
      firedRef.current = true;
      haptics.select();
    }
    setPull(damped);
  };

  const onTouchEnd = () => {
    if (pull >= THRESHOLD_PX) {
      startTransition(() => router.refresh());
    }
    setPull(0);
    startY.current = null;
  };

  const visible = pull > 8 || isPending;
  const progress = Math.min(pull / THRESHOLD_PX, 1);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        aria-hidden={!isPending}
        role="status"
        aria-label={isPending ? "Refreshing" : undefined}
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center pt-safe",
          "transition-opacity duration-150",
          visible ? "opacity-100" : "opacity-0",
        )}
        style={{ transform: `translateY(${isPending ? 24 : Math.max(pull * 0.4, 0)}px)` }}
      >
        <span className="mt-3 flex size-9 items-center justify-center rounded-full glass-floating">
          <RefreshCw
            className={cn("size-4 text-fg-2", isPending && "animate-spin")}
            style={isPending ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          />
        </span>
      </div>
      {children}
    </div>
  );
}
