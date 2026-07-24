import type { Metadata } from "next";
import { requireUser } from "@/features/auth/session";
import { SearchScreen } from "@/features/search/components/SearchScreen";
import { getSearchOptions } from "@/features/search/queries";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage() {
  const user = await requireUser();
  const options = await getSearchOptions(user.id);
  return <SearchScreen options={options} />;
}
