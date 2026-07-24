import type { Metadata } from "next";
import { Bell, Search } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export const metadata: Metadata = { title: "Home" };

/**
 * Shell-phase Home: header + surface scaffolding. The widget system phase
 * replaces this body with the full dashboard.
 */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Home"
        eyebrow="Good to see you"
        trailing={
          <>
            <IconButton aria-label="Search" size="sm">
              <Search />
            </IconButton>
            <IconButton aria-label="Notifications" size="sm">
              <Bell />
            </IconButton>
          </>
        }
      />
      <div className="space-y-3 px-5">
        <GlassCard gradient="aurora" className="p-6">
          <p className="text-caption text-white/70 uppercase">Net position</p>
          <p className="mt-2 font-dot text-display font-black tabular-nums">+2,340</p>
          <p className="mt-1 text-footnote text-white/70">Across all groups and friends</p>
        </GlassCard>
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-5">
            <p className="text-caption text-fg-3 uppercase">Owed to you</p>
            <p className="mt-2 text-title-2 text-positive tabular-nums">₹3,590</p>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-caption text-fg-3 uppercase">You owe</p>
            <p className="mt-2 text-title-2 text-negative tabular-nums">₹1,250</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
