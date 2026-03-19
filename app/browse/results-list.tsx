"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import SubmissionCard from "@/components/submission-card";
import { Submission, TimeRange } from "@/lib/types";
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

  const buildApiUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams();
      const range = (searchParams.get("range") as TimeRange) || "7d";
      const type = searchParams.get("type") || "story";

      params.set("type", type);
      params.set("sort", "points");
      params.set("page", String(page));
      params.set("per_page", "30");

      if (range === "custom") {
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      } else {
        const timestamp = getTimeRangeTimestamp(range);
        params.set("from", String(timestamp));
      }

      return `/api/search?${params.toString()}`;
    },
    [searchParams],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ hits: [], loading: true, hasMore: false, page: 0, error: null });
      try {
        const res = await fetch(buildApiUrl(0));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
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
  }, [buildApiUrl]);

  const loadMore = async () => {
    const nextPage = state.page + 1;
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(buildApiUrl(nextPage));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
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

  if (state.error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center text-red-500">
        Error: {state.error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {state.hits.map((hit, i) => (
        <SubmissionCard key={hit.id} submission={hit} rank={state.page > 0 ? i + 1 : i + 1} />
      ))}

      {state.loading && (
        <div className="py-8 text-center text-gray-400">Loading...</div>
      )}

      {!state.loading && state.hits.length === 0 && (
        <div className="py-8 text-center text-gray-400">No results found</div>
      )}

      {!state.loading && state.hasMore && (
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
