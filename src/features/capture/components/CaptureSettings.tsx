"use client";

import { useRouter } from "next/navigation";
import { Copy, MessageSquareText, RefreshCw, Share2, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Disclosure } from "@/components/ui/Disclosure";
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

      <GlassCard elevation="inset" className="divide-y divide-hairline">
        <Disclosure
          label="iPhone — 3-question automation"
          icon={<Smartphone className="size-5 text-fg-2" />}
        >
          <div className="space-y-3">
            <p className="text-footnote text-fg-3">
              Close your UPI app after paying → three quick questions → the expense logs itself,
              split and all. One-time setup:
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-body text-fg-2">
              <li>
                Shortcuts app → Automation → <span className="text-fg-1">+</span> → App → choose
                your UPI apps → tick <span className="text-fg-1">Is Closed</span> → Run
                Immediately → Next → New Blank Automation.
              </li>
              <li>
                Add three <span className="text-fg-1">Ask for Input</span> actions: a{" "}
                <span className="text-fg-1">Number</span> one asking “How much?”, a Text one
                asking “Where did you spend?”, and a Text one asking “Split with?”.
              </li>
              <li>
                Add a <span className="text-fg-1">Text</span> action reading:{" "}
                <span className="text-fg-1">Paid ₹ … to … split with …</span> — where each “…” is
                a variable. Insert every variable via{" "}
                <span className="text-fg-1">Select Variable</span>, then tap the bubble hanging{" "}
                <em>directly under the matching question</em>. Don&rsquo;t use the keyboard-bar
                suggestions — they can bind to the wrong question.
              </li>
              <li>
                Add <span className="text-fg-1">Get Contents of URL</span>: type the Webhook URL
                above <em>by hand</em> into the URL box (a pasted “chip” fails with a Rich Text
                error). Expand it → Method <span className="text-fg-1">POST</span> → Request Body{" "}
                <span className="text-fg-1">JSON</span> → add field{" "}
                <span className="text-fg-1">token</span> (paste your token) and field{" "}
                <span className="text-fg-1">text</span> (Select Variable → the bubble under the
                Text action — never “Shortcut Input”).
              </li>
              <li>
                Test with ▶: the reply echoes <span className="text-fg-1">received</span> — it
                must contain all three answers. Leave “Split with?” empty for a normal expense;
                answer <span className="text-fg-1">Rahul, Sandeep</span> to book the equal split
                instantly.
              </li>
            </ol>
          </div>
        </Disclosure>

        <Disclosure
          label="iPhone — fully automatic from SMS"
          icon={<MessageSquareText className="size-5 text-fg-2" />}
        >
          <div className="space-y-3">
            <p className="text-footnote text-fg-3">
              If your bank texts you on every payment, skip the questions entirely:
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-body text-fg-2">
              <li>Shortcuts → Automation → New Automation → Message.</li>
              <li>
                Set “Message Contains” to <span className="text-fg-1">debited</span> and choose
                Run Immediately. Repeat later for <span className="text-fg-1">credited</span>.
              </li>
              <li>
                Add “Get Contents of URL” (URL typed by hand, POST, JSON body) with{" "}
                <span className="text-fg-1">token</span> = your token and{" "}
                <span className="text-fg-1">text</span> = Shortcut Input (here it IS the SMS).
              </li>
            </ol>
            <p className="text-footnote text-fg-3">
              Every bank SMS then books itself — tap the notification to pick a category once per
              merchant; after that it&rsquo;s remembered.
            </p>
          </div>
        </Disclosure>

        <Disclosure
          label="Android — share a receipt (no extra apps)"
          icon={<Share2 className="size-5 text-fg-2" />}
        >
          <div className="space-y-3">
            <ol className="list-decimal space-y-2 pl-5 text-body text-fg-2">
              <li>
                Install Cashflow: open it in Chrome → menu ⋮ →{" "}
                <span className="text-fg-1">Add to Home screen → Install</span>.
              </li>
              <li>
                After any payment, tap <span className="text-fg-1">Share</span> on the
                GPay/PhonePe/bank receipt (or long-press the SMS → Share) → pick{" "}
                <span className="text-fg-1">Cashflow</span>.
              </li>
              <li>
                The entry opens prefilled — amount, payee, expense/income. Tap name chips under
                “Split with” to split it, then Save.
              </li>
            </ol>
            <p className="text-footnote text-fg-3">
              Long-press the app icon → <span className="text-fg-1">Quick add</span> jumps
              straight to this screen; the Paste button works with any copied payment text too.
              Power users can also point any HTTP automation app at the webhook above — same
              token, same body.
            </p>
          </div>
        </Disclosure>
      </GlassCard>
    </div>
  );
}
