"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { asPalette } from "@/components/ui/palette";
import { useAction } from "@/hooks/useAction";
import { useSheet } from "@/hooks/useSheet";
import { archiveCategoryAction } from "../actions";
import { CategoryBadge } from "../icons";
import type { CategoryManagerData, CategoryOption } from "../queries";
import { CategoryFormSheet, type CategoryFormValues } from "./CategoryFormSheet";

function CategoryRow({
  category,
  onEdit,
  onArchive,
  archiving,
}: {
  category: CategoryOption;
  onEdit?: () => void;
  onArchive?: () => void;
  archiving?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <CategoryBadge icon={category.icon} gradient={category.gradient} />
      <p className="flex-1 truncate text-body">{category.name}</p>
      {onEdit ? (
        <IconButton aria-label={`Edit ${category.name}`} size="sm" variant="ghost" onClick={onEdit}>
          <Pencil />
        </IconButton>
      ) : null}
      {onArchive ? (
        <IconButton
          aria-label={`Archive ${category.name}`}
          size="sm"
          variant="ghost"
          onClick={onArchive}
          disabled={archiving}
        >
          <Trash2 />
        </IconButton>
      ) : null}
    </div>
  );
}

/** Category manager: system defaults (read-only) + editable custom categories. */
export function CategoryManager({ data }: { data: CategoryManagerData }) {
  const router = useRouter();
  const formSheet = useSheet();
  const [editing, setEditing] = useState<CategoryFormValues | undefined>(undefined);

  const archive = useAction(archiveCategoryAction, {
    successMessage: "Category archived",
    optimistic: {
      state: data.custom,
      apply: (current, input: { categoryId: string }) =>
        current.filter((category) => category.id !== input.categoryId),
    },
    onSuccess: () => router.refresh(),
  });
  // Render the custom list from the overlay so an archived row leaves on tap.
  const customCategories = archive.optimisticState;

  const openCreate = () => {
    setEditing(undefined);
    formSheet.open();
  };
  const openEdit = (category: CategoryOption) => {
    setEditing({
      id: category.id,
      name: category.name,
      icon: category.icon,
      gradient: asPalette(category.gradient),
    });
    formSheet.open();
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Categories"
        leading={
          <IconButton aria-label="Back" size="sm" onClick={() => router.push("/profile")}>
            <ArrowLeft />
          </IconButton>
        }
        trailing={
          <IconButton aria-label="New category" size="sm" variant="volt" onClick={openCreate}>
            <Plus />
          </IconButton>
        }
      />

      <div className="space-y-5 px-5">
        <section className="space-y-2">
          <h2 className="text-caption text-fg-3 uppercase">Your categories</h2>
          {customCategories.length === 0 ? (
            <GlassCard elevation="inset" className="p-5">
              <p className="text-footnote text-fg-3">
                No custom categories yet. Create one to tailor your spending.
              </p>
            </GlassCard>
          ) : (
            <GlassCard elevation="inset" className="divide-y divide-white/6">
              {customCategories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  onEdit={() => openEdit(category)}
                  onArchive={() => void archive.execute({ categoryId: category.id })}
                  archiving={archive.pending}
                />
              ))}
            </GlassCard>
          )}
          <Button variant="glass" block onClick={openCreate}>
            <Plus className="size-4" /> New category
          </Button>
        </section>

        <section className="space-y-2">
          <h2 className="text-caption text-fg-3 uppercase">Built in</h2>
          <GlassCard elevation="inset" className="divide-y divide-white/6">
            {data.system.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </GlassCard>
        </section>
      </div>

      <CategoryFormSheet open={formSheet.isOpen} onClose={formSheet.close} category={editing} />
    </div>
  );
}
