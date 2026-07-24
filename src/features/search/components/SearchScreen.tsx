"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { ArrowLeft, Clock, SlidersHorizontal, UsersRound, X } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Chip } from "@/components/ui/Chip";
import { GlassCard } from "@/components/ui/GlassCard";
import { IconButton } from "@/components/ui/IconButton";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { formatDayLabel } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { useSheet } from "@/hooks/useSheet";
import { useAction } from "@/hooks/useAction";
import { CategoryBadge } from "@/features/categories/icons";
import { searchAction } from "../actions";
import { activeFilterCount, hasSearchCriteria, type SearchFilters } from "../schemas";
import type { SearchOptions, SearchResults } from "../queries";
import { FilterSheet } from "./FilterSheet";

const RECENT_KEY = "cashflow:recent-searches";
const EMPTY: SearchResults = { expenses: [], groups: [], friends: [] };

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

/** Client-only mount flag (avoids hydration mismatch when reading localStorage). */
function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function SearchScreen({ options }: { options: SearchOptions }) {
  const router = useRouter();
  const filterSheet = useSheet();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({});
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [recent, setRecent] = useState<string[]>(readRecent);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useMounted();

  const run = useAction(searchAction, { onSuccess: (data) => setResults(data) });

  const rememberTerm = (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    const next = [trimmed, ...recent.filter((item) => item !== trimmed)].slice(0, 6);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota/availability */
    }
  };

  const schedule = (nextQuery: string, nextFilters: SearchFilters) => {
    if (debounce.current) clearTimeout(debounce.current);
    const input = { query: nextQuery, filters: nextFilters };
    if (!hasSearchCriteria(input)) {
      setResults(EMPTY);
      return;
    }
    debounce.current = setTimeout(() => {
      void run.execute(input);
      rememberTerm(nextQuery);
    }, 250);
  };

  const onQuery = (value: string) => {
    setQuery(value);
    schedule(value, filters);
  };
  const onApplyFilters = (next: SearchFilters) => {
    setFilters(next);
    schedule(query, next);
  };
  const clearFilters = () => onApplyFilters({});

  const criteria = hasSearchCriteria({ query, filters });
  const filterCount = activeFilterCount(filters);
  const empty =
    results.expenses.length === 0 && results.groups.length === 0 && results.friends.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-5 pt-2">
        <IconButton aria-label="Back" size="sm" onClick={() => router.back()}>
          <ArrowLeft />
        </IconButton>
        <div className="flex h-11 flex-1 items-center rounded-full glass-soft px-4">
          <input
            autoFocus
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search expenses, groups, friends"
            aria-label="Search"
            className="w-full bg-transparent text-body text-fg-1 outline-none placeholder:text-fg-3"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => onQuery("")}
              className="text-fg-3"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <IconButton
          aria-label="Filters"
          size="sm"
          variant={filterCount > 0 ? "volt" : "ghost"}
          onClick={filterSheet.open}
          className="relative"
        >
          <SlidersHorizontal />
          {filterCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-volt text-[0.625rem] font-semibold text-on-volt">
              {filterCount}
            </span>
          ) : null}
        </IconButton>
      </div>

      {filterCount > 0 ? (
        <div className="-mx-1 scrollbar-none flex gap-2 overflow-x-auto px-6">
          <Chip onClick={clearFilters} icon={<X />}>
            Clear filters
          </Chip>
        </div>
      ) : null}

      <div className="min-h-40 space-y-6 px-5">
        {run.pending ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : !criteria ? (
          mounted && recent.length > 0 ? (
            <section className="space-y-2">
              <p className="text-caption text-fg-3 uppercase">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((term) => (
                  <Chip key={term} icon={<Clock />} onClick={() => onQuery(term)}>
                    {term}
                  </Chip>
                ))}
              </div>
            </section>
          ) : (
            <p className="py-10 text-center text-footnote text-fg-3">
              Search across every expense, group, and friend.
            </p>
          )
        ) : empty ? (
          <p className="py-10 text-center text-footnote text-fg-3">
            No matches. Try a different term or fewer filters.
          </p>
        ) : (
          <>
            {results.expenses.length > 0 ? (
              <section className="space-y-2">
                <p className="text-caption text-fg-3 uppercase">Expenses</p>
                <GlassCard elevation="inset" className="divide-y divide-white/6">
                  {results.expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center gap-3 p-4">
                      <CategoryBadge
                        icon={expense.category?.icon ?? "shapes"}
                        gradient={expense.category?.gradient ?? "ocean"}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body text-fg-1">{expense.description}</p>
                        <p className="truncate text-footnote text-fg-3">
                          {formatDayLabel(parseISO(expense.expenseDate))}
                          {expense.source ? ` · ${expense.source}` : " · Personal"}
                        </p>
                      </div>
                      <p className="shrink-0 text-body text-fg-1 tabular-nums">
                        {formatMoney(expense.amountMinor)}
                      </p>
                    </div>
                  ))}
                </GlassCard>
              </section>
            ) : null}

            {results.groups.length > 0 ? (
              <section className="space-y-2">
                <p className="text-caption text-fg-3 uppercase">Groups</p>
                <GlassCard elevation="inset" className="divide-y divide-white/6">
                  {results.groups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="ease-out flex items-center gap-3 p-4 transition-colors duration-150 active:bg-glass"
                    >
                      <span className="text-lg flex size-10 items-center justify-center rounded-sm glass-soft">
                        {group.emoji ?? "👥"}
                      </span>
                      <p className="flex-1 truncate text-body text-fg-1">{group.name}</p>
                    </Link>
                  ))}
                </GlassCard>
              </section>
            ) : null}

            {results.friends.length > 0 ? (
              <section className="space-y-2">
                <p className="text-caption text-fg-3 uppercase">Friends</p>
                <GlassCard elevation="inset" className="divide-y divide-white/6">
                  {results.friends.map((friend) => (
                    <Link
                      key={friend.userId}
                      href="/friends"
                      className="ease-out flex items-center gap-3 p-4 transition-colors duration-150 active:bg-glass"
                    >
                      <Avatar name={friend.name} image={friend.image} size="sm" />
                      <p className="flex-1 truncate text-body text-fg-1">{friend.name}</p>
                      <UsersRound className="size-4 text-fg-3" />
                    </Link>
                  ))}
                </GlassCard>
              </section>
            ) : null}
          </>
        )}
      </div>

      <FilterSheet
        open={filterSheet.isOpen}
        onClose={filterSheet.close}
        options={options}
        filters={filters}
        onApply={onApplyFilters}
      />
    </div>
  );
}
