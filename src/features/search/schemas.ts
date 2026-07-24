import { z } from "zod";
import { MAX_AMOUNT_MINOR } from "@/lib/money";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const searchFiltersSchema = z.object({
  categoryIds: z.array(z.string().min(1)).max(30).optional(),
  groupIds: z.array(z.string().min(1)).max(50).optional(),
  tagIds: z.array(z.string().min(1)).max(30).optional(),
  memberUserIds: z.array(z.string().min(1)).max(50).optional(),
  amountMinMinor: z.number().int().min(0).max(MAX_AMOUNT_MINOR).optional(),
  amountMaxMinor: z.number().int().min(0).max(MAX_AMOUNT_MINOR).optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
});

export const searchInputSchema = z.object({
  query: z.string().trim().max(120).default(""),
  filters: searchFiltersSchema.default({}),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;
export type SearchInput = z.infer<typeof searchInputSchema>;

/** True when a search would return anything meaningful (text or any filter). */
export function hasSearchCriteria(input: SearchInput): boolean {
  if (input.query.trim().length > 0) return true;
  const f = input.filters;
  return Boolean(
    f.categoryIds?.length ||
    f.groupIds?.length ||
    f.tagIds?.length ||
    f.memberUserIds?.length ||
    f.amountMinMinor !== undefined ||
    f.amountMaxMinor !== undefined ||
    f.dateFrom ||
    f.dateTo,
  );
}

/** Count of active (non-text) filters, for the filter-button badge. */
export function activeFilterCount(filters: SearchFilters): number {
  let count = 0;
  if (filters.categoryIds?.length) count += 1;
  if (filters.groupIds?.length) count += 1;
  if (filters.tagIds?.length) count += 1;
  if (filters.memberUserIds?.length) count += 1;
  if (filters.amountMinMinor !== undefined || filters.amountMaxMinor !== undefined) count += 1;
  if (filters.dateFrom || filters.dateTo) count += 1;
  return count;
}
