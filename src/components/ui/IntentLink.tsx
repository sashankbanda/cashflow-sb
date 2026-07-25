"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";

type IntentLinkProps = LinkProps &
  Omit<ComponentPropsWithoutRef<"a">, keyof LinkProps> & { children: ReactNode };

/**
 * A `next/link` that also warms the route on `pointerdown` — before the tap
 * even completes. On touch there is no hover to trigger the default prefetch,
 * so priming on press-start is what makes navigation feel instant. Layered on
 * top of Link's own viewport prefetch, so it only ever helps.
 */
export const IntentLink = forwardRef<HTMLAnchorElement, IntentLinkProps>(function IntentLink(
  { href, onPointerDown, ...props },
  ref,
) {
  const router = useRouter();
  return (
    <Link
      ref={ref}
      href={href}
      onPointerDown={(event) => {
        if (typeof href === "string") router.prefetch(href);
        onPointerDown?.(event);
      }}
      {...props}
    />
  );
});
