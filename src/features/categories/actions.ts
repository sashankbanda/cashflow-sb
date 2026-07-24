"use server";

import { revalidatePath } from "next/cache";
import { authedAction } from "@/server/action";
import {
  archiveCategorySchema,
  createCategorySchema,
  createTagSchema,
  updateCategorySchema,
} from "./schemas";
import { archiveCategory, createCategory, updateCategory } from "./service";
import { createTag } from "./tags-service";

const revalidateCategorySurfaces = () => {
  revalidatePath("/settings/categories");
  revalidatePath("/expenses");
  revalidatePath("/insights");
};

export const createCategoryAction = authedAction({
  name: "categories.create",
  schema: createCategorySchema,
  handler: async ({ input, ctx }) => {
    const result = await createCategory(ctx.user, input);
    revalidateCategorySurfaces();
    return result;
  },
});

export const updateCategoryAction = authedAction({
  name: "categories.update",
  schema: updateCategorySchema,
  handler: async ({ input, ctx }) => {
    await updateCategory(ctx.user, input);
    revalidateCategorySurfaces();
    return { categoryId: input.categoryId };
  },
});

export const archiveCategoryAction = authedAction({
  name: "categories.archive",
  schema: archiveCategorySchema,
  handler: async ({ input, ctx }) => {
    await archiveCategory(ctx.user, input.categoryId);
    revalidateCategorySurfaces();
    return { categoryId: input.categoryId };
  },
});

export const createTagAction = authedAction({
  name: "tags.create",
  schema: createTagSchema,
  handler: async ({ input, ctx }) => {
    return createTag(ctx.user, input);
  },
});
