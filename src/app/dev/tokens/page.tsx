import type { Metadata } from "next";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Design tokens", robots: { index: false } };

const colorSwatches = [
  { name: "canvas", cls: "bg-canvas border border-glass-border" },
  { name: "fg-1", cls: "bg-fg-1" },
  { name: "fg-2", cls: "bg-fg-2" },
  { name: "fg-3", cls: "bg-fg-3" },
  { name: "glass", cls: "bg-glass" },
  { name: "glass-soft", cls: "bg-glass-soft" },
  { name: "glass-border", cls: "bg-glass-border" },
  { name: "volt", cls: "bg-volt" },
  { name: "positive", cls: "bg-positive" },
  { name: "negative", cls: "bg-negative" },
  { name: "warning", cls: "bg-warning" },
] as const;

const gradients = [
  { name: "ember", cls: "bg-grad-ember shadow-glow-ember", use: "spending · you owe · alerts" },
  { name: "ocean", cls: "bg-grad-ocean shadow-glow-ocean", use: "travel · info · transport" },
  { name: "mint", cls: "bg-grad-mint shadow-glow-mint", use: "income · owed to you · settled" },
  { name: "iris", cls: "bg-grad-iris shadow-glow-iris", use: "savings · entertainment" },
  { name: "solar", cls: "bg-grad-solar shadow-glow-solar", use: "budgets · warnings" },
  { name: "aurora", cls: "bg-grad-aurora shadow-ambient", use: "hero moments · canvas" },
] as const;

const typeScale = [
  { name: "display · 44/48 · 700", cls: "text-display" },
  { name: "title-1 · 28/34 · 700", cls: "text-title-1" },
  { name: "title-2 · 22/28 · 600", cls: "text-title-2" },
  { name: "headline · 17/22 · 600", cls: "text-headline" },
  { name: "body · 15/20 · 400", cls: "text-body" },
  { name: "footnote · 13/18 · 500", cls: "text-footnote" },
  { name: "caption · 11/14 · 500 · +4%", cls: "text-caption uppercase" },
] as const;

const radii = [
  { name: "sm · 16", cls: "rounded-sm" },
  { name: "md · 24", cls: "rounded-md" },
  { name: "lg · 28", cls: "rounded-lg" },
  { name: "xl · 32", cls: "rounded-xl" },
  { name: "2xl · 40", cls: "rounded-2xl" },
  { name: "full", cls: "rounded-full" },
] as const;

const blurs = [
  { name: "sm · 8", cls: "backdrop-blur-sm" },
  { name: "md · 16", cls: "backdrop-blur-md" },
  { name: "lg · 24 (glass)", cls: "backdrop-blur-lg" },
  { name: "xl · 40 (dock)", cls: "backdrop-blur-xl" },
] as const;

const spacing = [
  { name: "1 · 4px", cls: "w-1" },
  { name: "2 · 8px", cls: "w-2" },
  { name: "3 · 12px", cls: "w-3" },
  { name: "4 · 16px", cls: "w-4" },
  { name: "5 · 20px", cls: "w-5" },
  { name: "6 · 24px", cls: "w-6" },
  { name: "8 · 32px", cls: "w-8" },
  { name: "10 · 40px", cls: "w-10" },
  { name: "14 · 56px", cls: "w-14" },
] as const;

const moneySamples: Array<{ label: string; value: string }> = [
  { label: "formatMoney(12345650)", value: formatMoney(12345650) },
  { label: "formatMoney(250000)", value: formatMoney(250000) },
  { label: "formatMoney(-84000)", value: formatMoney(-84000) },
  {
    label: 'formatMoney(84000, { sign: "always" })',
    value: formatMoney(84000, { sign: "always" }),
  },
  {
    label: "formatMoney(12000000, { compact: true })",
    value: formatMoney(12000000, { compact: true }),
  },
  {
    label: "formatMoney(1500000000, { compact: true })",
    value: formatMoney(1500000000, { compact: true }),
  },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-caption text-fg-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function TokensPage() {
  return (
    <main className="mx-auto max-w-md space-y-8 px-5 py-10 pb-safe">
      <header className="space-y-1">
        <h1 className="text-title-1">Design tokens</h1>
        <p className="text-body text-fg-2">docs/02-DESIGN-SYSTEM.md rendered as code.</p>
      </header>

      <Section title="Colors">
        <div className="grid grid-cols-4 gap-3">
          {colorSwatches.map((swatch) => (
            <div key={swatch.name} className="space-y-1.5">
              <div className={`h-14 rounded-sm ${swatch.cls}`} />
              <p className="text-caption text-fg-3">{swatch.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Gradient palettes + glow">
        <div className="grid grid-cols-2 gap-3">
          {gradients.map((gradient) => (
            <div key={gradient.name} className={`h-32 rounded-lg p-4 ${gradient.cls}`}>
              <p className="text-headline text-white">{gradient.name}</p>
              <p className="text-caption text-fg-on-grad uppercase">{gradient.use}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="space-y-4">
          {typeScale.map((style) => (
            <div key={style.name}>
              <p className={style.cls}>Settle up ₹2,500</p>
              <p className="text-caption text-fg-3">{style.name}</p>
            </div>
          ))}
          <div>
            <p className="font-dot text-display font-black tabular-nums">09:41 · 84,250</p>
            <p className="text-caption text-fg-3">font-dot (Doto) · hero numerals only</p>
          </div>
        </div>
      </Section>

      <Section title="Radius">
        <div className="flex flex-wrap items-end gap-3">
          {radii.map((radius) => (
            <div key={radius.name} className="space-y-1.5 text-center">
              <div className={`h-20 w-20 border border-glass-border bg-glass ${radius.cls}`} />
              <p className="text-caption text-fg-3">{radius.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Blur over gradient">
        <div className="relative overflow-hidden rounded-xl bg-grad-iris p-4">
          <div className="grid grid-cols-2 gap-3">
            {blurs.map((blur) => (
              <div
                key={blur.name}
                className={`rounded-md border border-glass-border bg-glass p-4 ${blur.cls}`}
              >
                <p className="text-footnote text-white">{blur.name}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section title="The glass recipe">
        <div className="rounded-xl bg-grad-ocean p-6">
          <div className="rounded-lg glass p-5">
            <p className="text-headline">Frosted glass</p>
            <p className="text-footnote text-fg-2">
              8% white fill · blur 24 · 1px border · lit top edge · ambient shadow
            </p>
          </div>
        </div>
      </Section>

      <Section title="Shadows">
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-lg bg-glass p-4 shadow-ambient">
            <p className="text-caption text-fg-3">ambient</p>
          </div>
          <div className="h-24 rounded-lg bg-glass p-4 shadow-ambient-lg">
            <p className="text-caption text-fg-3">ambient-lg</p>
          </div>
          <div className="h-24 rounded-lg bg-volt p-4 shadow-glow-volt">
            <p className="text-caption text-on-volt">glow-volt</p>
          </div>
          <div className="h-24 rounded-lg bg-grad-mint p-4 shadow-glow-mint">
            <p className="text-caption text-fg-on-grad-2">glow-mint</p>
          </div>
        </div>
      </Section>

      <Section title="Spacing · 4pt grid">
        <div className="space-y-2">
          {spacing.map((space) => (
            <div key={space.name} className="flex items-center gap-3">
              <div className={`h-3 rounded-full bg-volt ${space.cls}`} />
              <p className="text-caption text-fg-3">{space.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Money formatting · lib/format.ts">
        <div className="divide-y divide-glass-border rounded-lg glass">
          {moneySamples.map((sample) => (
            <div key={sample.label} className="flex items-center justify-between gap-4 p-4">
              <code className="text-caption text-fg-3">{sample.label}</code>
              <p className="text-footnote tabular-nums">{sample.value}</p>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
