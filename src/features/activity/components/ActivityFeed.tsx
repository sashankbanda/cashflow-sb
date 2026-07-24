"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { formatSectionLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { useAction } from "@/hooks/useAction";
import { loadActivityAction } from "../actions";
import type { ActivityFeed as Feed, FeedItem } from "../queries";

export interface ActivityGroup {
  id: string;
  name: string;
  emoji: string | null;
}

function groupByDay(items: ReadonlyArray<FeedItem>): Array<[string, FeedItem[]]> {
  const sections = new Map<string, FeedItem[]>();
  for (const item of items) {
    const day = item.createdAt.slice(0, 10);
    const list = sections.get(day) ?? [];
    list.push(item);
    sections.set(day, list);
  }
  return [...sections.entries()];
}

function Row({ item }: { item: FeedItem }) {
  const firstName = item.actorName.split(" ")[0] ?? item.actorName;
  return (
    <div className="flex items-center gap-3 p-4">
      <Avatar name={item.actorName} image={item.actorImage} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-body text-fg-1">
          <span className="font-medium">{firstName}</span>{" "}
          <span className="text-fg-2">{item.text}</span>
        </p>
        <p className="text-footnote text-fg-3">{format(parseISO(item.createdAt), "h:mm a")}</p>
      </div>
      {typeof item.amountMinor === "number" ? (
        <p className="shrink-0 text-footnote text-fg-2 tabular-nums">
          {formatMoney(item.amountMinor)}
        </p>
      ) : null}
    </div>
  );
}

export function ActivityFeed({
  initial,
  groups,
}: {
  initial: Feed;
  groups: ReadonlyArray<ActivityGroup>;
}) {
  const [feed, setFeed] = useState<Feed>(initial);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const switchLoad = useAction(loadActivityAction, {
    onSuccess: (result) => setFeed(result),
  });
  const moreLoad = useAction(loadActivityAction, {
    onSuccess: (result) =>
      setFeed((current) => ({
        items: [...current.items, ...result.items],
        nextCursor: result.nextCursor,
      })),
  });

  const selectGroup = (groupId: string | null) => {
    if (groupId === activeGroup) return;
    setActiveGroup(groupId);
    void switchLoad.execute({ groupId: groupId ?? undefined });
  };

  const loadMore = () => {
    if (!feed.nextCursor) return;
    void moreLoad.execute({ groupId: activeGroup ?? undefined, cursor: feed.nextCursor });
  };

  const sections = groupByDay(feed.items);

  return (
    <div className="space-y-5">
      {groups.length > 0 ? (
        <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1">
          <Chip selected={activeGroup === null} onClick={() => selectGroup(null)}>
            All
          </Chip>
          {groups.map((group) => (
            <Chip
              key={group.id}
              selected={activeGroup === group.id}
              onClick={() => selectGroup(group.id)}
            >
              {group.emoji ? `${group.emoji} ` : ""}
              {group.name}
            </Chip>
          ))}
        </div>
      ) : null}

      {feed.items.length === 0 ? (
        <GlassCard elevation="inset">
          <EmptyState
            palette="ocean"
            title="No activity yet"
            description="Expenses, settlements, and members joining will show up here."
          />
        </GlassCard>
      ) : (
        <div className={cn("space-y-5 transition-opacity", switchLoad.pending && "opacity-50")}>
          {sections.map(([day, items]) => (
            <section key={day} aria-label={formatSectionLabel(parseISO(day))}>
              <h3 className="sticky top-12 z-10 px-1 pb-2 text-caption text-fg-3 uppercase">
                {formatSectionLabel(parseISO(day))}
              </h3>
              <GlassCard elevation="inset" className="divide-y divide-white/6">
                {items.map((item) => (
                  <Row key={item.id} item={item} />
                ))}
              </GlassCard>
            </section>
          ))}

          {feed.nextCursor ? (
            <Button variant="glass" block loading={moreLoad.pending} onClick={loadMore}>
              Load more
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
