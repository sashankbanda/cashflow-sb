import { z } from "zod";
import { PALETTES } from "@/components/ui/palette";
import { CATEGORY_ICON_NAMES } from "./icons";

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the category a name.")
    .max(30, "Keep it under 30 characters."),
  icon: z.enum(CATEGORY_ICON_NAMES as [string, ...string[]]),
  gradient: z.enum(PALETTES),
  /** Which pickers this category appears in. */
  kind: z.enum(["expense", "income"]).optional().default("expense"),
});

export const createCategorySchema = categoryFormSchema;
export const updateCategorySchema = categoryFormSchema.extend({
  categoryId: z.string().min(1),
});
export const archiveCategorySchema = z.object({ categoryId: z.string().min(1) });

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ---------- Tags ----------

export const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the tag.")
    .max(24, "Keep tags short.")
    .transform((value) => value.replace(/^#/, "").toLowerCase()),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
