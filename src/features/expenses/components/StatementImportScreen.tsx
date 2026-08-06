"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LockKeyhole, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { TextField } from "@/components/ui/TextField";
import { toast } from "@/components/ui/Toast";
import { formatMoney } from "@/lib/format";
import {
  parseStatementCsv,
  parseStatementLines,
  type StatementParseResult,
  type StatementRow,
} from "@/lib/statement-parse";
import { useAction } from "@/hooks/useAction";
import { extractPdfLines, PdfPasswordError } from "../pdf-statement";
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
  // A locked PDF waits here (on device) until the user types its password.
  const [lockedPdf, setLockedPdf] = useState<{ name: string; data: ArrayBuffer } | null>(null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const importRows = useAction(importStatementAction, {
    successMessage: "Statement imported",
    optimistic: false, // bulk server write; the ledger re-renders on refresh
    onSuccess: () => router.push("/expenses"),
  });

  const showResult = (result: StatementParseResult): boolean => {
    if (result.rows.length === 0) return false;
    setRows(result.rows.slice(0, PREVIEW_LIMIT));
    setSkippedLines(result.skipped + Math.max(0, result.rows.length - PREVIEW_LIMIT));
    setExcluded(new Set());
    setLockedPdf(null);
    setPassword("");
    return true;
  };

  const preview = (text: string) => {
    // CSV first; free-form lines (a PDF pasted as text) as the fallback.
    const ok =
      showResult(parseStatementCsv(text)) || showResult(parseStatementLines(text.split(/\r?\n/)));
    if (!ok) toast.error("Couldn't find entries — download the statement as CSV or PDF and try again.");
  };

  const processPdf = async (name: string, data: ArrayBuffer, pdfPassword?: string) => {
    setUnlocking(true);
    try {
      const lines = await extractPdfLines(data, pdfPassword);
      if (!showResult(parseStatementLines(lines))) {
        toast.error("Couldn't read entries from this PDF — a CSV export works best.");
        setLockedPdf(null);
      }
    } catch (error) {
      if (error instanceof PdfPasswordError) {
        setLockedPdf({ name, data });
        if (error.reason === "wrong") toast.error("That password didn't open it — try again.");
      } else {
        toast.error("Couldn't read that PDF.");
        setLockedPdf(null);
      }
    } finally {
      setUnlocking(false);
    }
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) void processPdf(file.name, reader.result);
      };
      reader.onerror = () => toast.error("Couldn't read that file.");
      reader.readAsArrayBuffer(file);
      return;
    }
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
      {rows === null && lockedPdf !== null ? (
        <GlassCard className="space-y-3 p-5">
          <div className="flex items-center gap-3">
            <LockKeyhole className="size-5 shrink-0 text-fg-2" />
            <p className="min-w-0 flex-1 truncate text-body text-fg-1">{lockedPdf.name}</p>
          </div>
          <p className="text-footnote text-fg-3">
            This statement is password-protected. Enter the password from your bank&apos;s email —
            usually your PAN, date of birth, or a mix (the email says which). It&apos;s used only
            on this phone to open the file; it&apos;s never sent anywhere.
          </p>
          <TextField
            type="password"
            placeholder="Statement password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && password.trim() !== "") {
                event.preventDefault();
                void processPdf(lockedPdf.name, lockedPdf.data, password.trim());
              }
            }}
            autoFocus
          />
          <Button
            variant="volt"
            block
            size="lg"
            loading={unlocking}
            disabled={password.trim() === ""}
            onClick={() => void processPdf(lockedPdf.name, lockedPdf.data, password.trim())}
          >
            Unlock & read entries
          </Button>
          <Button
            variant="ghost"
            block
            onClick={() => {
              setLockedPdf(null);
              setPassword("");
            }}
          >
            Choose a different file
          </Button>
        </GlassCard>
      ) : null}
      {rows === null && lockedPdf === null ? (
        <>
          <GlassCard className="space-y-3 p-5">
            <p className="text-body text-fg-2">
              Backfill months of history in one go: download a statement from your bank as{" "}
              <span className="text-fg-1">CSV or PDF</span> (netbanking → account statement),
              then upload it here. Password-protected PDFs work — you&apos;ll be asked for the
              password, and the file is read entirely on your phone. Dates, amounts and direction
              are read automatically; categories follow what you&apos;ve used before for each
              merchant.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.pdf,text/csv,text/plain,application/pdf"
              className="hidden"
              onChange={(event) => onFile(event.target.files?.[0])}
            />
            <Button
              variant="volt"
              block
              size="lg"
              loading={unlocking}
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="size-4" /> Upload a CSV or PDF
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
      ) : null}
      {rows !== null ? (
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
      ) : null}
    </div>
  );
}
