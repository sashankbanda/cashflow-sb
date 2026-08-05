"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { TextField } from "@/components/ui/TextField";
import { PALETTES, paletteBg, type Palette } from "@/components/ui/palette";
import { cn } from "@/lib/cn";
import { useAction } from "@/hooks/useAction";
import { createCategoryAction, updateCategoryAction } from "../actions";
import { CATEGORY_ICON_NAMES, CategoryGlyph } from "../icons";

export interface CategoryFormValues {
  id?: string;
  name: string;
  icon: string;
  gradient: Palette;
  kind: "expense" | "income";
}

interface CategoryFormSheetProps {
  open: boolean;
  onClose: () => void;
  category?: CategoryFormValues;
}

function Form({ category, onClose }: { category?: CategoryFormValues; onClose: () => void }) {
  const router = useRouter();
  const editing = Boolean(category?.id);
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? CATEGORY_ICON_NAMES[0] ?? "shapes");
  const [gradient, setGradient] = useState<Palette>(category?.gradient ?? "ocean");
  const [kind, setKind] = useState<"expense" | "income">(category?.kind ?? "expense");

  const create = useAction(createCategoryAction, {
    successMessage: "Category created",
    optimistic: false, // form closes; parent list re-renders from the server
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  const update = useAction(updateCategoryAction, {
    successMessage: "Category updated",
    optimistic: false, // form closes; parent list re-renders from the server
    onSuccess: () => {
      onClose();
      router.refresh();
    },
  });
  const pending = create.pending || update.pending;
  const nameError = create.fieldError("name") ?? update.fieldError("name");

  const submit = () => {
    if (editing && category?.id) {
      void update.execute({ categoryId: category.id, name, icon, gradient, kind });
    } else {
      void create.execute({ name, icon, gradient, kind });
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
      <div className="flex justify-center">
        <span
          className={cn(
            "flex size-16 items-center justify-center rounded-md text-white [&_svg]:size-7",
            paletteBg[gradient],
          )}
        >
          <CategoryGlyph icon={icon} />
        </span>
      </div>

      <SegmentedControl
        aria-label="Category for"
        value={kind}
        onChange={setKind}
        options={[
          { value: "expense", label: "Expenses" },
          { value: "income", label: "Income" },
        ]}
      />

      <TextField
        label="Name"
        placeholder="e.g. Coffee"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={nameError}
        autoFocus={!editing}
        maxLength={30}
      />

      <div className="space-y-2">
        <p className="text-caption text-fg-3 uppercase">Icon</p>
        <div className="grid grid-cols-6 gap-2">
          {CATEGORY_ICON_NAMES.map((name_) => (
            <button
              key={name_}
              type="button"
              aria-label={`Icon ${name_}`}
              aria-pressed={icon === name_}
              onClick={() => setIcon(name_)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm [&_svg]:size-5",
                "ease-out transition-transform duration-150 active:scale-[0.9]",
                icon === name_ ? "bg-glass text-fg-1 ring-1 ring-volt/60" : "glass-soft text-fg-2",
              )}
            >
              <CategoryGlyph icon={name_} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-caption text-fg-3 uppercase">Color</p>
        <div className="flex gap-3">
          {PALETTES.map((palette) => (
            <button
              key={palette}
              type="button"
              aria-label={`${palette} color`}
              aria-pressed={gradient === palette}
              onClick={() => setGradient(palette)}
              className={cn(
                "ease-out size-11 rounded-full transition-transform duration-150 active:scale-[0.9]",
                paletteBg[palette],
                gradient === palette && "ring-2 ring-fg-on-grad-2",
              )}
            />
          ))}
        </div>
      </div>

      <Button
        type="submit"
        variant="volt"
        block
        size="lg"
        loading={pending}
        disabled={name.trim().length === 0}
      >
        {editing ? "Save changes" : "Create category"}
      </Button>
    </form>
  );
}

/** Create/edit sheet for a custom category. */
export function CategoryFormSheet({ open, onClose, category }: CategoryFormSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={category?.id ? "Edit category" : "New category"}>
      <Form key={String(open)} category={category} onClose={onClose} />
    </Sheet>
  );
}
