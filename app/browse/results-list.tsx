"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import SubmissionCard from "@/components/submission-card";
import { searchAlgolia } from "@/lib/algolia";
import { Submission, SearchParams, TimeRange } from "@/lib/types";
import { getTimeRangeTimestamp } from "@/lib/time";

interface FetchState {
  hits: Submission[];
  loading: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
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

  const buildSearchParams = useCallback(
    (page: number): SearchParams => {
      const range = (searchParams.get("range") as TimeRange) || "7d";
      const type = searchParams.get("type") || "story";

      const params: SearchParams = {
        type,
        sort: "points",
        page,
        per_page: 30,
      };

      if (range === "custom") {
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        if (from) params.from = from;
        if (to) params.to = to;
      } else {
        const timestamp = getTimeRangeTimestamp(range);
        params.from = String(timestamp);
      }

      return params;
    },
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ hits: [], loading: true, hasMore: false, page: 0, error: null });
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
  }, [buildSearchParams, retryKey]);

  const loadMore = async () => {
    const nextPage = state.page + 1;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
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
