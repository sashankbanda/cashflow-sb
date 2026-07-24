import type { Metadata } from "next";
import { Bell, ChevronRight, Download, Palette, Tags } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export const metadata: Metadata = { title: "Profile" };

const settingsRows = [
  { icon: Tags, label: "Categories & tags" },
  { icon: Bell, label: "Notifications" },
  { icon: Palette, label: "Appearance" },
  { icon: Download, label: "Export data" },
] as const;

/** Shell-phase Profile; account data arrives with authentication. */
export default function ProfilePage() {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Profile" />
      <div className="space-y-3 px-5">
        <GlassCard className="flex items-center gap-4 p-5">
          <Avatar name="Sashank Banda" size="lg" />
          <div className="min-w-0">
            <p className="truncate text-headline">Sashank Banda</p>
            <p className="truncate text-footnote text-fg-3">banda.s@gozeal.com</p>
          </div>
        </GlassCard>
        <GlassCard elevation="inset" className="divide-y divide-white/6">
          {settingsRows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 p-4">
              <row.icon className="size-5 text-fg-2" />
              <p className="flex-1 text-body">{row.label}</p>
              <ChevronRight className="size-4 text-fg-3" />
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
