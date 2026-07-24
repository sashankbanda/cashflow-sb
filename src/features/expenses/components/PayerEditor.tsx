"use client";

import { Check } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { sanitizeAmountInput } from "@/lib/amount-input";
import { formatMoney } from "@/lib/format";
import type { GroupMemberSummary } from "@/features/groups/queries";
import { payerDraftToPayers, type PayerDraft } from "../split-draft";

export interface PayerEditorProps {
  members: ReadonlyArray<GroupMemberSummary>;
  viewerUserId: string;
  amountMinor: number;
  value: PayerDraft;
  onChange: (draft: PayerDraft) => void;
}

/** The payer step: one payer (radio) or a split payment with live remainder. */
export function PayerEditor({
  members,
  viewerUserId,
  amountMinor,
  value,
  onChange,
}: PayerEditorProps) {
  const result = payerDraftToPayers(value, amountMinor);

  const toggleMulti = (memberId: string) => {
    const selected = value.selected.includes(memberId)
      ? value.selected.filter((id) => id !== memberId)
      : [...value.selected, memberId];
    onChange({ ...value, selected });
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <SegmentedControl
        aria-label="Payment mode"
        value={value.mode}
        onChange={(mode) => onChange({ ...value, mode })}
        options={[
          { value: "single", label: "One person" },
          { value: "multi", label: "Split payment" },
        ]}
      />

      {value.mode === "multi" ? (
        <p
          role="status"
          className={cn("text-center text-footnote", result.ok ? "text-fg-3" : "text-warning")}
        >
          {result.ok ? `${formatMoney(amountMinor)} covered` : result.message}
        </p>
      ) : null}

      <ul className="space-y-1.5">
        {members.map((member) => {
          const name = member.userId === viewerUserId ? "You" : member.displayName;
          if (value.mode === "single") {
            const selected = member.id === value.singleMemberId;
            return (
              <li key={member.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ ...value, singleMemberId: member.id })}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md p-3.5 text-left",
                    "ease-out transition-colors duration-150",
                    selected ? "glass" : "glass-soft hover:bg-glass",
                  )}
                >
                  <Avatar name={member.displayName} image={member.image} size="sm" />
                  <span className="flex-1 truncate text-body">{name}</span>
                  {selected ? <Check className="size-5 text-volt" /> : null}
                </button>
              </li>
            );
          }

          const selected = value.selected.includes(member.id);
          return (
            <li key={member.id}>
              <div
                className={cn(
                  "flex w-full items-center gap-3 rounded-md p-3 text-left",
                  "ease-out transition-[background-color,opacity] duration-150",
                  selected ? "glass" : "glass-soft opacity-50",
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  aria-label={`${name} paid`}
                  onClick={() => toggleMulti(member.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Avatar name={member.displayName} image={member.image} size="sm" />
                  <span className="flex-1 truncate text-body">{name}</span>
                </button>
                {selected ? (
                  <div className="flex items-center gap-1">
                    <span className="text-footnote text-fg-3">₹</span>
                    <input
                      inputMode="decimal"
                      aria-label={`Amount ${name} paid, in rupees`}
                      value={value.amounts[member.id] ?? ""}
                      placeholder="0"
                      onChange={(event) =>
                        onChange({
                          ...value,
                          amounts: {
                            ...value.amounts,
                            [member.id]: sanitizeAmountInput(event.target.value),
                          },
                        })
                      }
                      className="w-20 rounded-sm bg-glass-soft px-2 py-1.5 text-right text-body tabular-nums outline-none focus:ring-1 focus:ring-volt/60"
                    />
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
