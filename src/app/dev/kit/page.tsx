"use client";

import { useState } from "react";
import { ArrowRight, Bell, Plus, Receipt, Search, Users, Wallet } from "lucide-react";
import { Avatar, AvatarStack } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientPanel } from "@/components/ui/GradientPanel";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";

const people = [
  { name: "Sashank Banda" },
  { name: "Rohit Verma" },
  { name: "Asha Iyer" },
  { name: "Dev Patel" },
  { name: "Meera Nair" },
  { name: "Karan Shah" },
];

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
            <p className="text-caption text-white/70 uppercase">Gradient card</p>
            <p className="text-title-2">₹1,250 owed to you</p>
          </GlassCard>
        </div>
      </Section>

      <Section title="GradientPanel">
        <GradientPanel palette="iris" className="p-5">
          <p className="text-caption text-white/70 uppercase">Savings</p>
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
    </main>
  );
}
