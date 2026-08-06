import type { Metadata } from "next";
import Link from "next/link";
import {
  AtSign,
  Bell,
  ChevronRight,
  Coins,
  Download,
  FileDown,
  FileUp,
  PiggyBank,
  Repeat,
  SunMoon,
  Tags,
  UsersRound,
  Wallet,
  Zap,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Disclosure } from "@/components/ui/Disclosure";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { requireDbUser } from "@/features/auth/session";
import { ThemeToggle } from "@/features/onboarding/components/ThemeToggle";
import { DeleteAccountRow } from "@/features/settings/components/DeleteAccountRow";
import { OpeningBalanceCard } from "@/features/settings/components/OpeningBalanceCard";
import { UpiIdCard } from "@/features/settings/components/UpiIdCard";
import { TourRow } from "@/features/onboarding/components/TourRow";

export const metadata: Metadata = { title: "Profile" };

const linkRows = [
  { icon: Zap, label: "Auto-capture payments", href: "/settings/capture" },
  { icon: FileUp, label: "Import bank statement", href: "/settings/import" },
  { icon: Repeat, label: "Recurring expenses", href: "/recurring" },
  { icon: Tags, label: "Categories & tags", href: "/settings/categories" },
  { icon: Bell, label: "Notifications", href: "/settings/notifications" },
  { icon: Download, label: "Reports & export", href: "/reports" },
] as const;

export default async function ProfilePage() {
  const user = await requireDbUser();

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
        <GlassCard elevation="inset" className="divide-y divide-hairline">
          <Disclosure label="Starting balance" icon={<Coins className="size-5 text-fg-2" />}>
            <OpeningBalanceCard current={user.openingBalanceMinor} />
          </Disclosure>
          <Disclosure label="Your UPI ID" icon={<AtSign className="size-5 text-fg-2" />}>
            <UpiIdCard current={user.upiId} />
          </Disclosure>
          <Disclosure label="Appearance" icon={<SunMoon className="size-5 text-fg-2" />}>
            <ThemeToggle />
          </Disclosure>
        </GlassCard>
        <GlassCard elevation="inset" className="divide-y divide-hairline">
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
          <a
            href="/api/export/all"
            download
            className="ease-out flex items-center gap-3 p-4 transition-colors duration-150 active:bg-glass"
          >
            <FileDown className="size-5 text-fg-2" />
            <p className="flex-1 text-body">Download my data</p>
            <ChevronRight className="size-4 text-fg-3" />
          </a>
          <TourRow />
        </GlassCard>
        <SignOutButton />
        <DeleteAccountRow />
      </div>
    </div>
  );
}
