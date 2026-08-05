"use client";

import { useRouter } from "next/navigation";
import { Copy, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "@/components/ui/Toast";
import { useAction } from "@/hooks/useAction";
import { generateCaptureTokenAction, revokeCaptureTokenAction } from "../actions";

async function copy(label: string, value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Couldn't copy — long-press the text instead.");
  }
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-caption text-fg-3 uppercase">{label}</p>
      <button
        type="button"
        onClick={() => void copy(label, value)}
        className="ease-out flex w-full items-center gap-2 rounded-md glass-soft p-3 text-left transition-colors duration-150 active:bg-glass"
      >
        <span className="min-w-0 flex-1 truncate text-footnote text-fg-1">{value}</span>
        <Copy className="size-4 shrink-0 text-fg-3" />
      </button>
    </div>
  );
}

/** Token management + the two iPhone Shortcut recipes, with copyable values. */
export function CaptureSettings({ token, origin }: { token: string | null; origin: string }) {
  const router = useRouter();
  const generate = useAction(generateCaptureTokenAction, {
    successMessage: "Token ready",
    optimistic: false, // shows the new secret; must come from the server
    onSuccess: () => router.refresh(),
  });
  const revoke = useAction(revokeCaptureTokenAction, {
    successMessage: "Auto-capture disabled",
    optimistic: false, // security state; reflect the server
    onSuccess: () => router.refresh(),
  });

  const endpoint = `${origin}/api/capture`;
  const exampleBody = token
    ? `{"token":"${token}","text":"[Shortcut Input]"}`
    : `{"token":"YOUR-TOKEN","text":"[Shortcut Input]"}`;

  return (
    <div className="space-y-5">
      <GlassCard className="space-y-4 p-5">
        <p className="text-body text-fg-2">
          Bank SMS in, expense saved — automatically. Your phone sends each payment message to
          your private Cashflow address; the amount and payee are read out and saved, and a
          notification asks you to pick the category.
        </p>
        {token === null ? (
          <Button
            variant="volt"
            block
            size="lg"
            loading={generate.pending}
            onClick={() => void generate.execute({})}
          >
            Turn on auto-capture
          </Button>
        ) : (
          <div className="space-y-4">
            <CopyRow label="Webhook URL" value={endpoint} />
            <CopyRow label="Your secret token" value={token} />
            <CopyRow label="Request body (JSON)" value={exampleBody} />
            <div className="flex gap-2">
              <Button
                variant="glass"
                className="flex-1"
                loading={generate.pending}
                onClick={() => void generate.execute({})}
              >
                <RefreshCw className="size-4" /> New token
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                loading={revoke.pending}
                onClick={() => void revoke.execute({})}
              >
                <Trash2 className="size-4" /> Turn off
              </Button>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard elevation="inset" className="space-y-3 p-5">
        <h2 className="font-dot text-title-2">iPhone — automatic (no taps)</h2>
        <ol className="list-decimal space-y-2 pl-5 text-body text-fg-2">
          <li>Open the Shortcuts app → Automation → New Automation → Message.</li>
          <li>
            Set “Message Contains” to <span className="text-fg-1">debited</span> and choose Run
            Immediately. Repeat later for <span className="text-fg-1">credited</span>.
          </li>
          <li>Add the action “Get Contents of URL”, paste the Webhook URL above.</li>
          <li>Method POST · Request Body JSON → add “token” (your token) and “text” (Shortcut Input).</li>
        </ol>
        <p className="text-footnote text-fg-3">
          From then on, every bank SMS books itself — you just tap the notification and pick a
          category.
        </p>
      </GlassCard>

      <GlassCard elevation="inset" className="space-y-3 p-5">
        <h2 className="font-dot text-title-2">iPhone — from the Share sheet</h2>
        <ol className="list-decimal space-y-2 pl-5 text-body text-fg-2">
          <li>Shortcuts → New Shortcut → enable “Show in Share Sheet”.</li>
          <li>Add “URL”: {origin}/add?text= followed by the Shortcut Input (URL-encoded).</li>
          <li>Add “Open URL”. Now share any receipt to this shortcut and Cashflow opens prefilled.</li>
        </ol>
      </GlassCard>
    </div>
  );
}
