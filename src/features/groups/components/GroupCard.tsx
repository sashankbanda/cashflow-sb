import { AvatarStack } from "@/components/ui/Avatar";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import type { GroupSummary } from "../queries";

export interface GroupCardProps {
  group: GroupSummary;
  /** Line under the title — balance summary once the balance engine lands. */
  subtitle?: string;
  className?: string;
}

/**
 * One wallet card in the groups deck. The title row sits in the top 64px so
 * it stays readable while peeking in the stacked state.
 */
export function GroupCard({ group, subtitle, className }: GroupCardProps) {
  return (
    <GlassCard gradient={group.gradient} glow className={cn("h-32 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-title-2 text-white">
          {group.emoji ? (
            <span aria-hidden className="mr-2">
              {group.emoji}
            </span>
          ) : null}
          {group.name}
        </p>
        <AvatarStack
          people={group.members.map((member) => ({
            name: member.displayName,
            image: member.image,
          }))}
          size="sm"
          max={3}
        />
      </div>
      <p className="mt-1 truncate text-footnote text-fg-on-grad">
        {subtitle ?? `${group.memberCount} member${group.memberCount === 1 ? "" : "s"}`}
      </p>
    </GlassCard>
  );
}
