import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { CategoryManager } from "@/features/categories/components/CategoryManager";
import { getCategoryManagerData } from "@/features/categories/queries";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesSettingsPage() {
  const user = await requireUser();
  const data = await getCategoryManagerData(user.id);
  return <CategoryManager data={data} />;
}
