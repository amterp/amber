"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import PeriodSection from "./period-section";
import { searchAlgolia } from "@/lib/algolia";
import { dayKeysForPeriod, fetchCachedDays, loadIndex } from "@/lib/hn-cache";
import { Submission, Step, Period } from "@/lib/types";
import { getPeriods, getMorePeriods } from "@/lib/time";

interface PeriodData {
  label: string;
  submissions: Submission[];
}

interface FeedState {
  periods: PeriodData[];
  loading: boolean;
  error: string | null;
  cursor: number | null; // start timestamp of the last loaded period
  hasMore: boolean;
}

const BATCH_SIZES: Record<Step, number> = {
  monthly: 4,
  weekly: 4,
  daily: 7,
};

async function fetchFromCache(
  period: Period,
  count: number,
  index: Set<string>,
): Promise<PeriodData | null> {
  const dayKeys = dayKeysForPeriod(period);

  // All days in the period must be in the index
  if (!dayKeys.every((key) => index.has(key))) {
    return null;
  }

  const merged = await fetchCachedDays(dayKeys);
  merged.sort((a, b) => b.points - a.points);

  return {
    label: period.label,
    submissions: merged.slice(0, count),
  };
}

async function fetchPeriod(
  period: Period,
  count: number,
  index: Set<string>,
): Promise<PeriodData> {
  // Try cache first
  try {
    const cached = await fetchFromCache(period, count, index);
    if (cached) return cached;
  } catch {
    // Cache fetch failed - fall through to live API
  }

  const data = await searchAlgolia({
    type: "story",
    sort: "points",
    per_page: count,
    page: 0,
    from: String(period.start),
    to: String(period.end),
  });

  return {
    label: period.label,
    submissions: data.hits,
  };
}

async function fetchBatch(
  periods: Period[],
  count: number,
  index: Set<string>,
): Promise<PeriodData[]> {
  const results = await Promise.allSettled(
    periods.map((p) => fetchPeriod(p, count, index)),
  );

  return results.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    return { label: periods[i].label, submissions: [] };
  });
}

export default function HighlightsFeed() {
  const searchParams = useSearchParams();
  const step = (searchParams.get("step") as Step) || "monthly";
  const count = Math.max(1, Number(searchParams.get("count")) || 20);

  const [state, setState] = useState<FeedState>({
    periods: [],
    loading: true,
    error: null,
    cursor: null,
    hasMore: true,
  });

  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadBatch = useCallback(
    async (cursor: number | null, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const index = await loadIndex();
        const batchSize = BATCH_SIZES[step];
        const periods =
          cursor === null
            ? getPeriods(step, batchSize)
            : getMorePeriods(step, batchSize, cursor);

        const data = await fetchBatch(periods, count, index);
        const lastPeriod = periods[periods.length - 1];

        // HN launched in early 2007 - stop loading if we've gone past that
        const hnEpoch = Date.UTC(2007, 0, 1) / 1000;
        const reachedEnd = lastPeriod && lastPeriod.start < hnEpoch;

        setState((s) => ({
          periods: append ? [...s.periods, ...data] : data,
          loading: false,
          error: null,
          cursor: lastPeriod?.start ?? null,
          hasMore: !reachedEnd,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          loading: false,
          error: (err as Error).message,
        }));
      } finally {
        loadingRef.current = false;
      }
    },
    [step, count],
  );

  // Reset and load initial batch when params change
  useEffect(() => {
    setState({
      periods: [],
      loading: true,
      error: null,
      cursor: null,
      hasMore: true,
    });
    loadingRef.current = false;
    loadBatch(null, false);
  }, [loadBatch]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current && state.hasMore && state.cursor !== null) {
          loadBatch(state.cursor, true);
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [state.cursor, state.hasMore, loadBatch]);

  return (
    <div>
      {state.periods.map((period, i) => (
        <PeriodSection
          key={`${period.label}-${i}`}
          title={period.label}
          submissions={period.submissions}
        />
      ))}

      {state.loading && (
        <div className="py-8 text-center text-gray-400 dark:text-gray-500">
          Loading...
        </div>
      )}

      {!state.loading && state.error && (
        <div className="py-6 text-center">
          <p className="text-red-500 dark:text-red-400 text-sm mb-2">
            Something went wrong loading results.
          </p>
          <button
            onClick={() => loadBatch(state.cursor, true)}
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {!state.loading && !state.error && state.periods.length === 0 && (
        <div className="py-8 text-center text-gray-400 dark:text-gray-500">
          No results found
        </div>
      )}

      {state.hasMore && <div ref={sentinelRef} className="h-1" />}
    </div>
  );
}
