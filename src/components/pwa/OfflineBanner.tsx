"use client";

import { WifiOff } from "lucide-react";
import { useOnline } from "@/hooks/useOnline";

/** Slim banner shown while offline; expenses added meanwhile queue and sync. */
export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-warning py-1.5 text-caption font-medium text-on-volt"
    >
      <WifiOff className="size-3.5" /> Offline — changes will sync when you reconnect
    </div>
  );
}
