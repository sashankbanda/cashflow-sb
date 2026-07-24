"use client";

import { useState } from "react";
import { endOfDay, formatISO, startOfMonth, startOfYear, subDays } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { CategoryGlyph } from "@/features/categories/icons";
import { amountToMinor, minorToAmount, sanitizeAmountInput } from "@/lib/amount-input";
import type { SearchFilters } from "../schemas";
import type { SearchOptions } from "../queries";

type DatePreset = "any" | "30d" | "month" | "year";

function iso(date: Date): string {
  return formatISO(date, { representation: "date" });
}

function presetRange(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  switch (preset) {
    case "30d":
      return { dateFrom: iso(subDays(now, 29)), dateTo: iso(now) };
    case "month":
      return { dateFrom: iso(startOfMonth(now)), dateTo: iso(now) };
    case "year":
      return { dateFrom: iso(startOfYear(now)), dateTo: iso(now) };
    default:
      return {};
  }
}

function detectPreset(filters: SearchFilters): DatePreset {
  if (!filters.dateFrom || !filters.dateTo) return "any";
  for (const key of ["30d", "month", "year"] as const) {
    const range = presetRange(key);
    if (range.dateFrom === filters.dateFrom && range.dateTo === filters.dateTo) return key;
  }
  return "any";
}

function toggle(list: string[] | undefined, id: string): string[] {
  const current = list ?? [];
  return current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
}

const DATE_PRESETS: ReadonlyArray<{ key: DatePreset; label: string }> = [
  { key: "any", label: "Any time" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
];

interface FilterSheetProps {
  open: boolean;
  onClose: () => void;
  options: SearchOptions;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}

function FilterForm({ options, filters, onApply, onClose }: Omit<FilterSheetProps, "open">) {
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const [preset, setPreset] = useState<DatePreset>(detectPreset(filters));
  const [minRupees, setMinRupees] = useState(
    filters.amountMinMinor !== undefined ? minorToAmount(filters.amountMinMinor) : "",
  );
  const [maxRupees, setMaxRupees] = useState(
    filters.amountMaxMinor !== undefined ? minorToAmount(filters.amountMaxMinor) : "",
  );

  const apply = () => {
    const range = presetRange(preset);
    onApply({
      categoryIds: draft.categoryIds?.length ? draft.categoryIds : undefined,
      groupIds: draft.groupIds?.length ? draft.groupIds : undefined,
      tagIds: draft.tagIds?.length ? draft.tagIds : undefined,
      memberUserIds: draft.memberUserIds?.length ? draft.memberUserIds : undefined,
      amountMinMinor: minRupees ? amountToMinor(minRupees) : undefined,
      amountMaxMinor: maxRupees ? amountToMinor(maxRupees) : undefined,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    });
    onClose();
  };

  const clear = () => {
    setDraft({});
    setPreset("any");
    setMinRupees("");
    setMaxRupees("");
    onApply({});
    onClose();
  };

  return (
    <div className="space-y-6 pt-1">
      {options.categories.length > 0 ? (
        <section className="space-y-2">
          <p className="text-caption text-fg-3 uppercase">Categories</p>
          <div className="flex flex-wrap gap-2">
            {options.categories.map((category) => (
              <Chip
                key={category.id}
                icon={<CategoryGlyph icon={category.icon} />}
                selected={draft.categoryIds?.includes(category.id) ?? false}
                onClick={() =>
                  setDraft((d) => ({ ...d, categoryIds: toggle(d.categoryIds, category.id) }))
                }
              >
                {category.name}
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      {options.groups.length > 0 ? (
        <section className="space-y-2">
          <p className="text-caption text-fg-3 uppercase">Groups</p>
          <div className="flex flex-wrap gap-2">
            {options.groups.map((group) => (
              <Chip
                key={group.id}
                selected={draft.groupIds?.includes(group.id) ?? false}
                onClick={() => setDraft((d) => ({ ...d, groupIds: toggle(d.groupIds, group.id) }))}
              >
                {group.emoji ? `${group.emoji} ` : ""}
                {group.name}
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      {options.people.length > 0 ? (
        <section className="space-y-2">
          <p className="text-caption text-fg-3 uppercase">People</p>
          <div className="flex flex-wrap gap-2">
            {options.people.map((person) => (
              <Chip
                key={person.userId}
                selected={draft.memberUserIds?.includes(person.userId) ?? false}
                onClick={() =>
                  setDraft((d) => ({ ...d, memberUserIds: toggle(d.memberUserIds, person.userId) }))
                }
              >
                {person.name}
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      {options.tags.length > 0 ? (
        <section className="space-y-2">
          <p className="text-caption text-fg-3 uppercase">Tags</p>
          <div className="flex flex-wrap gap-2">
            {options.tags.map((tag) => (
              <Chip
                key={tag.id}
                selected={draft.tagIds?.includes(tag.id) ?? false}
                onClick={() => setDraft((d) => ({ ...d, tagIds: toggle(d.tagIds, tag.id) }))}
              >
                #{tag.name}
              </Chip>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <p className="text-caption text-fg-3 uppercase">Date</p>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((option) => (
            <Chip
              key={option.key}
              selected={preset === option.key}
              onClick={() => setPreset(option.key)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-caption text-fg-3 uppercase">Amount (₹)</p>
        <div className="flex items-center gap-3">
          <TextField
            placeholder="Min"
            inputMode="numeric"
            value={minRupees}
            onChange={(event) => setMinRupees(sanitizeAmountInput(event.target.value))}
          />
          <span className="text-fg-3">–</span>
          <TextField
            placeholder="Max"
            inputMode="numeric"
            value={maxRupees}
            onChange={(event) => setMaxRupees(sanitizeAmountInput(event.target.value))}
          />
        </div>
      </section>

      <div className="flex gap-3">
        <Button variant="ghost" block onClick={clear}>
          Clear all
        </Button>
        <Button variant="volt" block onClick={apply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

/** Composable AND filters for search. Resets its draft each time it opens. */
export function FilterSheet({ open, onClose, options, filters, onApply }: FilterSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Filters">
      <FilterForm
        key={String(open)}
        options={options}
        filters={filters}
        onApply={onApply}
        onClose={onClose}
      />
    </Sheet>
  );
}
