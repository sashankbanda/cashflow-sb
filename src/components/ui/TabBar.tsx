"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ChartPie, CircleUserRound, House, Plus, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { IntentLink } from "@/components/ui/IntentLink";
import { useHaptics } from "@/hooks/useHaptics";
import { useSheet } from "@/hooks/useSheet";
import type { CategoryOption } from "@/features/categories/queries";
import type { TagOption } from "@/features/categories/tags-service";
import type { GroupSummary } from "@/features/groups/queries";

// Lazy: the add-expense flow (motion, keypad, split editors) is a large leaf and
// only needed once the volt button is tapped — keep it out of every page's JS.
const AddExpenseFlow = dynamic(
  () => import("@/features/expenses/components/AddExpenseFlow").then((mod) => mod.AddExpenseFlow),
  { ssr: false },
);

const LEFT_TABS = [
  { href: "/home", icon: House, label: "Home" },
  { href: "/groups", icon: Users, label: "Groups" },
] as const;

const RIGHT_TABS = [
  { href: "/insights", icon: ChartPie, label: "Insights" },
  { href: "/profile", icon: CircleUserRound, label: "Profile" },
] as const;

function TabLink({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: typeof House;
  label: string;
  active: boolean;
}) {
  const haptics = useHaptics();
  return (
    <IntentLink
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={() => haptics.tap()}
      className={cn(
        "flex w-14 flex-col items-center justify-center gap-0.5 rounded-md py-1",
        "ease-out transition-[color,transform] duration-150 active:scale-[0.97]",
        active ? "text-volt" : "text-fg-3 hover:text-fg-2",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
      <span className={cn("text-micro", active && "font-semibold")}>{label}</span>
    </IntentLink>
  );
}

export interface TabBarProps {
  groups: GroupSummary[];
  categories: CategoryOption[];
  tags: TagOption[];
  viewerUserId: string;
  /** New entries default to this date (follows the app-wide period). */
  defaultEntryDate?: string;
  /** Names split with before — one-tap picks in the add flow. */
  splitSuggestions?: string[];
}

/**
 * The floating glass dock: Home · Groups · [volt Add] · Insights · Profile.
 * The volt button opens the expense flow, preselecting the group in view.
 */
export function TabBar({
  groups,
  categories,
  tags,
  viewerUserId,
  defaultEntryDate,
  splitSuggestions,
}: TabBarProps) {
  const pathname = usePathname();
  const addSheet = useSheet();
  const haptics = useHaptics();
  // Mount the flow only after the first open so its chunk loads on demand.
  const [everOpened, setEverOpened] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const groupIdInView = /^\/groups\/([^/]+)/.exec(pathname)?.[1];

  return (
    <>
      <nav
        aria-label="Primary"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe"
      >
        {/* Clip: content fades out and is fully hidden behind the navbar zone. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-[calc(var(--dock-height)+env(safe-area-inset-bottom))] bg-gradient-to-t from-canvas from-55% to-transparent"
        />
        <div className="pointer-events-auto relative mb-3 flex items-center gap-1 rounded-full glass-dock px-3 py-1.5">
          {LEFT_TABS.map((tab) => (
            <TabLink key={tab.href} {...tab} active={isActive(tab.href)} />
          ))}
          <button
            type="button"
            aria-label="Add expense or income"
            onClick={() => {
              haptics.tap();
              setEverOpened(true);
              addSheet.open();
            }}
            className={cn(
              "mx-1 flex w-14 flex-col items-center justify-center gap-0.5 py-1 text-fg-2",
              "ease-out transition-transform duration-150 active:scale-[0.94]",
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-volt text-on-volt shadow-glow-volt">
              <Plus className="size-5" strokeWidth={2.4} />
            </span>
            <span className="text-micro">Add</span>
          </button>
          {RIGHT_TABS.map((tab) => (
            <TabLink key={tab.href} {...tab} active={isActive(tab.href)} />
          ))}
        </div>
      </nav>

      {everOpened ? (
        <AddExpenseFlow
          open={addSheet.isOpen}
          onClose={addSheet.close}
          groups={groups}
          categories={categories}
          defaultGroupId={groupIdInView}
          viewerUserId={viewerUserId}
          availableTags={tags}
          defaultDate={defaultEntryDate}
          splitSuggestions={splitSuggestions}
          allowPersonal
        />
      ) : null}
    </>
  );
}
