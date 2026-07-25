"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { MAX_ATTACHMENTS_PER_EXPENSE } from "@/lib/attachments";
import { processImageFile } from "@/lib/image-client";
import { useAction } from "@/hooks/useAction";
import { deleteAttachmentAction, listAttachmentsAction } from "../actions";
import type { AttachmentView } from "../queries";
import { AttachmentViewer } from "./AttachmentViewer";
import { BlurImage } from "./BlurImage";

export function AttachmentGallery({ expenseId, groupId }: { expenseId: string; groupId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<AttachmentView[]>([]);
  const [configured, setConfigured] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<AttachmentView | null>(null);

  const list = useAction(listAttachmentsAction, {
    optimistic: false, // read, not a mutation
    onSuccess: (data) => {
      setItems(data.items);
      setConfigured(data.configured);
    },
  });
  const remove = useAction(deleteAttachmentAction, {
    successMessage: "Receipt deleted",
    optimistic: {
      state: items,
      apply: (current, input: { id: string; groupId?: string }) =>
        current.filter((item) => item.id !== input.id),
    },
    onSuccess: (result) => setItems((current) => current.filter((item) => item.id !== result.id)),
  });
  // Render from the optimistic overlay so a deleted receipt vanishes on tap.
  const visibleItems = remove.optimisticState;

  useEffect(() => {
    void list.execute({ expenseId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per expense
  }, [expenseId]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const processed = await processImageFile(file);
      const form = new FormData();
      form.set("file", new File([processed.blob], "receipt.webp", { type: processed.mime }));
      form.set("expenseId", expenseId);
      form.set("width", String(processed.width));
      form.set("height", String(processed.height));
      form.set("blurhash", processed.blurhash);
      const response = await fetch("/api/attachments", { method: "POST", body: form });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Upload failed.");
      } else {
        toast.success("Receipt added");
        await list.execute({ expenseId });
      }
    } catch {
      toast.error("Couldn't process that image.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (!configured) {
    return (
      <div className="space-y-1">
        <p className="text-caption text-fg-3 uppercase">Receipts</p>
        <p className="text-footnote text-fg-3">Receipts will appear once storage is configured.</p>
      </div>
    );
  }

  const atLimit = visibleItems.length >= MAX_ATTACHMENTS_PER_EXPENSE;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-caption text-fg-3 uppercase">Receipts</p>
        {visibleItems.length > 0 && !atLimit ? (
          <Button
            variant="ghost"
            size="sm"
            loading={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Plus className="size-4" /> Add
          </Button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(event) => void onFile(event.target.files?.[0])}
      />

      {visibleItems.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "ease-out flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-glass-border text-fg-3",
            "transition-colors duration-150 hover:text-fg-2 active:bg-glass disabled:opacity-50",
          )}
        >
          <Camera className="size-5" />
          <span className="text-footnote">{uploading ? "Uploading…" : "Add a receipt"}</span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {visibleItems.map((item) => (
            <div key={item.id} className="relative aspect-square">
              <button
                type="button"
                onClick={() => setViewer(item)}
                aria-label="View receipt"
                className="block size-full"
              >
                <BlurImage
                  src={item.viewUrl}
                  blurhash={item.blurhash}
                  alt="Receipt"
                  className="size-full rounded-md"
                />
              </button>
              <button
                type="button"
                aria-label="Delete receipt"
                onClick={() => void remove.execute({ id: item.id, groupId })}
                className="ease-out absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-transform duration-150 active:scale-90"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {viewer ? (
        <AttachmentViewer src={viewer.viewUrl} alt="Receipt" onClose={() => setViewer(null)} />
      ) : null}
    </div>
  );
}
