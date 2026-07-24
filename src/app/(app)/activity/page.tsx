import type { Metadata } from "next";
import { Avatar } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

export const metadata: Metadata = { title: "Activity" };

const mockActivity = [
  { actor: "Rohit Verma", text: "added Dinner at Farzi Café in Goa trip", when: "2h ago" },
  { actor: "Asha Iyer", text: "settled ₹1,250 with you", when: "Yesterday" },
  { actor: "Meera Nair", text: "joined Flat 402", when: "Tuesday" },
] as const;

/** Shell-phase Activity feed; live data arrives with the activity phase. */
export default function ActivityPage() {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Activity" />
      <div className="px-5">
        <GlassCard elevation="inset" className="divide-y divide-white/6">
          {mockActivity.map((item) => (
            <div key={item.text} className="flex items-center gap-3 p-4">
              <Avatar name={item.actor} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-body">
                  <span className="font-medium">{item.actor.split(" ")[0]}</span> {item.text}
                </p>
                <p className="text-footnote text-fg-3">{item.when}</p>
              </div>
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
}
