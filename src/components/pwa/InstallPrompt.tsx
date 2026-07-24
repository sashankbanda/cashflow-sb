"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";

const SESSION_KEY = "cashflow:sessions";
const DISMISS_KEY = "cashflow:install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "hidden" | "native" | "ios";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Soft install prompt after the 2nd session; native banner or an iOS hint. */
export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const sessions = Number(read(SESSION_KEY) ?? "0") + 1;
    try {
      window.localStorage.setItem(SESSION_KEY, String(sessions));
    } catch {
      /* private mode — prompt just won't persist */
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone || read(DISMISS_KEY) === "1" || sessions < 2) return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setMode("native");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    if (isIOS && !("onbeforeinstallprompt" in window)) {
      const timer = window.setTimeout(() => setMode("ios"), 1200);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    setMode("hidden");
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (deferred) await deferred.prompt();
    dismiss();
  };

  if (mode === "hidden") return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 mx-auto w-full max-w-md px-5">
      <GlassCard elevation="floating" className="flex items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-volt text-on-volt">
          <Download className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-footnote font-medium text-fg-1">Install Cashflow</p>
          <p className="text-caption text-fg-3">
            {mode === "ios" ? (
              <>
                Tap <Share className="mb-0.5 inline size-3" /> then “Add to Home Screen”.
              </>
            ) : (
              "Add it to your home screen for a full-screen app."
            )}
          </p>
        </div>
        {mode === "native" ? (
          <Button variant="volt" size="sm" onClick={() => void install()}>
            Install
          </Button>
        ) : null}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="text-fg-3 hover:text-fg-1"
        >
          <X className="size-4" />
        </button>
      </GlassCard>
    </div>
  );
}
