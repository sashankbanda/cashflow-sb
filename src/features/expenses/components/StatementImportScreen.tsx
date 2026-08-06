"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/format";
import { parseStatementCsv, type StatementRow } from "@/lib/statement-parse";
import { useAction } from "@/hooks/useAction";
import { importStatementAction } from "../actions";

const PREVIEW_LIMIT = 500;

/**
 * Bank-statement import: paste or upload a CSV → preview every parsed entry →
 * one tap books the lot. Re-importing an overlapping statement is safe — rows
 * already in are skipped server-side by content-derived idempotency keys.
 */
export function StatementImportScreen() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState("");
  const [rows, setRows] = useState<StatementRow[] | null>(null);
  const [excluded, setExcluded] = useState<ReadonlySet<number>>(new Set());
  const [skippedLines, setSkippedLines] = useState(0);

  const importRows = useAction(importStatementAction, {
    successMessage: "Statement imported",
    optimistic: false, // bulk server write; the ledger re-renders on refresh
    onSuccess: () => router.push("/expenses"),
  });

  const preview = (text: string) => {
    const result = parseStatementCsv(text);
    if (result.rows.length === 0) {
      toast.error("Couldn't find entries — export your statement as CSV and try again.");
      return;
    }
    setRows(result.rows.slice(0, PREVIEW_LIMIT));
    setSkippedLines(result.skipped + Math.max(0, result.rows.length - PREVIEW_LIMIT));
    setExcluded(new Set());
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => preview(String(reader.result ?? ""));
    reader.onerror = () => toast.error("Couldn't read that file.");
    reader.readAsText(file);
  };

  const selected = rows?.filter((_, index) => !excluded.has(index)) ?? [];
  const spendMinor = selected.filter((row) => !row.isIncome).reduce((s, r) => s + r.amountMinor, 0);
  const incomeMinor = selected.filter((row) => row.isIncome).reduce((s, r) => s + r.amountMinor, 0);

  return (
    <div className="space-y-5">
      {rows === null ? (
        <>
          <GlassCard className="space-y-3 p-5">
            <p className="text-body text-fg-2">
              Backfill months of history in one go: export a statement from your bank as{" "}
              <span className="text-fg-1">CSV</span> (netbanking → account statement → download),
              then upload or paste it here. Dates, amounts and direction are read automatically;
              categories follow what you&apos;ve used before for each merchant.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
            <Button variant="volt" block size="lg" onClick={() => fileRef.current?.click()}>
              <FileUp className="size-4" /> Upload a CSV file
            </Button>
          </GlassCard>
          <GlassCard elevation="inset" className="space-y-3 p-5">
            <p className="text-caption text-fg-3 uppercase">Or paste the CSV text</p>
            <textarea
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
              rows={6}
              placeholder={"Date,Narration,Withdrawal Amt,Deposit Amt\n06/08/2026,UPI-SWIGGY,450.00,"}
              className="w-full rounded-md glass-soft p-3 text-[16px] text-fg-1 placeholder:text-fg-3"
            />
            <Button
              variant="glass"
              block
              disabled={pasted.trim() === ""}
              onClick={() => preview(pasted)}
            >
              Preview entries
            </Button>
          </GlassCard>
        </>
      ) : (
        <>
          <GlassCard className="space-y-1 p-5">
            <p className="text-headline">
              {selected.length} {selected.length === 1 ? "entry" : "entries"} ready
            </p>
            <p className="text-footnote text-fg-3">
              {formatMoney(spendMinor)} spending · {formatMoney(incomeMinor)} income
              {skippedLines > 0 ? ` · ${skippedLines} lines skipped` : ""}. Tap a row to leave it
              out. Already-imported rows are skipped automatically.
            </p>
          </GlassCard>
          <GlassCard elevation="inset" className="max-h-105 divide-y divide-hairline overflow-y-auto">
            {rows.map((row, index) => {
              const left = excluded.has(index);
              return (
                <button
                  key={`${row.date}-${index}`}
                  type="button"
                  aria-pressed={!left}
                  onClick={() =>
                    setExcluded((current) => {
                      const next = new Set(current);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      return next;
                    })
                  }
                  className={`ease-out flex w-full items-center gap-3 p-4 text-left transition-opacity duration-150 ${
                    left ? "opacity-40" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body text-fg-1">{row.description}</p>
                    <p className="text-footnote text-fg-3">{row.date}</p>
                  </div>
                  <p className={`text-body tabular-nums ${row.isIncome ? "text-positive" : "text-fg-1"}`}>
                    {row.isIncome ? "+" : ""}
                    {formatMoney(row.amountMinor)}
                  </p>
                </button>
              );
            })}
          </GlassCard>
          <div className="space-y-2">
            <Button
              variant="volt"
              block
              size="lg"
              loading={importRows.pending}
              disabled={selected.length === 0}
              onClick={() =>
                void importRows.execute({
                  rows: selected.map((row) => ({
                    date: row.date,
                    description: row.description,
                    amountMinor: row.amountMinor,
                    isIncome: row.isIncome,
                  })),
                })
              }
            >
              Import {selected.length} {selected.length === 1 ? "entry" : "entries"}
            </Button>
            <Button variant="ghost" block onClick={() => setRows(null)}>
              <Trash2 className="size-4" /> Start over
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
