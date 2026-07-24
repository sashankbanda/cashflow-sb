"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { AmountKeypad } from "@/components/ui/AmountKeypad";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { amountToMinor, isValidAmount, minorToAmount } from "@/lib/amount-input";
import { useAction } from "@/hooks/useAction";
import { CategoryBadge } from "@/features/categories/icons";
import type { CategoryOption } from "@/features/categories/queries";
import { deleteBudgetAction, setBudgetAction } from "../actions";

/** Fixed target when editing an existing budget (null categoryId = overall). */
export interface BudgetTarget {
  budgetId: string;
  categoryId: string | null;
  name: string;
  amountMinor: number;
}

interface BudgetFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** Provided when editing; omit to create a new budget. */
  target?: BudgetTarget;
  /** Categories with no budget yet (create mode only). */
  addable: ReadonlyArray<CategoryOption>;
  /** Whether an overall budget already exists (create mode only). */
  hasOverall: boolean;
}

type Pick = { categoryId: string | null; name: string; icon: string; gradient: string };

function Form({
  target,
  addable,
  hasOverall,
  onClose,
}: {
  target?: BudgetTarget;
  addable: ReadonlyArray<CategoryOption>;
  hasOverall: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const editing = target !== undefined;

  const choices = useMemo<Pick[]>(() => {
    const list: Pick[] = [];
    if (!hasOverall) {
      list.push({ categoryId: null, name: "Overall", icon: "wallet", gradient: "aurora" });
    }
    for (const category of addable) {
      list.push({
        categoryId: category.id,
        name: category.name,
        icon: category.icon,
        gradient: category.gradient,
      });
    }
    return list;
  }, [addable, hasOverall]);

  const [picked, setPicked] = useState<Pick | null>(
    editing ? { categoryId: target.categoryId, name: target.name, icon: "", gradient: "" } : null,
  );
  const [draft, setDraft] = useState(editing ? minorToAmount(target.amountMinor) : "");

  const save = useAction(setBudgetAction, {
    successMessage: "Budget saved",
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  const remove = useAction(deleteBudgetAction, {
    successMessage: "Budget removed",
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });

  const submit = () => {
    if (!picked || !isValidAmount(draft)) return;
    void save.execute({ categoryId: picked.categoryId, amountMinor: amountToMinor(draft) });
  };

  return (
    <form
      className="space-y-6 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {editing ? (
        <div className="flex items-center justify-center gap-3">
          {target.categoryId === null ? (
            <span className="flex size-10 items-center justify-center rounded-sm bg-grad-aurora text-white">
              <Wallet className="size-5" aria-hidden />
            </span>
          ) : null}
          <p className="text-headline">{target.name}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-caption text-fg-3 uppercase">Budget for</p>
          <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-1 pb-1">
            {choices.map((choice) => (
              <button
                key={choice.categoryId ?? "overall"}
                type="button"
                aria-pressed={picked?.categoryId === choice.categoryId}
                onClick={() => setPicked(choice)}
                className={cn(
                  "ease-out flex shrink-0 flex-col items-center gap-1.5 rounded-md p-2 transition-transform duration-150 active:scale-[0.95]",
                  picked?.categoryId === choice.categoryId
                    ? "bg-glass ring-1 ring-volt/60"
                    : "glass-soft",
                )}
              >
                {choice.categoryId === null ? (
                  <span className="flex size-10 items-center justify-center rounded-sm bg-grad-aurora text-white">
                    <Wallet className="size-5" aria-hidden />
                  </span>
                ) : (
                  <CategoryBadge icon={choice.icon} gradient={choice.gradient} />
                )}
                <span className="max-w-16 truncate text-caption text-fg-2">{choice.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg glass-soft py-5">
        <AmountDisplay value={draft} />
      </div>
      <AmountKeypad value={draft} onChange={setDraft} />

      <Button
        type="submit"
        variant="volt"
        block
        size="lg"
        loading={save.pending}
        disabled={!picked || !isValidAmount(draft)}
      >
        {editing ? "Save budget" : "Set budget"}
      </Button>

      {editing ? (
        <Button
          type="button"
          variant="ghost"
          block
          loading={remove.pending}
          onClick={() => void remove.execute({ budgetId: target.budgetId })}
        >
          Remove budget
        </Button>
      ) : null}
    </form>
  );
}

/** Create or edit a monthly budget with the in-app keypad. */
export function BudgetFormSheet({
  open,
  onClose,
  target,
  addable,
  hasOverall,
}: BudgetFormSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={target ? "Edit budget" : "New budget"}>
      <Form
        key={String(open)}
        target={target}
        addable={addable}
        hasOverall={hasOverall}
        onClose={onClose}
      />
    </Sheet>
  );
}
