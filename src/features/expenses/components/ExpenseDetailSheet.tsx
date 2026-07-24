"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Sheet } from "@/components/ui/Sheet";
import { formatDayLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { minorToAmount } from "@/lib/amount-input";
import { useAction } from "@/hooks/useAction";
import { useSheet } from "@/hooks/useSheet";
import { deleteExpenseAction } from "../actions";
import type { CategoryOption } from "@/features/categories/queries";
import { CategoryBadge } from "@/features/categories/icons";
import type { GroupDetail } from "@/features/groups/queries";
import type { ExpensePartyLine, TimelineExpense } from "../queries";
import type { PayerDraft, SplitDraft } from "../split-draft";
import { AddExpenseFlow, type ExpenseEditInitial } from "./AddExpenseFlow";

function toEditInitial(expense: TimelineExpense): ExpenseEditInitial {
  const included = expense.splits.map((split) => split.memberId);
  const splitDraft: SplitDraft = {
    type: expense.splitType,
    included,
    exactAmounts:
      expense.splitType === "exact"
        ? Object.fromEntries(
            expense.splits.map((split) => [
              split.memberId,
              minorToAmount(Math.round(split.weight ?? split.amountMinor)),
            ]),
          )
        : {},
    percents:
      expense.splitType === "percent"
        ? Object.fromEntries(
            expense.splits.map((split) => [split.memberId, String(split.weight ?? 0)]),
          )
        : {},
    shares:
      expense.splitType === "shares"
        ? Object.fromEntries(
            expense.splits.map((split) => [split.memberId, Math.round(split.weight ?? 1)]),
          )
        : Object.fromEntries(included.map((memberId) => [memberId, 1])),
  };
  const payerDraft: PayerDraft =
    expense.payers.length > 1
      ? {
          mode: "multi",
          singleMemberId: null,
          selected: expense.payers.map((payer) => payer.memberId),
          amounts: Object.fromEntries(
            expense.payers.map((payer) => [payer.memberId, minorToAmount(payer.amountMinor)]),
          ),
        }
      : {
          mode: "single",
          singleMemberId: expense.payers[0]?.memberId ?? null,
          selected: [],
          amounts: {},
        };

  return {
    expenseId: expense.id,
    description: expense.description,
    amount: minorToAmount(expense.amountMinor),
    categoryId: expense.categoryId ?? "",
    expenseDate: expense.expenseDate,
    splitDraft,
    payerDraft,
  };
}

function weightNote(expense: TimelineExpense, line: ExpensePartyLine): string | null {
  if (expense.splitType === "percent" && line.weight !== null) return `${line.weight}%`;
  if (expense.splitType === "shares" && line.weight !== null) return `${line.weight}x`;
  return null;
}

function PartyList({
  title,
  lines,
  note,
}: {
  title: string;
  lines: ReadonlyArray<ExpensePartyLine>;
  note?: (line: ExpensePartyLine) => string | null;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-caption text-fg-3 uppercase">{title}</h3>
      <GlassCard elevation="inset" className="divide-y divide-white/6">
        {lines.map((line) => (
          <div key={line.memberId} className="flex items-center gap-3 p-3.5">
            <Avatar name={line.displayName} image={line.image} size="sm" />
            <span className="flex-1 truncate text-body">
              {line.isViewer ? "You" : line.displayName}
            </span>
            {note?.(line) ? (
              <span className="text-caption text-fg-3 tabular-nums">{note(line)}</span>
            ) : null}
            <span className="text-body font-semibold tabular-nums">
              {formatMoney(line.amountMinor)}
            </span>
          </div>
        ))}
      </GlassCard>
    </section>
  );
}

const SPLIT_LABEL: Record<TimelineExpense["splitType"], string> = {
  equal: "split equally",
  exact: "split by exact amounts",
  percent: "split by percentage",
  shares: "split by shares",
};

export interface ExpenseDetailSheetProps {
  expense: TimelineExpense | null;
  onClose: () => void;
  group: GroupDetail;
  categories: ReadonlyArray<CategoryOption>;
  viewerUserId: string;
}

/** Full expense breakdown with the edit entry point. */
const TRAIL_VERB_LABEL = {
  expense_added: "Added",
  expense_updated: "Edited",
  expense_deleted: "Deleted",
} as const;

export function ExpenseDetailSheet({
  expense,
  onClose,
  group,
  categories,
  viewerUserId,
}: ExpenseDetailSheetProps) {
  const router = useRouter();
  const editSheet = useSheet();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const remove = useAction(deleteExpenseAction, {
    successMessage: "Expense deleted",
    onSuccess: () => {
      setConfirmingDelete(false);
      onClose();
      router.refresh();
    },
  });

  const canEdit =
    expense !== null &&
    (expense.createdByUserId === viewerUserId ||
      expense.payers.some((payer) => payer.isViewer) ||
      group.myRole === "owner");

  return (
    <>
      <Sheet open={expense !== null} onClose={onClose} title="Expense">
        {expense ? (
          <div className="space-y-5 pt-1">
            <div className="flex items-start gap-3">
              <CategoryBadge
                icon={expense.category?.icon ?? "shapes"}
                gradient={expense.category?.gradient ?? "ocean"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-headline">{expense.description}</p>
                <p className="text-footnote text-fg-3">
                  {expense.category?.name ?? "Uncategorized"} ·{" "}
                  {formatDayLabel(parseISO(expense.expenseDate))} · {SPLIT_LABEL[expense.splitType]}
                </p>
              </div>
              <p className="shrink-0 text-title-2 tabular-nums">
                {formatMoney(expense.amountMinor)}
              </p>
            </div>

            <PartyList title="Paid by" lines={expense.payers} />
            <PartyList
              title={`Split ${expense.splits.length} way${expense.splits.length === 1 ? "" : "s"}`}
              lines={expense.splits}
              note={(line) => weightNote(expense, line)}
            />

            {expense.trail.length > 0 ? (
              <div className="space-y-1 px-1">
                {expense.trail.map((entry, index) => (
                  <p key={`${entry.at}-${index}`} className="text-caption text-fg-3">
                    {TRAIL_VERB_LABEL[entry.verb]} by {entry.actorName} ·{" "}
                    {formatDayLabel(new Date(entry.at))}
                  </p>
                ))}
              </div>
            ) : null}

            {canEdit ? (
              <div className="space-y-2">
                <Button variant="glass" block onClick={editSheet.open}>
                  <Pencil className="size-4" /> Edit expense
                </Button>
                {confirmingDelete ? (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      block
                      loading={remove.pending}
                      onClick={() =>
                        void remove.execute({ expenseId: expense.id, groupId: group.id })
                      }
                    >
                      <Trash2 className="size-4" /> Delete forever
                    </Button>
                    <Button variant="ghost" block onClick={() => setConfirmingDelete(false)}>
                      Keep it
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" block onClick={() => setConfirmingDelete(true)}>
                    <Trash2 className="size-4" /> Delete expense
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
      </Sheet>

      {expense ? (
        <AddExpenseFlow
          open={editSheet.isOpen}
          onClose={() => {
            editSheet.close();
            onClose();
          }}
          groups={[group]}
          categories={categories}
          defaultGroupId={group.id}
          viewerUserId={viewerUserId}
          initial={toEditInitial(expense)}
        />
      ) : null}
    </>
  );
}
