import { cn } from "@/lib/cn";

/** Whisper-quiet hairline separator (6% white). */
export function Divider({ className }: { className?: string }) {
  return <hr className={cn("h-px border-0 bg-hairline", className)} />;
}
