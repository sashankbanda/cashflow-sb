"use client";

import { parseISO } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { DateChip } from "@/components/ui/DateChip";
import { Sheet } from "@/components/ui/Sheet";
import { formatISODate } from "@/lib/dates";
import type { CategoryOption } from "@/features/categories/queries";
import { CategoryGlyph } from "@/features/categories/icons";
import type { GroupMemberSummary } from "@/features/groups/queries";
import type { TimelineItem } from "../queries";

export interface TimelineFilter {
  memberIds: ReadonlyArray<string>;
  categoryIds: ReadonlyArray<string>;
  /** ISO dates, inclusive. */
  from: string | null;
  to: string | null;
}

export const EMPTY_FILTER: TimelineFilter = {
  memberIds: [],
  categoryIds: [],
  from: null,
  to: null,
};

export function activeFilterCount(filter: TimelineFilter): number {
  return (
    (filter.memberIds.length > 0 ? 1 : 0) +
    (filter.categoryIds.length > 0 ? 1 : 0) +
    (filter.from || filter.to ? 1 : 0)
  );
}

/** AND-composed filter over expenses and settlements. */
export function applyTimelineFilter(
  items: ReadonlyArray<TimelineItem>,
  filter: TimelineFilter,
): TimelineItem[] {
  return items.filter((item) => {
    const date = item.kind === "expense" ? item.expenseDate : item.date;
    if (filter.from && date < filter.from) return false;
    if (filter.to && date > filter.to) return false;

    if (filter.categoryIds.length > 0) {
      if (item.kind !== "expense") return false;
      if (!item.categoryId || !filter.categoryIds.includes(item.categoryId)) return false;
    }

    if (filter.memberIds.length > 0) {
      const memberIds =
        item.kind === "expense"
          ? [
              ...item.payers.map((payer) => payer.memberId),
              ...item.splits.map((split) => split.memberId),
            ]
          : [item.fromMemberId, item.toMemberId];
      if (!memberIds.some((memberId) => filter.memberIds.includes(memberId))) return false;
    }

    return true;
  });
}

function toggle(list: ReadonlyArray<string>, id: string): string[] {
  return list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id];
}

export interface TimelineFilterSheetProps {
  open: boolean;
  onClose: () => void;
  members: ReadonlyArray<GroupMemberSummary>;
  categories: ReadonlyArray<CategoryOption>;
  value: TimelineFilter;
  onChange: (filter: TimelineFilter) => void;
}

/** Member / category / date-range filters for the group timeline. */
export function TimelineFilterSheet({
  open,
  onClose,
  members,
  categories,
  value,
  onChange,
}: TimelineFilterSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Filter">
      <div className="space-y-6 pt-1">
        <section className="space-y-2">
          <p className="text-caption text-fg-3 uppercase">People</p>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <Chip
                key={member.id}
                selected={value.memberIds.includes(member.id)}
                onClick={() =>
                  onChange({ ...value, memberIds: toggle(value.memberIds, member.id) })
                }
              >
                {member.displayName}
              </Chip>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-caption text-fg-3 uppercase">Categories</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Chip
                key={category.id}
                selected={value.categoryIds.includes(category.id)}
                icon={<CategoryGlyph icon={category.icon} />}
                onClick={() =>
                  onChange({ ...value, categoryIds: toggle(value.categoryIds, category.id) })
                }
              >
                {category.name}
              </Chip>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-caption text-fg-3 uppercase">Dates</p>
          <div className="flex items-center gap-2">
            <DateChip
              value={value.from ? parseISO(value.from) : new Date()}
              onChange={(date) => onChange({ ...value, from: formatISODate(date) })}
            />
            <span className="text-footnote text-fg-3">to</span>
            <DateChip
              value={value.to ? parseISO(value.to) : new Date()}
              onChange={(date) => onChange({ ...value, to: formatISODate(date) })}
            />
          </div>
          {value.from || value.to ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ ...value, from: null, to: null })}
            >
              Clear dates
            </Button>
          ) : (
            <p className="text-caption text-fg-3">Pick both to filter by a range.</p>
          )}
        </section>

        <div className="flex gap-2">
          <Button variant="ghost" block onClick={() => onChange(EMPTY_FILTER)}>
            Clear all
          </Button>
          <Button variant="volt" block onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
