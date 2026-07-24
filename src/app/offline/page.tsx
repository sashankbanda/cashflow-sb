import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl glass text-fg-2">
        <WifiOff className="size-7" />
      </span>
      <div className="space-y-1">
        <h1 className="text-title-2 text-fg-1">You&apos;re offline</h1>
        <p className="text-body text-fg-3">
          Cashflow will pick up where you left off once you&apos;re back online. Expenses you add
          offline are saved and sync automatically.
        </p>
      </div>
    </div>
  );
}
