"use client";

import { useState } from "react";
import { X, ZoomIn } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";

/**
 * Full-screen receipt viewer. Double-tap (or the zoom button) toggles a 2.5×
 * zoom; when zoomed, drag to pan. Escape / the close button dismisses.
 */
export function AttachmentViewer({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const toggleZoom = () => {
    setZoomed((current) => {
      if (current) setPan({ x: 0, y: 0 });
      return !current;
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim-strong"
      onClick={onClose}
    >
      <div className="absolute top-0 right-0 z-10 flex gap-2 p-4 pt-safe">
        <IconButton
          aria-label={zoomed ? "Reset zoom" : "Zoom in"}
          variant="glass"
          onClick={(event) => {
            event.stopPropagation();
            toggleZoom();
          }}
        >
          <ZoomIn />
        </IconButton>
        <IconButton
          aria-label="Close"
          variant="glass"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <X />
        </IconButton>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onClick={(event) => event.stopPropagation()}
        onDoubleClick={(event) => {
          event.stopPropagation();
          toggleZoom();
        }}
        onPointerDown={(event) => {
          if (!zoomed) return;
          setDrag({ x: event.clientX - pan.x, y: event.clientY - pan.y });
        }}
        onPointerMove={(event) => {
          if (!zoomed || !drag) return;
          setPan({ x: event.clientX - drag.x, y: event.clientY - drag.y });
        }}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
        className={cn(
          "max-h-[88vh] max-w-[92vw] touch-none object-contain transition-transform duration-200 select-none",
          zoomed ? "cursor-grab" : "cursor-zoom-in",
        )}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomed ? 2.5 : 1})`,
        }}
      />
    </div>
  );
}
