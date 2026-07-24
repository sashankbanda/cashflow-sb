import type { Palette } from "@/components/ui/palette";

/**
 * The ten system categories, seeded with stable ids so references survive
 * across environments. Icons are Lucide names rendered by CategoryIcon.
 */
export interface SystemCategory {
  id: string;
  name: string;
  icon: string;
  gradient: Palette;
  sort: number;
}

export const SYSTEM_CATEGORIES: ReadonlyArray<SystemCategory> = [
  { id: "sys-food", name: "Food & Drinks", icon: "utensils-crossed", gradient: "ember", sort: 0 },
  { id: "sys-travel", name: "Travel", icon: "plane", gradient: "ocean", sort: 1 },
  { id: "sys-groceries", name: "Groceries", icon: "shopping-basket", gradient: "mint", sort: 2 },
  {
    id: "sys-entertainment",
    name: "Entertainment",
    icon: "clapperboard",
    gradient: "iris",
    sort: 3,
  },
  { id: "sys-rent", name: "Rent & Utilities", icon: "house", gradient: "solar", sort: 4 },
  { id: "sys-shopping", name: "Shopping", icon: "shopping-bag", gradient: "iris", sort: 5 },
  { id: "sys-health", name: "Health", icon: "heart-pulse", gradient: "mint", sort: 6 },
  { id: "sys-fuel", name: "Fuel", icon: "fuel", gradient: "ember", sort: 7 },
  { id: "sys-subscriptions", name: "Subscriptions", icon: "repeat", gradient: "ocean", sort: 8 },
  { id: "sys-other", name: "Other", icon: "shapes", gradient: "ocean", sort: 9 },
];

export const DEFAULT_CATEGORY_ID = "sys-other";
