import Link from "next/link";

/**
 * Interim root screen. Replaced by the marketing/auth entry flow in Phase 6;
 * until then it presents the wordmark and, in development, the dev galleries.
 */
export default function RootPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 pt-safe pb-safe">
      <div className="text-center">
        <p className="font-dot text-display font-black text-volt tabular-nums">09:41</p>
        <h1 className="mt-4 text-title-1">Cashflow</h1>
        <p className="mt-1 text-body text-fg-2">
          Group expenses and personal finance, settled beautifully.
        </p>
      </div>
      {process.env.NODE_ENV === "development" ? (
        <nav className="flex flex-col items-stretch gap-2 rounded-lg glass p-2">
          <Link
            href="/dev/tokens"
            className="rounded-sm px-5 py-3 text-headline text-fg-1 transition-colors duration-150 hover:bg-glass"
          >
            Design tokens →
          </Link>
          <Link
            href="/dev/kit"
            className="rounded-sm px-5 py-3 text-headline text-fg-1 transition-colors duration-150 hover:bg-glass"
          >
            Component kit →
          </Link>
        </nav>
      ) : null}
    </main>
  );
}
