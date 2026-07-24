import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Public landing. Grows into the marketing entry with auth CTAs; until the
 * authentication phase it links straight into the app shell.
 */
export default function RootPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-5 pt-safe pb-safe">
      <div className="text-center">
        <p className="font-dot text-display font-black text-volt tabular-nums">09:41</p>
        <h1 className="mt-4 text-title-1">Cashflow</h1>
        <p className="mt-1 text-body text-fg-2">
          Group expenses and personal finance, settled beautifully.
        </p>
      </div>
      <Link
        href="/home"
        className="ease-out inline-flex h-14 items-center justify-center gap-2 rounded-full bg-volt px-8 text-headline text-on-volt shadow-glow-volt transition-transform duration-150 active:scale-[0.97]"
      >
        Open Cashflow <ArrowRight className="size-5" />
      </Link>
      {process.env.NODE_ENV === "development" ? (
        <nav className="flex gap-4">
          <Link href="/dev/tokens" className="text-footnote text-fg-3 hover:text-fg-2">
            Design tokens
          </Link>
          <Link href="/dev/kit" className="text-footnote text-fg-3 hover:text-fg-2">
            Component kit
          </Link>
        </nav>
      ) : null}
    </main>
  );
}
