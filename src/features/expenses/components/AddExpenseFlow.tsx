"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, Check, Users, X } from "lucide-react";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { AmountKeypad } from "@/components/ui/AmountKeypad";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { DateChip } from "@/components/ui/DateChip";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Select";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { easeStandard } from "@/components/motion/transitions";
import { cn } from "@/lib/cn";
import { amountToMinor, isValidAmount } from "@/lib/amount-input";
import { formatISODate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { computeSplits } from "@/lib/split";
import { useAction } from "@/hooks/useAction";
import type { CategoryOption } from "@/features/categories/queries";
import { CategoryGlyph } from "@/features/categories/icons";
import { asPalette, paletteBg } from "@/components/ui/palette";
import type { GroupSummary } from "@/features/groups/queries";
import { createExpenseAction } from "../actions";

export interface AddExpenseFlowProps {
  open: boolean;
  onClose: () => void;
  groups: ReadonlyArray<GroupSummary>;
  categories: ReadonlyArray<CategoryOption>;
  /** Preselected group (when opened from a group screen). */
  defaultGroupId?: string;
  /** The signed-in user's id, to preselect "you" as payer. */
  viewerUserId: string;
}

type Step = 1 | 2 | 3;

interface Draft {
  groupId: string;
  amount: string;
  description: string;
  categoryId: string;
  date: Date;
  payerMemberId: string | null;
  participantIds: ReadonlySet<string>;
}

function stepTitle(step: Step): string {
  return step === 1 ? "Add expense" : step === 2 ? "Who paid?" : "Split it";
}

function Flow({
  onClose,
  groups,
  categories,
  defaultGroupId,
  viewerUserId,
}: Omit<AddExpenseFlowProps, "open">) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const initialGroup = groups.find((group) => group.id === defaultGroupId) ?? groups[0] ?? null;

  const [draft, setDraft] = useState<Draft>(() => ({
    groupId: initialGroup?.id ?? "",
    amount: "",
    description: "",
    categoryId: categories[0]?.id ?? "",
    date: new Date(),
    payerMemberId: null,
    participantIds: new Set(initialGroup?.members.map((member) => member.id) ?? []),
  }));

  const group = groups.find((candidate) => candidate.id === draft.groupId) ?? null;
  const myMemberId = group?.members.find((member) => member.userId === viewerUserId)?.id ?? null;

  const create = useAction(createExpenseAction, {
    successMessage: "Expense added",
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  const amountMinor = amountToMinor(draft.amount);
  const participants = useMemo(() => [...draft.participantIds], [draft.participantIds]);
  const perHead = useMemo(() => {
    if (amountMinor <= 0 || participants.length === 0) return new Map<string, number>();
    const shares = computeSplits({
      amountMinor,
      type: "equal",
      participants: participants.map((memberId) => ({ memberId })),
    });
    return new Map(shares.map((share) => [share.memberId, share.amountMinor]));
  }, [amountMinor, participants]);

  const goTo = (next: Step) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const selectGroup = (groupId: string) => {
    const nextGroup = groups.find((candidate) => candidate.id === groupId);
    setDraft((current) => ({
      ...current,
      groupId,
      payerMemberId: null,
      participantIds: new Set(nextGroup?.members.map((member) => member.id) ?? []),
    }));
  };

  const toggleParticipant = (memberId: string) => {
    setDraft((current) => {
      const next = new Set(current.participantIds);
      if (next.has(memberId)) {
        if (next.size > 1) next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return { ...current, participantIds: next };
    });
  };

  const submit = () => {
    if (!group || !effectivePayerId) return;
    void create.execute({
      groupId: group.id,
      description: draft.description,
      amountMinor,
      categoryId: draft.categoryId,
      expenseDate: formatISODate(draft.date),
      paidByMemberId: effectivePayerId,
      participantMemberIds: participants,
      idempotencyKey,
    });
  };

  const effectivePayerId = draft.payerMemberId ?? myMemberId ?? group?.members[0]?.id ?? null;
  const step1Valid =
    Boolean(group) &&
    isValidAmount(draft.amount) &&
    draft.description.trim().length > 0 &&
    draft.categoryId !== "";

  if (groups.length === 0) {
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
        <h2 className="text-headline">{stepTitle(step)}</h2>
        <div
          className="flex w-9 items-center justify-center gap-1"
          aria-label={`Step ${step} of 3`}
        >
          {[1, 2, 3].map((dot) => (
            <span
              key={dot}
              aria-hidden
              className={cn(
                "size-1.5 rounded-full transition-colors duration-250",
                dot === step ? "bg-volt" : "bg-white/20",
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
            <div className="flex h-full flex-col gap-4">
              {groups.length > 1 ? (
                <Select
                  sheetTitle="Group"
                  value={draft.groupId}
                  onChange={selectGroup}
                  options={groups.map((candidate) => ({
                    value: candidate.id,
                    label: `${candidate.emoji ? `${candidate.emoji} ` : ""}${candidate.name}`,
                  }))}
                />
              ) : (
                <p className="text-center text-footnote text-fg-3">
                  {group?.emoji ? `${group.emoji} ` : ""}
                  {group?.name}
                </p>
              )}

              <AmountDisplay value={draft.amount} className="py-2" />

              <TextField
                placeholder="What was it for?"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
                error={create.fieldError("description")}
                maxLength={80}
              />

              <div className="-mx-5 scrollbar-none flex gap-2 overflow-x-auto px-5">
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
                        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-footnote",
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

              <div className="flex justify-center">
                <DateChip
                  value={draft.date}
                  onChange={(date) => setDraft((current) => ({ ...current, date }))}
                />
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
                  disabled={!step1Valid}
                  onClick={() => goTo(2)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}

          {step === 2 && group ? (
            <div className="flex h-full flex-col gap-2">
              <ul className="space-y-1.5">
                {group.members.map((member) => {
                  const selected = member.id === effectivePayerId;
                  return (
                    <li key={member.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          setDraft((current) => ({ ...current, payerMemberId: member.id }))
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md p-3.5 text-left",
                          "ease-out transition-colors duration-150",
                          selected ? "glass" : "glass-soft hover:bg-glass",
                        )}
                      >
                        <Avatar name={member.displayName} image={member.image} size="sm" />
                        <span className="flex-1 truncate text-body">
                          {member.userId === viewerUserId ? "You" : member.displayName}
                        </span>
                        {selected ? <Check className="size-5 text-volt" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-auto pt-3">
                <Button variant="volt" block size="lg" onClick={() => goTo(3)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 && group ? (
            <div className="flex h-full flex-col gap-2">
              <p className="pb-1 text-center text-footnote text-fg-3">
                Splitting {formatMoney(amountMinor)} equally
              </p>
              <ul className="space-y-1.5">
                {group.members.map((member) => {
                  const included = draft.participantIds.has(member.id);
                  const share = perHead.get(member.id) ?? 0;
                  return (
                    <li key={member.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={included}
                        onClick={() => toggleParticipant(member.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md p-3.5 text-left",
                          "ease-out transition-[background-color,opacity] duration-150",
                          included ? "glass" : "glass-soft opacity-50 hover:opacity-80",
                        )}
                      >
                        <Avatar name={member.displayName} image={member.image} size="sm" />
                        <span className="flex-1 truncate text-body">
                          {member.userId === viewerUserId ? "You" : member.displayName}
                        </span>
                        {included ? (
                          <span className="text-footnote text-fg-2 tabular-nums">
                            {formatMoney(share)}
                          </span>
                        ) : (
                          <span className="text-caption text-fg-3 uppercase">out</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-auto pt-3">
                <Button
                  variant="volt"
                  block
                  size="lg"
                  loading={create.pending}
                  disabled={participants.length === 0}
                  onClick={submit}
                >
                  Add expense · {formatMoney(amountMinor)}
                </Button>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** The 3-step expense flow inside a full-height sheet. */
export function AddExpenseFlow({ open, onClose, ...props }: AddExpenseFlowProps) {
  return (
    <Sheet open={open} onClose={onClose} detent="full" hideHeader contentClassName="flex flex-col">
      <Flow key={String(open)} onClose={onClose} {...props} />
    </Sheet>
  );
}
