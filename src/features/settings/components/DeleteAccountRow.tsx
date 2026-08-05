"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { useAction } from "@/hooks/useAction";
import { deleteAccountAction } from "../actions";

/** Type-DELETE-to-confirm account erasure; signs out and leaves the app. */
export function DeleteAccountRow() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const erase = useAction(deleteAccountAction, {
    optimistic: false, // irreversible server operation
    onSuccess: () => {
      // Sessions are already revoked server-side; leave for the landing page.
      window.location.href = "/";
    },
  });

  return (
    <>
      <Button variant="ghost" block className="text-negative" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" /> Delete my account
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Delete your account?">
        <div className="space-y-4 pt-1">
          <p className="text-body text-fg-2">
            This erases your personal entries, budgets, tags and settings, signs you out
            everywhere, and removes your identity. Your name stays on shared group expenses (as a
            ghost) so friends&apos; balances don&apos;t change. This cannot be undone.
          </p>
          <TextField
            label="Type DELETE to confirm"
            placeholder="DELETE"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            maxLength={10}
          />
          <Button
            variant="destructive"
            block
            size="lg"
            loading={erase.pending}
            disabled={confirm !== "DELETE"}
            onClick={() => void erase.execute({ confirm: "DELETE" })}
          >
            Delete everything
          </Button>
          <Button variant="ghost" block onClick={() => setOpen(false)}>
            Keep my account
          </Button>
        </div>
      </Sheet>
    </>
  );
}
