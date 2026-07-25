"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { PALETTES, paletteBg, paletteGlow, type Palette } from "@/components/ui/palette";
import { cn } from "@/lib/cn";
import { useAction } from "@/hooks/useAction";
import { createGroupAction, updateGroupAction } from "../actions";

const EMOJI_CHOICES = [
  "🌴",
  "✈️",
  "🏠",
  "🍜",
  "🍕",
  "🎬",
  "⚽",
  "🎉",
  "💼",
  "🏔️",
  "🚗",
  "🛒",
  "🎂",
  "🏖️",
  "🎮",
  "☕",
] as const;

export interface GroupFormValues {
  id?: string;
  name: string;
  emoji: string | null;
  gradient: Palette;
}

interface GroupFormSheetProps {
  open: boolean;
  onClose: () => void;
  /** Provide to edit an existing group; omit to create. */
  group?: GroupFormValues;
  onSaved?: (groupId: string) => void;
}

function GroupForm({
  group,
  onClose,
  onSaved,
}: {
  group?: GroupFormValues;
  onClose: () => void;
  onSaved?: (groupId: string) => void;
}) {
  const router = useRouter();
  const editing = Boolean(group?.id);
  const [name, setName] = useState(group?.name ?? "");
  const [emoji, setEmoji] = useState<string | null>(group?.emoji ?? null);
  const [gradient, setGradient] = useState<Palette>(group?.gradient ?? "ocean");

  const create = useAction(createGroupAction, {
    successMessage: "Group created",
    optimistic: false, // navigates to the new group
    onSuccess: (data) => {
      onClose();
      router.refresh();
      onSaved?.(data.groupId);
    },
  });
  const update = useAction(updateGroupAction, {
    successMessage: "Group updated",
    optimistic: false, // form closes; parent re-renders from the server
    onSuccess: (data) => {
      onClose();
      router.refresh();
      onSaved?.(data.groupId);
    },
  });
  const pending = create.pending || update.pending;
  const nameError = create.fieldError("name") ?? update.fieldError("name");

  const submit = () => {
    const payload = { name, emoji: emoji ?? undefined, gradient };
    if (editing && group?.id) {
      void update.execute({ ...payload, groupId: group.id });
    } else {
      void create.execute(payload);
    }
  };

  return (
    <form
      className="space-y-6 pt-1"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextField
        label="Name"
        placeholder="Goa trip"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={nameError}
        autoFocus={!editing}
        maxLength={50}
      />

      <div className="space-y-2">
        <p className="text-caption text-fg-3 uppercase">Emoji</p>
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-label={`Emoji ${choice}`}
              aria-pressed={emoji === choice}
              onClick={() => setEmoji(emoji === choice ? null : choice)}
              className={cn(
                "flex size-10 items-center justify-center rounded-sm text-title-2",
                "ease-out transition-[background-color,transform] duration-150 active:scale-[0.9]",
                emoji === choice ? "bg-glass ring-1 ring-volt/60" : "hover:bg-glass-soft",
              )}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-caption text-fg-3 uppercase">Cover</p>
        <div className="flex gap-3">
          {PALETTES.map((palette) => (
            <button
              key={palette}
              type="button"
              aria-label={`${palette} cover`}
              aria-pressed={gradient === palette}
              onClick={() => setGradient(palette)}
              className={cn(
                "flex size-11 items-center justify-center rounded-full",
                "ease-out transition-transform duration-150 active:scale-[0.9]",
                paletteBg[palette],
                gradient === palette && paletteGlow[palette],
                gradient === palette && "ring-2 ring-white/80",
              )}
            >
              {gradient === palette ? <Check className="size-4 text-white" /> : null}
            </button>
          ))}
        </div>
      </div>

      <Button type="submit" variant="volt" size="lg" block loading={pending}>
        {editing ? "Save changes" : "Create group"}
      </Button>
    </form>
  );
}

/** Create/edit group sheet: name, emoji, gradient cover. */
export function GroupFormSheet({ open, onClose, group, onSaved }: GroupFormSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={group?.id ? "Edit group" : "New group"}>
      <GroupForm key={String(open)} group={group} onClose={onClose} onSaved={onSaved} />
    </Sheet>
  );
}
