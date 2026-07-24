"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartPie, CircleUserRound, House, Plus, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHaptics } from "@/hooks/useHaptics";
import { useSheet } from "@/hooks/useSheet";
import type { CategoryOption } from "@/features/categories/queries";
import type { TagOption } from "@/features/categories/tags-service";
import type { GroupSummary } from "@/features/groups/queries";
import { AddExpenseFlow } from "@/features/expenses/components/AddExpenseFlow";

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
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={() => haptics.tap()}
      className={cn(
        "flex size-12 items-center justify-center rounded-full",
        "ease-out transition-[color,transform] duration-150 active:scale-[0.97]",
        active ? "text-volt glow-volt-icon" : "text-fg-3 hover:text-fg-2",
      )}
    >
      <Icon className="size-6" strokeWidth={active ? 2.2 : 1.8} />
    </Link>
  );
}

export interface TabBarProps {
  groups: GroupSummary[];
  categories: CategoryOption[];
  tags: TagOption[];
  viewerUserId: string;
}

/**
 * The floating glass dock: Home · Groups · [volt Add] · Insights · Profile.
 * The volt button opens the expense flow, preselecting the group in view.
 */
export function TabBar({ groups, categories, tags, viewerUserId }: TabBarProps) {
  const pathname = usePathname();
  const addSheet = useSheet();
  const haptics = useHaptics();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const groupIdInView = /^\/groups\/([^/]+)/.exec(pathname)?.[1];

  return (
    <>
      <nav
        aria-label="Primary"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-safe"
      >
        <div className="pointer-events-auto mb-4 flex items-center gap-1 rounded-full glass-floating px-2 py-1.5">
          {LEFT_TABS.map((tab) => (
            <TabLink key={tab.href} {...tab} active={isActive(tab.href)} />
          ))}
          <button
            type="button"
            aria-label="Add expense"
            onClick={() => {
              haptics.tap();
              addSheet.open();
            }}
            className={cn(
              "mx-1 flex size-12 items-center justify-center rounded-full bg-volt text-on-volt",
              "ease-out shadow-glow-volt transition-transform duration-150 active:scale-[0.94]",
            )}
          >
            <Plus className="size-6" strokeWidth={2.4} />
          </button>
          {RIGHT_TABS.map((tab) => (
            <TabLink key={tab.href} {...tab} active={isActive(tab.href)} />
          ))}
        </div>
      </nav>

      <AddExpenseFlow
        open={addSheet.isOpen}
        onClose={addSheet.close}
        groups={groups}
        categories={categories}
        defaultGroupId={groupIdInView}
        viewerUserId={viewerUserId}
        availableTags={tags}
        allowPersonal
      />
    </>
  );
}
