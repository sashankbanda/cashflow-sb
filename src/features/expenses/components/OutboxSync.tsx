"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { OUTBOX_CHANGED, listQueued, removeQueued } from "@/lib/outbox";
import { createPersonalExpenseAction } from "../actions";

/**
 * Headless: drains the expense outbox to the server. It is the single flush
 * path for both online and offline adds — the add flow always queues, and this
 * flushes immediately on the queue-changed event (online) or on reconnect
 * (offline). `silent` suppresses the "synced offline" toast for the immediate
 * online flush, where the optimistic row already gave feedback.
 */
export function OutboxSync() {
  const router = useRouter();

  useEffect(() => {
    let running = false;
    const flush = async (silent: boolean) => {
      if (running || typeof navigator === "undefined" || !navigator.onLine) return;
      running = true;
      try {
        const items = await listQueued();
        let synced = 0;
        for (const item of items) {
          const result = await createPersonalExpenseAction({
            description: item.payload.description,
            amountMinor: item.payload.amountMinor,
            categoryId: item.payload.categoryId,
            expenseDate: item.payload.expenseDate,
            idempotencyKey: item.id,
            tagIds: item.payload.tagIds,
          });
          if (result.ok) {
            await removeQueued(item.id);
            synced += 1;
          } else if (result.error.code !== "VALIDATION") {
            break; // transient (offline again) — keep the rest queued
          } else {
            await removeQueued(item.id); // bad payload would never succeed
          }
        }
        if (synced > 0) {
          if (!silent) {
            toast.success(`Synced ${synced} offline ${synced === 1 ? "expense" : "expenses"}`);
          }
          router.refresh();
        }
      } finally {
        running = false;
      }
    };

    const onChanged = () => void flush(true); // immediate online add — row already shown
    const onReconnect = () => void flush(false); // deferred offline adds — announce the sync

    void flush(false);
    window.addEventListener("online", onReconnect);
    window.addEventListener(OUTBOX_CHANGED, onChanged);
    return () => {
      window.removeEventListener("online", onReconnect);
      window.removeEventListener(OUTBOX_CHANGED, onChanged);
    };
  }, [router]);

  return null;
}
