import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { AvatarStack } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import type { Palette } from "@/components/ui/palette";

export const metadata: Metadata = { title: "Groups" };

const mockGroups: ReadonlyArray<{
  name: string;
  emoji: string;
  palette: Palette;
  balanceLabel: string;
  members: Array<{ name: string }>;
}> = [
  {
    name: "Goa trip",
    emoji: "🌴",
    palette: "ocean",
    balanceLabel: "You are owed ₹2,140",
    members: [{ name: "Rohit Verma" }, { name: "Asha Iyer" }, { name: "Dev Patel" }],
  },
  {
    name: "Flat 402",
    emoji: "🏠",
    palette: "iris",
    balanceLabel: "You owe ₹850",
    members: [{ name: "Meera Nair" }, { name: "Karan Shah" }],
  },
  {
    name: "Weekend dinners",
    emoji: "🍜",
    palette: "ember",
    balanceLabel: "Settled up",
    members: [{ name: "Rohit Verma" }, { name: "Meera Nair" }, { name: "Karan Shah" }],
  },
];

/** Shell-phase Groups list; the stacked-deck experience arrives with groups CRUD. */
export default function GroupsPage() {
  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Groups"
        trailing={
          <IconButton aria-label="New group" size="sm">
            <Plus />
          </IconButton>
        }
      />
      <div className="space-y-3 px-5">
        {mockGroups.map((group) => (
          <GlassCard key={group.name} gradient={group.palette} glow className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-title-2">
                  <span aria-hidden className="mr-2">
                    {group.emoji}
                  </span>
                  {group.name}
                </p>
                <p className="mt-1 text-footnote text-white/70">{group.balanceLabel}</p>
              </div>
              <AvatarStack people={group.members} size="sm" max={3} />
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
