"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, PartyPopper } from "lucide-react";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { AmountKeypad } from "@/components/ui/AmountKeypad";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { amountToMinor, isValidAmount, minorToAmount } from "@/lib/amount-input";
import { formatMoney } from "@/lib/format";
import { simplifyDebts, type Transfer } from "@/lib/settle";
import { useAction } from "@/hooks/useAction";
import type { GroupBalances, MemberBalance } from "@/features/balances/queries";
import { recordSettlementAction } from "../actions";

type Method = "cash" | "upi" | "bank" | "other";

export interface SettleUpSheetProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  balances: GroupBalances;
  viewerUserId: string;
}

function memberOf(balances: GroupBalances, memberId: string): MemberBalance | undefined {
  return balances.members.find((member) => member.memberId === memberId);
}

/** Suggested minimal transfers → tap → record (full or partial, any method). */
export function SettleUpSheet({
  open,
  onClose,
  groupId,
  balances,
  viewerUserId,
}: SettleUpSheetProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Transfer | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("upi");
  const [note, setNote] = useState("");

  const suggestions = useMemo(() => {
    const transfers = simplifyDebts(
      balances.members.map((member) => ({
        memberId: member.memberId,
        netMinor: member.netMinor,
      })),
    );
    const involvesViewer = (transfer: Transfer) =>
      memberOf(balances, transfer.fromMemberId)?.userId === viewerUserId ||
      memberOf(balances, transfer.toMemberId)?.userId === viewerUserId;
    return [...transfers].sort((a, b) => Number(involvesViewer(b)) - Number(involvesViewer(a)));
  }, [balances, viewerUserId]);

  const record = useAction(recordSettlementAction, {
    successMessage: "Payment recorded",
    onSuccess: () => {
      setSelected(null);
      setAmount("");
      setNote("");
      onClose();
      router.refresh();
    },
  });

  const nameFor = (memberId: string): string => {
    const member = memberOf(balances, memberId);
    if (!member) return "Someone";
    return member.userId === viewerUserId ? "You" : member.displayName;
  };

  const pick = (transfer: Transfer) => {
    setSelected(transfer);
    setAmount(minorToAmount(transfer.amountMinor));
  };

  const submit = () => {
    if (!selected) return;
    void record.execute({
      groupId,
      fromMemberId: selected.fromMemberId,
      toMemberId: selected.toMemberId,
      amountMinor: amountToMinor(amount),
      method,
      note: note.trim() === "" ? undefined : note.trim(),
    });
  };

  return (
    <Sheet
      open={open}
      onClose={() => {
        setSelected(null);
        onClose();
      }}
      title="Settle up"
    >
      {selected === null ? (
        suggestions.length === 0 ? (
          <EmptyState
            icon={<PartyPopper />}
            palette="mint"
            title="All settled"
            description="Nobody owes anybody. Go celebrate."
          />
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-center text-footnote text-fg-3">
              {suggestions.length} transfer{suggestions.length === 1 ? "" : "s"} settles everyone
            </p>
            <ul className="space-y-2">
              {suggestions.map((transfer) => {
                const from = memberOf(balances, transfer.fromMemberId);
                const to = memberOf(balances, transfer.toMemberId);
                return (
                  <li key={`${transfer.fromMemberId}-${transfer.toMemberId}`}>
                    <button
                      type="button"
                      onClick={() => pick(transfer)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md glass p-4 text-left",
                        "ease-out transition-transform duration-150 active:scale-[0.98]",
                      )}
                    >
                      <Avatar name={from?.displayName ?? "?"} image={from?.image} size="sm" />
                      <ArrowRight className="size-4 shrink-0 text-fg-3" />
                      <Avatar name={to?.displayName ?? "?"} image={to?.image} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-body">
                        {nameFor(transfer.fromMemberId)} pays {nameFor(transfer.toMemberId)}
                      </span>
                      <span className="shrink-0 text-headline text-volt tabular-nums">
                        {formatMoney(transfer.amountMinor)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )
      ) : (
        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2">
            <IconButton
              aria-label="Back to suggestions"
              size="sm"
              variant="ghost"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft />
            </IconButton>
            <p className="text-body text-fg-2">
              {nameFor(selected.fromMemberId)} → {nameFor(selected.toMemberId)}
            </p>
          </div>

          <AmountDisplay value={amount} />
          <AmountKeypad value={amount} onChange={setAmount} />

          <SegmentedControl
            aria-label="Payment method"
            value={method}
            onChange={setMethod}
            options={[
              { value: "upi", label: "UPI" },
              { value: "cash", label: "Cash" },
              { value: "bank", label: "Bank" },
              { value: "other", label: "Other" },
            ]}
          />

          <TextField
            placeholder="Add a note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={140}
          />

          <Button
            variant="volt"
            block
            size="lg"
            loading={record.pending}
            disabled={!isValidAmount(amount)}
            onClick={submit}
          >
            Record payment · {formatMoney(amountToMinor(amount))}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
