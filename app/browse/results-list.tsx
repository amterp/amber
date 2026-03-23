"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import SubmissionCard from "@/components/submission-card";
import { searchAlgolia } from "@/lib/algolia";
import { Submission, SearchParams, TimeRange, SubmissionType } from "@/lib/types";
import { getTimeRangeTimestamp, parseDate } from "@/lib/time";
import {
  loadIndex,
  dayKeysForRange,
  segmentDayKeys,
  fetchCachedDays,
} from "@/lib/hn-cache";

const PER_PAGE = 30;

// Algolia caps hitsPerPage at 100. For uncached gaps we fetch the top 100
// stories per gap, which is a best-effort approximation. Stories ranked
// 101+ in a gap are dropped. In practice this rarely matters: gap stories
// compete against potentially years of cached top stories when sorted
// globally by points, so they seldom appear on the first several pages.
const ALGOLIA_GAP_PER_PAGE = 100;

interface FetchState {
  hits: Submission[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
}

/** Resolve range/from/to URL params into a timestamp pair. */
function resolveTimestampRange(
  searchParams: URLSearchParams,
): { from: number; to: number } | null {
  const range = (searchParams.get("range") as TimeRange) || "7d";

  if (range === "custom") {
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    if (!fromStr || !toStr) return null;
    try {
      return { from: parseDate(fromStr), to: parseDate(toStr) };
    } catch {
      return null;
    }
  }

  const from = getTimeRangeTimestamp(range);
  const to = Math.floor(Date.now() / 1000);
  return { from, to };
}

/**
 * Attempt to load browse data using the hybrid cache+Algolia strategy.
 * Returns a full sorted/filtered array of submissions, or null if the
 * hybrid path isn't viable (no cached days, too many gaps, etc.).
 */
async function loadHybrid(
  fromSec: number,
  toSec: number,
  types: Set<string>,
): Promise<Submission[] | null> {
  const index = await loadIndex();
  const dayKeys = dayKeysForRange(fromSec, toSec);
  if (dayKeys.length === 0) return null;

  const segments = segmentDayKeys(dayKeys, index);
  if (!segments) return null;

  // If there are zero cached keys, skip hybrid entirely - let Algolia
  // handle it with its native pagination.
  if (segments.cachedKeys.length === 0) return null;

  // Fetch cached days and Algolia gaps in parallel
  const [cachedSubmissions, ...algoliaResults] = await Promise.all([
    fetchCachedDays(segments.cachedKeys),
    ...segments.uncachedRanges.map((range) =>
      searchAlgolia({
        type: Array.from(types).join(","),
        sort: "points",
        page: 0,
        per_page: ALGOLIA_GAP_PER_PAGE,
        from: String(range.from),
        to: String(range.to),
      }).then((res) => res.hits),
    ),
  ]);

  // Merge and deduplicate by ID
  const seen = new Set<string>();
  const merged: Submission[] = [];
  for (const sub of [...cachedSubmissions, ...algoliaResults.flat()]) {
    if (!seen.has(sub.id)) {
      seen.add(sub.id);
      merged.push(sub);
    }
  }

  // Filter to the exact requested time range. Cache files contain full
  // UTC days, so boundary days may include submissions outside the
  // user's from/to window.
  const trimmed = merged.filter(
    (s) => s.createdAtTimestamp >= fromSec && s.createdAtTimestamp < toSec,
  );

  // Filter by type
  const filtered = types.size > 0
    ? trimmed.filter((s) => types.has(s.type))
    : trimmed;

  // Sort by points descending
  filtered.sort((a, b) => b.points - a.points);

  return filtered;
}

export default function ResultsList() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<FetchState>({
    hits: [],
    loading: true,
    hasMore: false,
    page: 0,
    error: null,
  });
  const [retryKey, setRetryKey] = useState(0);
  const cacheRef = useRef<Submission[] | null>(null);
  const loadingMoreRef = useRef(false);

  const buildSearchParams = useCallback(
    (page: number): SearchParams => {
      const tsRange = resolveTimestampRange(searchParams);
      const type = searchParams.get("type") || "story";

      const params: SearchParams = {
        type,
        sort: "points",
        page,
        per_page: PER_PAGE,
      };

      if (tsRange) {
        params.from = String(tsRange.from);
        params.to = String(tsRange.to);
      }

      return params;
    },
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      cacheRef.current = null;
      setState({ hits: [], loading: true, hasMore: false, page: 0, error: null });

      // Try hybrid cache+Algolia first
      const tsRange = resolveTimestampRange(searchParams);
      if (tsRange) {
        try {
          const typeParam = searchParams.get("type") || "story";
          const types = new Set(typeParam.split(",").filter(Boolean) as SubmissionType[]);
          const hybrid = await loadHybrid(tsRange.from, tsRange.to, types);
          if (!cancelled && hybrid) {
            cacheRef.current = hybrid;
            setState({
              hits: hybrid.slice(0, PER_PAGE),
              loading: false,
              hasMore: hybrid.length > PER_PAGE,
              page: 0,
              error: null,
            });
            return;
          }
        } catch {
          // Hybrid failed - fall through to Algolia
        }
      }

      // Fall back to Algolia
      try {
        const data = await searchAlgolia(buildSearchParams(0));
        if (!cancelled) {
          setState({
            hits: data.hits,
            loading: false,
            hasMore: data.page < data.total_pages - 1,
            page: 0,
            error: null,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [buildSearchParams, retryKey, searchParams]);

  const loadMore = async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;

    try {
      const nextPage = state.page + 1;

      // Paginate from cached hybrid data - no network request
      const cached = cacheRef.current;
      if (cached) {
        const start = nextPage * PER_PAGE;
        const nextHits = cached.slice(start, start + PER_PAGE);
        setState((s) => ({
          hits: [...s.hits, ...nextHits],
          loading: false,
          hasMore: start + PER_PAGE < cached.length,
          page: nextPage,
          error: null,
        }));
        return;
      }

      // Algolia pagination
      setState((s) => ({ ...s, loading: true, error: null }));
      const data = await searchAlgolia(buildSearchParams(nextPage));
      setState((s) => ({
        hits: [...s.hits, ...data.hits],
        loading: false,
        hasMore: data.page < data.total_pages - 1,
        page: nextPage,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    } finally {
      loadingMoreRef.current = false;
    }
  };

  const retry = () => {
    if (state.hits.length > 0) {
      loadMore();
    } else {
      setRetryKey((k) => k + 1);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {state.hits.map((hit, i) => (
        <SubmissionCard key={hit.id} submission={hit} rank={i + 1} />
      ))}

      {state.loading && (
        <div className="py-8 text-center text-gray-400 dark:text-gray-500">Loading...</div>
      )}

      {!state.loading && state.error && (
        <div className="py-6 text-center">
          <p className="text-red-500 dark:text-red-400 text-sm mb-2">
            {state.hits.length > 0
              ? "Failed to load more results."
              : "Something went wrong loading results."}
          </p>
          <button
            onClick={retry}
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {!state.loading && !state.error && state.hits.length === 0 && (
        <div className="py-8 text-center text-gray-400 dark:text-gray-500">No results found</div>
      )}

      {!state.loading && !state.error && state.hasMore && (
        <div className="py-6 text-center">
          <button
            onClick={loadMore}
            className="rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
