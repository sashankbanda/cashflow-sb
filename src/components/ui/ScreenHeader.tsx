"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ScreenHeaderProps {
  title: string;
  /** Small line above the title (e.g. greeting). */
  eyebrow?: string;
  /** Trailing header actions (IconButtons). */
  trailing?: ReactNode;
  /** Renders a chevron next to the title and makes it tappable (context switch). */
  onTitlePress?: () => void;
  className?: string;
}

/** Tracks whether the large title has scrolled out, via an IO sentinel. */
function useCollapsed(sentinel: React.RefObject<HTMLDivElement | null>): boolean {
  const collapsedRef = useRef(false);
  const listenersRef = useRef(new Set<() => void>());

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const next = entry ? !entry.isIntersecting : false;
        if (next !== collapsedRef.current) {
          collapsedRef.current = next;
          listenersRef.current.forEach((listener) => listener());
        }
      },
      // The intersection region starts below the compact bar (h-12 = 48px):
      // once the sentinel slips under it, the bar fades in.
      { rootMargin: "-48px 0px 0px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sentinel]);

  return useSyncExternalStore(
    (listener) => {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    },
    () => collapsedRef.current,
    () => false,
  );
}

/**
 * iOS-style large title header. When the large title scrolls away, a compact
 * blurred bar fades in at the top with the same title.
 */
export function ScreenHeader({
  title,
  eyebrow,
  trailing,
  onTitlePress,
  className,
}: ScreenHeaderProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const collapsed = useCollapsed(sentinelRef);

  const titleContent = (
    <span className="inline-flex items-center gap-1.5">
      {title}
      {onTitlePress ? <ChevronDown className="size-5 text-fg-3" /> : null}
    </span>
  );

  return (
    <>
      <div
        aria-hidden={!collapsed}
        className={cn(
          "fixed inset-x-0 top-0 z-30 border-b border-white/6 bg-canvas/70 pt-safe backdrop-blur-lg",
          "transition-opacity duration-250",
          collapsed ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div className="mx-auto flex h-12 max-w-md items-center justify-center px-5">
          <p className="text-headline">{title}</p>
        </div>
      </div>

      <header className={cn("flex items-end justify-between gap-3 px-5 pt-safe", className)}>
        <div className="pt-4">
          {eyebrow ? <p className="text-footnote text-fg-3">{eyebrow}</p> : null}
          {onTitlePress ? (
            <button
              type="button"
              onClick={onTitlePress}
              className="text-title-1 transition-opacity duration-150 active:opacity-70"
            >
              {titleContent}
            </button>
          ) : (
            <h1 className="text-title-1">{titleContent}</h1>
          )}
        </div>
        {trailing ? <div className="flex shrink-0 items-center gap-2 pt-4">{trailing}</div> : null}
      </header>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
    </>
  );
}
