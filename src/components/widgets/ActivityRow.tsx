import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";

export interface ActivityRowProps {
  actorName: string;
  actorImage?: string | null;
  /** Rendered after the bolded first name, e.g. "added Dinner in Goa trip". */
  text: string;
  when: string;
  /** Signed amount from the viewer's perspective; omit for non-money events. */
  amountMinor?: number;
}

/** One activity/timeline row: avatar · sentence · time · signed amount. */
export function ActivityRow({ actorName, actorImage, text, when, amountMinor }: ActivityRowProps) {
  const firstName = actorName.split(" ")[0] ?? actorName;
  return (
    <div className="flex items-center gap-3 p-4">
      <Avatar name={actorName} image={actorImage} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body">
          <span className="font-medium">{firstName}</span> {text}
        </p>
        <p className="text-footnote text-fg-3">{when}</p>
      </div>
      {amountMinor !== undefined && amountMinor !== 0 ? (
        <p
          className={cn(
            "shrink-0 text-footnote font-semibold tabular-nums",
            amountMinor > 0 ? "text-positive" : "text-negative",
          )}
        >
          {formatMoney(amountMinor, { sign: "always" })}
        </p>
      ) : null}
    </div>
  );
}
