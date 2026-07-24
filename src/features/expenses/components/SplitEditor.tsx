"use client";

import { Minus, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { sanitizeAmountInput, sanitizeDecimalInput } from "@/lib/amount-input";
import { formatMoney } from "@/lib/format";
import { computeSplits, type SplitType } from "@/lib/split";
import type { GroupMemberSummary } from "@/features/groups/queries";
import { splitDraftToParticipants, type SplitDraft } from "../split-draft";

const TYPE_OPTIONS: ReadonlyArray<{ value: SplitType; label: string }> = [
  { value: "equal", label: "Equal" },
  { value: "exact", label: "Exact" },
  { value: "percent", label: "%" },
  { value: "shares", label: "Shares" },
];

export interface SplitEditorProps {
  members: ReadonlyArray<GroupMemberSummary>;
  viewerUserId: string;
  amountMinor: number;
  value: SplitDraft;
  onChange: (draft: SplitDraft) => void;
}

/**
 * The split step: type selector, per-member weight inputs, and the live
 * remainder line ("₹120 left to assign"). Pure controlled component — the
 * blocking logic lives in split-draft.ts.
 */
export function SplitEditor({
  members,
  viewerUserId,
  amountMinor,
  value,
  onChange,
}: SplitEditorProps) {
  const result = splitDraftToParticipants(value, amountMinor);
  const preview =
    result.ok && amountMinor > 0
      ? new Map(
          computeSplits({
            amountMinor,
            type: value.type,
            participants: result.participants,
          }).map((share) => [share.memberId, share.amountMinor]),
        )
      : new Map<string, number>();

  const toggle = (memberId: string) => {
    const included = value.included.includes(memberId)
      ? value.included.filter((id) => id !== memberId)
      : [...value.included, memberId];
    if (included.length === 0) return;
    onChange({ ...value, included });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <SegmentedControl
        aria-label="Split type"
        value={value.type}
        onChange={(type) => onChange({ ...value, type })}
        options={TYPE_OPTIONS}
      />

      <p
        role="status"
        className={cn("text-center text-footnote", result.ok ? "text-fg-3" : "text-warning")}
      >
        {result.ok ? `Splitting ${formatMoney(amountMinor)}` : result.message}
      </p>

      <ul className="space-y-1.5">
        {members.map((member) => {
          const included = value.included.includes(member.id);
          const name = member.userId === viewerUserId ? "You" : member.displayName;
          return (
            <li key={member.id}>
              <div
                className={cn(
                  "flex w-full items-center gap-3 rounded-md p-3 text-left",
                  "ease-out transition-[background-color,opacity] duration-150",
                  included ? "glass" : "glass-soft opacity-50",
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={included}
                  aria-label={`Include ${name}`}
                  onClick={() => toggle(member.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Avatar name={member.displayName} image={member.image} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body">{name}</span>
                    {included && preview.size > 0 ? (
                      <span className="block text-caption text-fg-3 tabular-nums">
                        {formatMoney(preview.get(member.id) ?? 0)}
                      </span>
                    ) : null}
                  </span>
                </button>

                {!included ? (
                  <span className="text-caption text-fg-3 uppercase">out</span>
                ) : value.type === "exact" ? (
                  <div className="flex items-center gap-1">
                    <span className="text-footnote text-fg-3">₹</span>
                    <input
                      inputMode="decimal"
                      aria-label={`${name}'s exact share in rupees`}
                      value={value.exactAmounts[member.id] ?? ""}
                      placeholder="0"
                      onChange={(event) =>
                        onChange({
                          ...value,
                          exactAmounts: {
                            ...value.exactAmounts,
                            [member.id]: sanitizeAmountInput(event.target.value),
                          },
                        })
                      }
                      className="w-20 rounded-sm bg-glass-soft px-2 py-1.5 text-right text-body tabular-nums outline-none focus:ring-1 focus:ring-volt/60"
                    />
                  </div>
                ) : value.type === "percent" ? (
                  <div className="flex items-center gap-1">
                    <input
                      inputMode="decimal"
                      aria-label={`${name}'s percentage`}
                      value={value.percents[member.id] ?? ""}
                      placeholder="0"
                      onChange={(event) =>
                        onChange({
                          ...value,
                          percents: {
                            ...value.percents,
                            [member.id]: sanitizeDecimalInput(event.target.value, 3, 2),
                          },
                        })
                      }
                      className="w-16 rounded-sm bg-glass-soft px-2 py-1.5 text-right text-body tabular-nums outline-none focus:ring-1 focus:ring-volt/60"
                    />
                    <span className="text-footnote text-fg-3">%</span>
                  </div>
                ) : value.type === "shares" ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Fewer shares for ${name}`}
                      onClick={() =>
                        onChange({
                          ...value,
                          shares: {
                            ...value.shares,
                            [member.id]: Math.max(0, (value.shares[member.id] ?? 1) - 1),
                          },
                        })
                      }
                      className="flex size-8 items-center justify-center rounded-full glass-soft text-fg-2 transition-transform duration-150 active:scale-[0.9]"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center text-body font-semibold tabular-nums">
                      {value.shares[member.id] ?? 1}x
                    </span>
                    <button
                      type="button"
                      aria-label={`More shares for ${name}`}
                      onClick={() =>
                        onChange({
                          ...value,
                          shares: {
                            ...value.shares,
                            [member.id]: Math.min(99, (value.shares[member.id] ?? 1) + 1),
                          },
                        })
                      }
                      className="flex size-8 items-center justify-center rounded-full glass-soft text-fg-2 transition-transform duration-150 active:scale-[0.9]"
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
