"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { useMounted } from "@/hooks/useMounted";
import { blurhashToDataUrl } from "@/lib/image-client";

export function BlurImage({
  src,
  blurhash,
  alt,
  className,
}: {
  src: string;
  blurhash: string | null;
  alt: string;
  className?: string;
}) {
  const mounted = useMounted();
  const [loaded, setLoaded] = useState(false);
  const placeholder = useMemo(
    () => (mounted && blurhash ? blurhashToDataUrl(blurhash) : null),
    [mounted, blurhash],
  );

  return (
    <span
      className={cn("relative block overflow-hidden bg-glass-soft", className)}
      style={
        placeholder
          ? { backgroundImage: `url(${placeholder})`, backgroundSize: "cover" }
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs, not static assets */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={cn(
          "size-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </span>
  );
}
