import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Download,
  Palette,
  PiggyBank,
  Repeat,
  Tags,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { requireUser } from "@/features/auth/session";

export const metadata: Metadata = { title: "Profile" };

const linkRows = [
  { icon: Repeat, label: "Recurring expenses", href: "/recurring" },
  { icon: Tags, label: "Categories & tags", href: "/settings/categories" },
] as const;

const settingsRows = [
  { icon: Bell, label: "Notifications" },
  { icon: Palette, label: "Appearance" },
  { icon: Download, label: "Export data" },
] as const;

export default async function ProfilePage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Profile" />
      <div className="space-y-3 px-5">
        <GlassCard className="flex items-center gap-4 p-5">
          <Avatar name={user.name} image={user.image} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-headline">{user.name}</p>
            <p className="truncate text-footnote text-fg-3">{user.email}</p>
          </div>
        </GlassCard>
        <GlassCard elevation="inset" className="divide-y divide-white/6">
          <Link
            href="/expenses"
            className="ease-out flex items-center gap-3 p-4 transition-colors duration-150 active:bg-glass"
          >
            <Wallet className="size-5 text-fg-2" />
            <p className="flex-1 text-body">Spending</p>
            <ChevronRight className="size-4 text-fg-3" />
          </Link>
          <Link
            href="/friends"
            className="ease-out flex items-center gap-3 p-4 transition-colors duration-150 active:bg-glass"
          >
            <UsersRound className="size-5 text-fg-2" />
            <p className="flex-1 text-body">Friends</p>
            <ChevronRight className="size-4 text-fg-3" />
          </Link>
          <Link
            href="/budgets"
            className="ease-out flex items-center gap-3 p-4 transition-colors duration-150 active:bg-glass"
          >
            <PiggyBank className="size-5 text-fg-2" />
            <p className="flex-1 text-body">Budgets</p>
            <ChevronRight className="size-4 text-fg-3" />
          </Link>
          {linkRows.map((row) => (
            <Link
              key={row.label}
              href={row.href}
              className="ease-out flex items-center gap-3 p-4 transition-colors duration-150 active:bg-glass"
            >
              <row.icon className="size-5 text-fg-2" />
              <p className="flex-1 text-body">{row.label}</p>
              <ChevronRight className="size-4 text-fg-3" />
            </Link>
          ))}
          {settingsRows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 p-4">
              <row.icon className="size-5 text-fg-2" />
              <p className="flex-1 text-body">{row.label}</p>
              <ChevronRight className="size-4 text-fg-3" />
            </div>
          ))}
        </GlassCard>
        <SignOutButton />
      </div>
    </div>
  );
}
