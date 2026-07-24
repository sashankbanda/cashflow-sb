"use client";

import { useEffect } from "react";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced to the console until the observability phase wires Sentry.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <EmptyState
        icon={<CloudOff />}
        palette="ember"
        title="Something went wrong"
        description="An unexpected error interrupted this screen. Your data is safe."
        action={
          <Button variant="volt" onClick={reset}>
            Try again
          </Button>
        }
      />
    </main>
  );
}
