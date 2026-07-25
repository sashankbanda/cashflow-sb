"use client";

import { useState } from "react";
import {
  ArrowRight,
  Bell,
  Car,
  Clapperboard,
  Plus,
  Receipt,
  Search,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { AmountKeypad } from "@/components/ui/AmountKeypad";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateChip } from "@/components/ui/DateChip";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientPanel } from "@/components/ui/GradientPanel";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { Slider } from "@/components/ui/Slider";
import { TextArea, TextField } from "@/components/ui/TextField";
import { toast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";
import { DotMatrixAmount } from "@/components/motion/DotMatrixAmount";
import { NumberTicker } from "@/components/motion/NumberTicker";
import { Pressable } from "@/components/motion/Pressable";
import { Stagger } from "@/components/motion/Stagger";
import { AreaTrend } from "@/components/charts/AreaTrend";
import { BarPeriod } from "@/components/charts/BarPeriod";
import { DonutCategory } from "@/components/charts/DonutCategory";
import { HeatmapCalendar } from "@/components/charts/HeatmapCalendar";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatMoney } from "@/lib/format";
import { useSheet } from "@/hooks/useSheet";

const people = [
  { name: "Sashank Banda" },
  { name: "Rohit Verma" },
  { name: "Asha Iyer" },
  { name: "Dev Patel" },
  { name: "Meera Nair" },
  { name: "Karan Shah" },
];

const trendData = [240, 0, 1290, 560, 3200, 800, 450, 1500, 2100, 300, 0, 1750, 920, 2600].map(
  (value, index) => ({ label: `${index + 11} Jul`, value: value * 100 }),
);

const barData = [
  { label: "Feb", value: 4820000 },
  { label: "Mar", value: 3910000 },
  { label: "Apr", value: 6250000 },
  { label: "May", value: 5100000 },
  { label: "Jun", value: 7300000 },
  { label: "Jul", value: 4460000 },
];

const donutData = [
  { label: "Food", value: 1820000, palette: "ember" as const },
  { label: "Travel", value: 1240000, palette: "ocean" as const },
  { label: "Bills", value: 980000, palette: "iris" as const },
  { label: "Fun", value: 640000, palette: "solar" as const },
  { label: "Health", value: 320000, palette: "mint" as const },
];

const heatmapData = [3, 7, 11, 14, 18, 21, 24, 27].map((day) => ({
  date: `2026-07-${String(day).padStart(2, "0")}`,
  value: (day % 5) * 65000 + 40000,
}));

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-caption text-fg-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function KitPage() {
  const [selectedChip, setSelectedChip] = useState("Food");
  const [loading, setLoading] = useState(false);
  const [splitType, setSplitType] = useState<"equal" | "percent" | "shares">("equal");
  const [notifications, setNotifications] = useState(true);
  const [sliderValue, setSliderValue] = useState(40);
  const [category, setCategory] = useState<"food" | "travel" | "movies" | null>("food");
  const [expenseDate, setExpenseDate] = useState(() => new Date());
  const [amountDraft, setAmountDraft] = useState("2500");
  const [tickerMinor, setTickerMinor] = useState(1284500);
  const [staggerKey, setStaggerKey] = useState(0);
  const demoSheet = useSheet();

  return (
    <main className="mx-auto max-w-md space-y-8 px-5 py-10 pb-safe">
      <header className="space-y-1">
        <h1 className="text-title-1">Component kit</h1>
        <p className="text-body text-fg-2">UI primitives I — surfaces &amp; actions.</p>
      </header>

      <Section title="GlassCard elevations">
        <div className="space-y-3">
          <GlassCard elevation="inset" className="p-5">
            <p className="text-headline">Inset · E1</p>
            <p className="text-footnote text-fg-3">List rows, secondary tiles. No blur.</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-headline">Raised · E2</p>
            <p className="text-footnote text-fg-3">Primary widgets. Blur 24, lit top edge.</p>
          </GlassCard>
          <GlassCard elevation="floating" className="p-5">
            <p className="text-headline">Floating · E3</p>
            <p className="text-footnote text-fg-3">Dock, sheets. Blur 40, stronger border.</p>
          </GlassCard>
          <GlassCard gradient="mint" glow className="p-5">
            <p className="text-caption text-fg-on-grad uppercase">Gradient card</p>
            <p className="text-title-2">₹1,250 owed to you</p>
          </GlassCard>
        </div>
      </Section>

      <Section title="GradientPanel">
        <GradientPanel palette="iris" className="p-5">
          <p className="text-caption text-fg-on-grad uppercase">Savings</p>
          <p className="text-title-2">₹18,400</p>
        </GradientPanel>
      </Section>

      <Section title="Buttons">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="volt">Settle up</Button>
            <Button variant="glass">Add expense</Button>
            <Button variant="ghost">Skip</Button>
            <Button variant="destructive">Delete</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="volt" size="sm">
              Small
            </Button>
            <Button variant="glass" size="md">
              Medium
            </Button>
            <Button variant="volt" size="lg">
              Large <ArrowRight />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="volt"
              loading={loading}
              onClick={() => {
                setLoading(true);
                window.setTimeout(() => setLoading(false), 1500);
              }}
            >
              {loading ? "Recording…" : "Tap to load"}
            </Button>
            <Button variant="glass" disabled>
              Disabled
            </Button>
          </div>
          <Button variant="volt" block size="lg">
            Block CTA
          </Button>
        </div>
      </Section>

      <Section title="Icon buttons">
        <div className="flex items-center gap-3">
          <IconButton aria-label="Search">
            <Search />
          </IconButton>
          <IconButton aria-label="Notifications">
            <Bell />
          </IconButton>
          <IconButton aria-label="Add" variant="volt">
            <Plus />
          </IconButton>
          <IconButton aria-label="Members" variant="ghost" size="sm">
            <Users />
          </IconButton>
        </div>
      </Section>

      <Section title="Chips">
        <div className="flex flex-wrap gap-2">
          {["Food", "Travel", "Fuel", "Hotel"].map((label) => (
            <Chip
              key={label}
              selected={selectedChip === label}
              onClick={() => setSelectedChip(label)}
            >
              {label}
            </Chip>
          ))}
          <Chip icon={<Receipt />}>With icon</Chip>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex items-center gap-3">
          <Badge variant="volt">3</Badge>
          <Badge variant="glass">pending</Badge>
          <Badge variant="negative">overdue</Badge>
          <Badge variant="positive">settled</Badge>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-4">
          <Avatar name="Sashank Banda" size="lg" />
          <Avatar name="Rohit Verma" size="md" />
          <Avatar name="Asha Iyer" size="sm" />
          <Avatar name="Meera Nair" size="xs" />
        </div>
        <AvatarStack people={people} />
      </Section>

      <Section title="Divider">
        <GlassCard elevation="inset" className="p-5">
          <p className="text-body">Dinner at Farzi Café</p>
          <Divider className="my-3" />
          <p className="text-footnote text-fg-3">Paid by Rohit · split 5 ways</p>
        </GlassCard>
      </Section>

      <Section title="Skeleton">
        <GlassCard elevation="inset" className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-24 w-full rounded-md" />
        </GlassCard>
      </Section>

      <Section title="Empty state">
        <GlassCard elevation="inset">
          <EmptyState
            icon={<Wallet />}
            palette="ocean"
            title="No expenses yet"
            description="Add your first expense and Cashflow will handle the math."
            action={
              <Button variant="volt" size="sm">
                <Plus className="size-4" /> Add expense
              </Button>
            }
          />
        </GlassCard>
      </Section>

      <Section title="Text fields">
        <div className="space-y-4">
          <TextField label="Description" placeholder="Dinner at Farzi Café" leading={<Receipt />} />
          <TextField label="Group name" defaultValue="Goa trip" hint="Visible to all members." />
          <TextField
            label="Email"
            defaultValue="not-an-email"
            error="Enter a valid email address."
          />
          <TextArea label="Notes" placeholder="Anything the group should know…" />
        </div>
      </Section>

      <Section title="Segmented control">
        <SegmentedControl
          aria-label="Split type"
          value={splitType}
          onChange={setSplitType}
          options={[
            { value: "equal", label: "Equal" },
            { value: "percent", label: "Percent" },
            { value: "shares", label: "Shares" },
          ]}
        />
      </Section>

      <Section title="Toggle + slider">
        <GlassCard elevation="inset" className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-body" id="kit-toggle-label">
                Notifications
              </p>
              <p className="text-footnote text-fg-3">Expense and settlement alerts</p>
            </div>
            <Toggle
              checked={notifications}
              onChange={setNotifications}
              aria-labelledby="kit-toggle-label"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="text-body">Budget alert at</p>
              <p className="text-footnote text-fg-2 tabular-nums">{sliderValue}%</p>
            </div>
            <Slider
              aria-label="Budget alert threshold"
              value={sliderValue}
              onChange={setSliderValue}
            />
          </div>
        </GlassCard>
      </Section>

      <Section title="Select + date">
        <div className="space-y-4">
          <Select
            label="Category"
            sheetTitle="Category"
            value={category}
            onChange={setCategory}
            options={[
              { value: "food", label: "Food & Drinks", icon: <UtensilsCrossed /> },
              { value: "travel", label: "Travel", icon: <Car /> },
              { value: "movies", label: "Entertainment", icon: <Clapperboard /> },
            ]}
          />
          <div className="flex items-center gap-2">
            <DateChip value={expenseDate} onChange={setExpenseDate} />
          </div>
        </div>
      </Section>

      <Section title="Sheet">
        <Button variant="glass" onClick={demoSheet.open}>
          Open sheet
        </Button>
        <Sheet open={demoSheet.isOpen} onClose={demoSheet.close} title="Settle up">
          <div className="space-y-4 pt-1">
            <GlassCard elevation="inset" className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar name="Rohit Verma" size="sm" />
                <p className="text-body">Rohit → you</p>
              </div>
              <p className="text-headline text-positive tabular-nums">₹840</p>
            </GlassCard>
            <GlassCard elevation="inset" className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar name="Asha Iyer" size="sm" />
                <p className="text-body">You → Asha</p>
              </div>
              <p className="text-headline text-negative tabular-nums">₹1,250</p>
            </GlassCard>
            <Button variant="volt" block size="lg" onClick={demoSheet.close}>
              Record payment
            </Button>
          </div>
        </Sheet>
      </Section>

      <Section title="Toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="glass" size="sm" onClick={() => toast.success("Expense added")}>
            Success
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={() => toast.error("Couldn't reach the server")}
          >
            Error
          </Button>
          <Button variant="glass" size="sm" onClick={() => toast.info("Rohit joined Goa trip")}>
            Info
          </Button>
        </div>
      </Section>

      <Section title="Amount entry">
        <GlassCard className="space-y-4 p-5">
          <AmountDisplay value={amountDraft} />
          <AmountKeypad value={amountDraft} onChange={setAmountDraft} />
        </GlassCard>
      </Section>

      <Section title="Motion · Pressable">
        <Pressable className="rounded-lg">
          <GlassCard className="flex items-center justify-between p-5">
            <div>
              <p className="text-headline">Goa trip</p>
              <p className="text-footnote text-fg-3">Press me — 0.97 spring</p>
            </div>
            <ArrowRight className="size-5 text-fg-3" />
          </GlassCard>
        </Pressable>
      </Section>

      <Section title="Motion · DotMatrixAmount + NumberTicker">
        <GlassCard className="space-y-5 p-5 text-center">
          <DotMatrixAmount amountMinor={8425000} />
          <div className="text-title-2">
            <NumberTicker value={formatMoney(tickerMinor)} />
          </div>
          <Button
            variant="glass"
            size="sm"
            onClick={() => setTickerMinor(Math.round(Math.random() * 5000000))}
          >
            Randomize
          </Button>
        </GlassCard>
      </Section>

      <Section title="Motion · Stagger">
        <Button variant="glass" size="sm" onClick={() => setStaggerKey((key) => key + 1)}>
          Replay entrance
        </Button>
        <Stagger key={staggerKey} className="mt-3 space-y-2">
          {people.slice(0, 4).map((person) => (
            <GlassCard key={person.name} elevation="inset" className="flex items-center gap-3 p-4">
              <Avatar name={person.name} size="sm" />
              <p className="text-body">{person.name}</p>
            </GlassCard>
          ))}
        </Stagger>
      </Section>

      <Section title="Charts · AreaTrend (drag to scrub)">
        <GlassCard elevation="inset" className="p-4">
          <AreaTrend
            data={trendData}
            formatValue={(value) => formatMoney(value, { compact: true })}
            caption="Daily spend this fortnight"
          />
        </GlassCard>
      </Section>

      <Section title="Charts · BarPeriod (tap a bar)">
        <GlassCard elevation="inset" className="p-4">
          <BarPeriod
            data={barData}
            className="text-ocean-1"
            formatValue={(value) => formatMoney(value, { compact: true })}
            caption="Spend by month"
          />
        </GlassCard>
      </Section>

      <Section title="Charts · DonutCategory (tap a slice)">
        <GlassCard elevation="inset" className="p-5">
          <DonutCategory
            data={donutData}
            formatValue={(value) => formatMoney(value, { compact: true })}
            caption="Where the money went"
          />
        </GlassCard>
      </Section>

      <Section title="Charts · HeatmapCalendar (tap a day)">
        <GlassCard elevation="inset" className="p-4">
          <HeatmapCalendar
            month={new Date()}
            data={heatmapData}
            formatValue={(value) => formatMoney(value, { compact: true })}
          />
        </GlassCard>
      </Section>

      <Section title="Charts · Sparkline">
        <GlassCard elevation="inset" className="flex items-center justify-between p-4">
          <p className="text-body text-fg-2">14-day trend</p>
          <Sparkline
            data={trendData.map((point) => point.value)}
            className="h-10 w-28 text-mint-2"
          />
        </GlassCard>
      </Section>
    </main>
  );
}
