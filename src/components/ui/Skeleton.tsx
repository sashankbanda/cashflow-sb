import { cn } from "@/lib/cn";

/**
 * Shimmering placeholder block. Compose several to mirror the layout the real
 * content will occupy — every async surface has a designed skeleton.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative overflow-hidden rounded-md bg-glass-soft", className)}>
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-hairline to-transparent" />
    </div>
  );
}
