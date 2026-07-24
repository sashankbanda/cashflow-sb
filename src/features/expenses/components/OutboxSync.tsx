"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { listQueued, removeQueued } from "@/lib/outbox";
import { createPersonalExpenseAction } from "../actions";

/** Headless: replays queued offline expenses on mount and on reconnect. */
export function OutboxSync() {
  const router = useRouter();

  useEffect(() => {
    let running = false;
    const flush = async () => {
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
          toast.success(`Synced ${synced} offline ${synced === 1 ? "expense" : "expenses"}`);
          router.refresh();
        }
      } finally {
        running = false;
      }
    };

    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [router]);

  return null;
}
