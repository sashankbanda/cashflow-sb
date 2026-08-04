"use client";

import { useState, type ComponentType } from "react";
import { ChartPie, PartyPopper, Plus, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { paletteBg, type Palette } from "@/components/ui/palette";
import { cn } from "@/lib/cn";

interface TourStep {
  icon: ComponentType<{ className?: string }>;
  palette: Palette;
  title: string;
  body: string;
}

/** Five plain-language cards — what the app is and how to use it. */
const STEPS: TourStep[] = [
  {
    icon: Wallet,
    palette: "mint",
    title: "Welcome to Cashflow",
    body: "One place for what you spend, what you earn, and who owes who.",
  },
  {
    icon: Plus,
    palette: "aurora",
    title: "Add anything with the green +",
    body: "Tap Add at the bottom, enter the amount, then the details. Flip to Income when money comes in.",
  },
  {
    icon: Users,
    palette: "ocean",
    title: "Split with groups",
    body: "Create a group for a trip or your flat. Say who paid and how to split — everyone's share is calculated for you.",
  },
  {
    icon: PartyPopper,
    palette: "iris",
    title: "Settle up in fewer payments",
    body: "Cashflow suggests the minimum transfers to clear every debt. Record a payment once it's made.",
  },
  {
    icon: ChartPie,
    palette: "solar",
    title: "See where it all goes",
    body: "Home shows your balance at a glance. Money tracks income vs spending; Insights breaks it down.",
  },
];

/** Guided tour of the app inside a bottom sheet: one idea per card. */
export function AppTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index] ?? STEPS[0]!;
  const Icon = step.icon;
  const last = index === STEPS.length - 1;

  const close = () => {
    setIndex(0);
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="How Cashflow works">
      <div className="space-y-6 pt-2 pb-2">
        <div className="flex flex-col items-center gap-4 px-2 text-center">
          <span
            className={cn(
              "flex size-16 items-center justify-center rounded-xl text-white [&_svg]:size-8",
              paletteBg[step.palette],
            )}
          >
            <Icon />
          </span>
          <div className="space-y-1.5">
            <h3 className="font-dot text-title-2">{step.title}</h3>
            <p className="text-body text-fg-2">{step.body}</p>
          </div>
        </div>

        <div
          className="flex justify-center gap-1.5"
          aria-label={`Step ${index + 1} of ${STEPS.length}`}
        >
          {STEPS.map((_, dot) => (
            <span
              key={dot}
              aria-hidden
              className={cn(
                "size-1.5 rounded-full transition-colors duration-250",
                dot === index ? "bg-volt" : "bg-handle",
              )}
            />
          ))}
        </div>

        <div className="space-y-2">
          <Button
            variant="volt"
            block
            size="lg"
            onClick={() => (last ? close() : setIndex(index + 1))}
          >
            {last ? "Start using Cashflow" : "Next"}
          </Button>
          {!last ? (
            <Button variant="ghost" block onClick={close}>
              Skip
            </Button>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
