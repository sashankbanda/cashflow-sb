"use client";

import { useState } from "react";
import { Plus, Tag as TagIcon, X } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { useAction } from "@/hooks/useAction";
import { createTagAction } from "../actions";
import type { TagOption } from "../tags-service";

export interface TagPickerProps {
  available: ReadonlyArray<TagOption>;
  selected: ReadonlyArray<string>;
  onChange: (tagIds: string[]) => void;
}

/** Pick existing tags or create a new one inline (#trip, #work). */
export function TagPicker({ available, selected, onChange }: TagPickerProps) {
  const [options, setOptions] = useState<TagOption[]>([...available]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const create = useAction(createTagAction, {
    optimistic: false, // needs the server-generated tag id for selection state
    onSuccess: (tag) => {
      setOptions((current) =>
        current.some((option) => option.id === tag.tagId)
          ? current
          : [...current, { id: tag.tagId, name: tag.name }],
      );
      if (!selected.includes(tag.tagId)) onChange([...selected, tag.tagId]);
      setDraft("");
      setAdding(false);
    },
  });

  const toggle = (tagId: string) => {
    onChange(
      selected.includes(tagId) ? selected.filter((id) => id !== tagId) : [...selected, tagId],
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-caption text-fg-3 uppercase">Tags</p>
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => (
          <Chip key={tag.id} selected={selected.includes(tag.id)} onClick={() => toggle(tag.id)}>
            #{tag.name}
          </Chip>
        ))}
        {adding ? (
          <form
            className="inline-flex items-center gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              if (draft.trim()) void create.execute({ name: draft });
            }}
          >
            <span className="inline-flex h-9 items-center gap-1 rounded-full glass-soft pr-2 pl-3">
              <span className="text-footnote text-fg-3">#</span>
              <input
                autoFocus
                value={draft}
                onChange={(event) => setDraft(event.target.value.replace(/\s/g, ""))}
                maxLength={24}
                aria-label="New tag name"
                className="w-20 bg-transparent text-footnote text-fg-1 outline-none"
              />
              <button
                type="button"
                aria-label="Cancel new tag"
                onClick={() => {
                  setAdding(false);
                  setDraft("");
                }}
                className="text-fg-3"
              >
                <X className="size-3.5" />
              </button>
            </span>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-full glass-soft px-3.5 text-footnote text-fg-2",
              "ease-out transition-transform duration-150 active:scale-[0.97]",
            )}
          >
            <Plus className="size-3.5" /> Tag
          </button>
        )}
        {options.length === 0 && !adding ? (
          <span className="inline-flex h-9 items-center gap-1.5 text-footnote text-fg-3">
            <TagIcon className="size-3.5" /> none yet
          </span>
        ) : null}
      </div>
    </div>
  );
}
