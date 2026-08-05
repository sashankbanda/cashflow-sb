import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BatteryFull,
  ShieldCheck,
  Signal,
  Sparkles,
  Users,
  WalletMinimal,
  Wifi,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ActivityRow } from "@/components/widgets/ActivityRow";
import { MonthSpendWidget } from "@/components/widgets/MonthSpendWidget";
import { NetBalanceWidget } from "@/components/widgets/NetBalanceWidget";
import { OwedWidget } from "@/components/widgets/OwedWidget";
import { WidgetGrid } from "@/components/widgets/Widget";

/** Sample daily-spend series for the preview sparkline (relative values only). */
const PREVIEW_TREND = [420, 380, 510, 300, 260, 640, 720, 480, 390, 550, 610, 430, 500, 470];

const FEATURES: ReadonlyArray<{
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    icon: Users,
    title: "Any group, instantly",
    body: "Trips, flatmates, dinners. Add people even before they join with ghost members.",
  },
  {
    icon: Sparkles,
    title: "Exact-paise splitting",
    body: "Largest-remainder math means every rupee lands — even, by shares, or exact amounts.",
  },
  {
    icon: WalletMinimal,
    title: "Personal finance, built in",
    body: "Budgets, recurring bills, and monthly insights sit right beside your shared spend.",
  },
  {
    icon: ShieldCheck,
    title: "Yours, and private",
    body: "Google sign-in, your data stays yours, and you can export everything anytime.",
  },
];

const VOLT_PILL =
  "ease-out inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-volt px-8 text-headline text-on-volt shadow-glow-volt transition-transform duration-150 active:scale-[0.97]";

/** A peek at the real Home dashboard, framed as a phone screen. */
function ProductPreview() {
  return (
    <div className="rounded-2xl border border-line bg-frame p-3 shadow-ambient-lg">
      {/* Status bar — this is where 9:41 actually belongs. */}
      <div className="flex items-center justify-between px-3 pt-1 pb-3">
        <span className="font-dot text-footnote font-black tabular-nums text-fg-1">9:41</span>
        <span className="flex items-center gap-1.5 text-fg-2">
          <Signal className="size-3.5" />
          <Wifi className="size-3.5" />
          <BatteryFull className="size-4" />
        </span>
      </div>

      <WidgetGrid>
        <NetBalanceWidget netMinor={482000} context="Across 3 groups and 8 friends" />
        <OwedWidget direction="in" amountMinor={651000} context="from 5 friends" />
        <OwedWidget direction="out" amountMinor={169000} context="to 2 friends" />
        <MonthSpendWidget
          label="This month"
          amountMinor={2841750}
          trend={PREVIEW_TREND}
          deltaFraction={-0.12}
        />
      </WidgetGrid>

      <GlassCard className="mt-3 divide-y divide-line overflow-hidden p-0">
        <ActivityRow
          actorName="Priya"
          text="settled up with you"
          when="12 min ago"
          amountMinor={125000}
        />
        <ActivityRow
          actorName="Aarav"
          text="added Dinner at Gajalee"
          when="1 hour ago"
          amountMinor={-42500}
        />
        <ActivityRow actorName="You" text="paid the wifi bill" when="Yesterday" />
      </GlassCard>
    </div>
  );
}

/**
 * Public landing. A product-faithful preview of the Home dashboard, the value
 * proposition, and the single sign-in CTA — all built from the app's own
 * design-system components so it looks exactly like the product it opens.
 */
export default function RootPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-14 px-5 pb-[calc(env(safe-area-inset-bottom)+4rem)] pt-[calc(env(safe-area-inset-top)+3.5rem)]">
      {/* Brand + sign-in */}
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-sm bg-volt font-dot text-headline font-black text-on-volt">
            ₹
          </span>
          <span className="text-headline">Cashflow</span>
        </span>
        <Link href="/sign-in" className="text-footnote text-fg-2 transition-colors hover:text-fg-1">
          Sign in
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full glass-soft px-3.5 py-1.5">
          <span className="size-1.5 rounded-full bg-volt shadow-glow-volt" />
          <span className="text-caption uppercase text-fg-2">
            Group expenses · Personal finance
          </span>
        </span>
        <h1 className="mt-5 text-balance text-title-1">
          Split anything. <span className="text-volt">Settle beautifully.</span>
        </h1>
        <p className="mt-3 text-pretty text-body text-fg-2">
          Cashflow shares group bills to the exact paise, shows who gets what back, and keeps your
          personal spending in one calm, private place.
        </p>
        <Link href="/sign-in" className={`mt-7 ${VOLT_PILL}`}>
          Get started <ArrowRight className="size-5" />
        </Link>
        <p className="mt-3 text-footnote text-fg-3">Free · Continue with Google</p>
      </section>

      {/* Product shot */}
      <ProductPreview />

      {/* Features */}
      <section className="flex flex-col gap-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <GlassCard key={title} elevation="inset" className="flex items-start gap-4 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-volt/15 text-volt">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-headline">{title}</p>
              <p className="mt-0.5 text-footnote text-fg-2">{body}</p>
            </div>
          </GlassCard>
        ))}
      </section>

      {/* Closing CTA */}
      <section className="flex flex-col items-center gap-5 text-center">
        <div>
          <h2 className="text-title-2">Ready to settle up?</h2>
          <p className="mt-1 text-body text-fg-2">Your first group takes about a minute.</p>
        </div>
        <Link href="/sign-in" className={VOLT_PILL}>
          Open Cashflow <ArrowRight className="size-5" />
        </Link>
      </section>

      {process.env.NODE_ENV === "development" ? (
        <nav className="flex justify-center gap-4">
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
