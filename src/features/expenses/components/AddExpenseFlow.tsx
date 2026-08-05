"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Users, X } from "lucide-react";
import { parseISO } from "date-fns";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { AmountKeypad } from "@/components/ui/AmountKeypad";
import { Button } from "@/components/ui/Button";
import { DateChip } from "@/components/ui/DateChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { easeStandard } from "@/components/motion/transitions";
import { cn } from "@/lib/cn";
import { amountToMinor, isValidAmount } from "@/lib/amount-input";
import { formatISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { enqueueExpense } from "@/lib/outbox";
import { toast } from "@/components/ui/Toast";
import { useAction } from "@/hooks/useAction";
import type { CategoryOption } from "@/features/categories/queries";
import { CategoryGlyph } from "@/features/categories/icons";
import { TagPicker } from "@/features/categories/components/TagPicker";
import type { TagOption } from "@/features/categories/tags-service";
import { asPalette, paletteBg } from "@/components/ui/palette";
import type { GroupSummary } from "@/features/groups/queries";
import { createRecurringRuleAction } from "@/features/recurring/actions";
import {
  RecurrencePicker,
  type RecurrenceValue,
} from "@/features/recurring/components/RecurrencePicker";
import { createExpenseAction, createPersonalExpenseAction, updateExpenseAction } from "../actions";
import {
  emptyPayerDraft,
  emptySplitDraft,
  payerDraftToPayers,
  splitDraftToParticipants,
  type PayerDraft,
  type SplitDraft,
} from "../split-draft";
import { PayerEditor } from "./PayerEditor";
import { SplitEditor } from "./SplitEditor";

/** Prefill for edit mode, derived from a TimelineExpense. */
export interface ExpenseEditInitial {
  expenseId: string;
  description: string;
  amount: string;
  categoryId: string;
  expenseDate: string;
  splitDraft: SplitDraft;
  payerDraft: PayerDraft;
}

export interface AddExpenseFlowProps {
  open: boolean;
  onClose: () => void;
  groups: ReadonlyArray<GroupSummary>;
  categories: ReadonlyArray<CategoryOption>;
  /** Preselected group (when opened from a group screen). */
  defaultGroupId?: string;
  /** The signed-in user's id, to preselect "you" as payer. */
  viewerUserId: string;
  /** Provide to edit an existing expense instead of creating one. */
  initial?: ExpenseEditInitial;
  /** Offer a "Personal" context that skips payer/split (dock entry). */
  allowPersonal?: boolean;
  /** The user's tags, for the create-path tag picker. */
  availableTags?: ReadonlyArray<TagOption>;
}

/** Sentinel groupId for the personal (no-group) context. */
const PERSONAL = "__personal__";

/** 1 = amount · 2 = details · 3 = who paid (group) · 4 = split (group). */
type Step = 1 | 2 | 3 | 4;

interface Draft {
  groupId: string;
  amount: string;
  description: string;
  categoryId: string;
  date: Date;
  payer: PayerDraft;
  split: SplitDraft;
  tagIds: string[];
}

function stepTitle(step: Step, editing: boolean, income: boolean): string {
  if (step === 1) return editing ? "Edit expense" : income ? "Add income" : "Add expense";
  if (step === 2) return "Details";
  return step === 3 ? "Who paid?" : "Split it";
}

function Flow({
  onClose,
  groups,
  categories,
  defaultGroupId,
  viewerUserId,
  initial,
  allowPersonal = false,
  availableTags = [],
}: Omit<AddExpenseFlowProps, "open">) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const editing = Boolean(initial);
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [recurrence, setRecurrence] = useState<RecurrenceValue>({
    enabled: false,
    frequency: "monthly",
  });
  // Personal entries can be a spend or income (money in). Groups are spends.
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");

  const initialGroup = groups.find((group) => group.id === defaultGroupId) ?? groups[0] ?? null;
  // From within a group → that group; from the global dock → Personal;
  // otherwise the first group.
  const initialContext = defaultGroupId ?? (allowPersonal ? PERSONAL : (initialGroup?.id ?? ""));
  const initialMemberIds = initialGroup?.members.map((member) => member.id) ?? [];
  const viewerMemberOf = (group: GroupSummary | null): string | null =>
    group?.members.find((member) => member.userId === viewerUserId)?.id ?? null;

  const [draft, setDraft] = useState<Draft>(() => ({
    groupId: initialContext,
    amount: initial?.amount ?? "",
    description: initial?.description ?? "",
    categoryId: initial?.categoryId ?? categories[0]?.id ?? "",
    date: initial ? parseISO(initial.expenseDate) : new Date(),
    payer:
      initial?.payerDraft ??
      emptyPayerDraft(viewerMemberOf(initialGroup) ?? initialGroup?.members[0]?.id ?? null),
    split: initial?.splitDraft ?? emptySplitDraft(initialMemberIds),
    tagIds: [],
  }));

  const isPersonal = draft.groupId === PERSONAL;
  const isIncomeEntry = isPersonal && entryType === "income";
  const group = groups.find((candidate) => candidate.id === draft.groupId) ?? null;

  const create = useAction(createExpenseAction, {
    successMessage: "Expense added",
    optimistic: false, // group-timeline overlay deferred (DECISIONS D1.3)
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  const createPersonal = useAction(createPersonalExpenseAction, {
    successMessage: "Expense added",
    optimistic: false, // personal add is optimistic via the outbox; this is the no-IndexedDB fallback
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  const update = useAction(updateExpenseAction, {
    successMessage: "Expense updated",
    optimistic: false, // edit; group-timeline overlay deferred (DECISIONS D1.3)
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  const createRecurring = useAction(createRecurringRuleAction, {
    successMessage: "Recurring expense added",
    optimistic: false, // creates a rule shown on another screen
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  const pending =
    create.pending || update.pending || createPersonal.pending || createRecurring.pending;
  const fieldError = (field: string) =>
    create.fieldError(field) ??
    update.fieldError(field) ??
    createPersonal.fieldError(field) ??
    createRecurring.fieldError(field);

  const amountMinor = amountToMinor(draft.amount);
  const payerResult = payerDraftToPayers(draft.payer, amountMinor);
  const splitResult = splitDraftToParticipants(draft.split, amountMinor);

  const goTo = (next: Step) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const selectContext = (groupId: string) => {
    const nextGroup = groups.find((candidate) => candidate.id === groupId) ?? null;
    setDraft((current) => ({
      ...current,
      groupId,
      payer: emptyPayerDraft(viewerMemberOf(nextGroup) ?? nextGroup?.members[0]?.id ?? null),
      split: emptySplitDraft(nextGroup?.members.map((member) => member.id) ?? []),
    }));
  };

  const submitPersonal = async () => {
    if (recurrence.enabled) {
      void createRecurring.execute({
        template: {
          kind: "personal",
          description: draft.description,
          amountMinor,
          categoryId: draft.categoryId,
          tagIds: draft.tagIds,
          isIncome: entryType === "income",
        },
        frequency: recurrence.frequency,
        interval: 1,
        startsOn: formatISODate(draft.date),
      });
      return;
    }
    // One code path online and offline: queue to the outbox. It renders an
    // instant optimistic row (PendingExpenses) and OutboxSync flushes it to the
    // server — immediately when online, on reconnect when offline. The
    // idempotency key dedupes any replay, so this can never double-charge.
    const category = categories.find((option) => option.id === draft.categoryId);
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    const income = entryType === "income";
    const queued = await enqueueExpense({
      id: idempotencyKey,
      attempts: 0,
      payload: {
        description: draft.description,
        amountMinor,
        categoryId: draft.categoryId,
        expenseDate: formatISODate(draft.date),
        tagIds: draft.tagIds,
        isIncome: income,
        categoryName: category?.name ?? "Other",
        categoryIcon: category?.icon ?? "shapes",
        categoryGradient: category?.gradient ?? "ocean",
      },
    });
    if (queued) {
      toast.success(
        offline
          ? "Saved offline — will sync when you reconnect"
          : income
            ? "Income added"
            : "Expense added",
      );
      onClose();
      return;
    }
    // No IndexedDB (private mode / unsupported) — no optimistic queue possible,
    // so write straight to the server; its onSuccess closes and refreshes.
    void createPersonal.execute({
      description: draft.description,
      amountMinor,
      categoryId: draft.categoryId,
      expenseDate: formatISODate(draft.date),
      idempotencyKey,
      tagIds: draft.tagIds,
      isIncome: income,
    });
  };

  const submit = () => {
    if (!group || !payerResult.ok || !splitResult.ok) return;
    const core = {
      groupId: group.id,
      description: draft.description,
      amountMinor,
      categoryId: draft.categoryId,
      expenseDate: formatISODate(draft.date),
      splitType: draft.split.type,
      participants: splitResult.participants,
      payers: payerResult.payers,
    };
    if (editing && initial) {
      void update.execute({ ...core, expenseId: initial.expenseId });
    } else if (recurrence.enabled) {
      void createRecurring.execute({
        template: {
          kind: "group",
          groupId: group.id,
          description: draft.description,
          amountMinor,
          categoryId: draft.categoryId,
          splitType: draft.split.type,
          participants: splitResult.participants,
          payers: payerResult.payers,
          tagIds: draft.tagIds,
        },
        frequency: recurrence.frequency,
        interval: 1,
        startsOn: formatISODate(draft.date),
      });
    } else {
      void create.execute({ ...core, idempotencyKey, tagIds: draft.tagIds });
    }
  };

  // One decision per screen: step 1 needs only a valid amount; step 2 the details.
  const amountValid = (isPersonal || Boolean(group)) && isValidAmount(draft.amount);
  const detailsValid = draft.description.trim().length > 0 && draft.categoryId !== "";
  const steps: Step[] = isPersonal ? [1, 2] : [1, 2, 3, 4];

  if (groups.length === 0 && !allowPersonal) {
    return (
      <EmptyState
        icon={<Users />}
        palette="ocean"
        title="Create a group first"
        description="Expenses live in groups. Start one from the Groups tab, then add your first expense."
        action={
          <Button
            variant="volt"
            size="sm"
            onClick={() => {
              onClose();
              router.push("/groups");
            }}
          >
            Go to Groups
          </Button>
        }
      />
    );
  }

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: reducedMotion ? 0 : dir * 48 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: reducedMotion ? 0 : dir * -48 }),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between pb-3">
        {step > 1 ? (
          <IconButton
            aria-label="Back"
            size="sm"
            variant="ghost"
            onClick={() => goTo((step - 1) as Step)}
          >
            <ArrowLeft />
          </IconButton>
        ) : (
          <IconButton aria-label="Close" size="sm" variant="ghost" onClick={onClose}>
            <X />
          </IconButton>
        )}
        <h2 className="text-headline">{stepTitle(step, editing, isIncomeEntry)}</h2>
        <div
          className="flex w-9 items-center justify-center gap-1"
          aria-label={`Step ${step} of ${steps.length}`}
        >
          {steps.map((dot) => (
            <span
              key={dot}
              aria-hidden
              className={cn(
                "size-1.5 rounded-full transition-colors duration-250",
                dot === step ? "bg-volt" : "bg-handle",
              )}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={easeStandard}
          className="min-h-0 flex-1"
        >
          {step === 1 ? (
            /* Step 1 — just the amount. One decision, nothing else on screen. */
            <div className="flex h-full flex-col gap-4">
              {!editing && (groups.length > 1 || allowPersonal) ? (
                <Select
                  sheetTitle="Add to"
                  value={draft.groupId}
                  onChange={selectContext}
                  options={[
                    ...(allowPersonal ? [{ value: PERSONAL, label: "🧍 Personal" }] : []),
                    ...groups.map((candidate) => ({
                      value: candidate.id,
                      label: `${candidate.emoji ? `${candidate.emoji} ` : ""}${candidate.name}`,
                    })),
                  ]}
                />
              ) : (
                <p className="text-center text-footnote text-fg-3">
                  {isPersonal
                    ? "🧍 Personal"
                    : `${group?.emoji ? `${group.emoji} ` : ""}${group?.name}`}
                </p>
              )}

              {isPersonal && !editing ? (
                <SegmentedControl
                  aria-label="Entry type"
                  value={entryType}
                  onChange={setEntryType}
                  options={[
                    { value: "expense", label: "Expense" },
                    { value: "income", label: "Income" },
                  ]}
                />
              ) : null}

              <div className="flex flex-1 flex-col items-center justify-center gap-1.5">
                <p className="text-caption text-fg-3 uppercase">
                  {isIncomeEntry ? "How much came in?" : "How much was it?"}
                </p>
                <AmountDisplay value={draft.amount} />
              </div>

              <div className="mt-auto">
                <AmountKeypad
                  value={draft.amount}
                  onChange={(amount) => setDraft((current) => ({ ...current, amount }))}
                />
                <Button
                  variant="volt"
                  block
                  size="lg"
                  className="mt-3"
                  disabled={!amountValid}
                  onClick={() => goTo(2)}
                >
                  Next · {formatMoney(amountMinor)}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            /* Step 2 — the details, clearly labelled, everything visible. */
            <div className="flex h-full flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
                <TextField
                  label={isIncomeEntry ? "What's it from?" : "What was it for?"}
                  placeholder={isIncomeEntry ? "e.g. Salary" : "e.g. Lunch"}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  error={fieldError("description")}
                  autoFocus={draft.description === ""}
                  maxLength={80}
                />

                <div className="space-y-2">
                  <p className="text-caption text-fg-3 uppercase">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => {
                      const selected = category.id === draft.categoryId;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() =>
                            setDraft((current) => ({ ...current, categoryId: category.id }))
                          }
                          className={cn(
                            "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-footnote",
                            "ease-out transition-[transform,background-color] duration-150 active:scale-[0.97]",
                            selected
                              ? cn("text-white", paletteBg[asPalette(category.gradient)])
                              : "glass-soft text-fg-2",
                          )}
                        >
                          <CategoryGlyph icon={category.icon} className="size-4" />
                          {category.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-caption text-fg-3 uppercase">Date</p>
                  <DateChip
                    value={draft.date}
                    onChange={(date) => setDraft((current) => ({ ...current, date }))}
                  />
                </div>

                {!editing ? (
                  <TagPicker
                    available={availableTags}
                    selected={draft.tagIds}
                    onChange={(tagIds) => setDraft((current) => ({ ...current, tagIds }))}
                  />
                ) : null}

                {!editing ? <RecurrencePicker value={recurrence} onChange={setRecurrence} /> : null}
              </div>

              <div className="pt-3">
                <Button
                  variant="volt"
                  block
                  size="lg"
                  loading={isPersonal && pending}
                  disabled={!detailsValid}
                  onClick={() => {
                    if (isPersonal) void submitPersonal();
                    else goTo(3);
                  }}
                >
                  {isPersonal
                    ? `Add ${isIncomeEntry ? "income" : "expense"} · ${formatMoney(amountMinor)}`
                    : "Next"}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 && group ? (
            <div className="flex h-full flex-col">
              <PayerEditor
                members={group.members}
                viewerUserId={viewerUserId}
                amountMinor={amountMinor}
                value={draft.payer}
                onChange={(payer) => setDraft((current) => ({ ...current, payer }))}
              />
              <div className="mt-auto pt-3">
                <Button
                  variant="volt"
                  block
                  size="lg"
                  disabled={!payerResult.ok}
                  onClick={() => goTo(4)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}

          {step === 4 && group ? (
            <div className="flex h-full flex-col">
              <SplitEditor
                members={group.members}
                viewerUserId={viewerUserId}
                amountMinor={amountMinor}
                value={draft.split}
                onChange={(split) => setDraft((current) => ({ ...current, split }))}
              />
              <div className="mt-auto pt-3">
                <Button
                  variant="volt"
                  block
                  size="lg"
                  loading={pending}
                  disabled={!splitResult.ok}
                  onClick={submit}
                >
                  {editing ? "Save changes" : "Add expense"} · {formatMoney(amountMinor)}
                </Button>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The 3-step expense flow (create or edit) inside a full-height sheet. */
export function AddExpenseFlow({ open, onClose, ...props }: AddExpenseFlowProps) {
  return (
    <Sheet open={open} onClose={onClose} detent="full" hideHeader contentClassName="flex flex-col">
      <Flow key={String(open)} onClose={onClose} {...props} />
    </Sheet>
  );
}
