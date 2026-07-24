import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <EmptyState
        icon={<Compass />}
        palette="ocean"
        title="This page drifted away"
        description="The screen you're looking for doesn't exist or has moved."
        action={
          <Link
            href="/home"
            className="ease-out inline-flex h-11 items-center justify-center rounded-full bg-volt px-5 text-body font-medium text-on-volt shadow-glow-volt transition-transform duration-150 active:scale-[0.97]"
          >
            Back to Home
          </Link>
        }
      />
    </main>
  );
}
