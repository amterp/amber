"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import TimeRangePicker from "@/components/time-range-picker";
import TypeFilter from "@/components/type-filter";
import { TimeRange, SubmissionType } from "@/lib/types";

export default function BrowseControls() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const timeRange = (searchParams.get("range") as TimeRange) || "7d";
  const customFrom = searchParams.get("from") || "";
  const customTo = searchParams.get("to") || "";
  const typesParam = searchParams.get("type") || "story";
  const selectedTypes = new Set(typesParam.split(",").filter(Boolean) as SubmissionType[]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page");
      router.push(`/browse?${params.toString()}`);
    },
    [router, searchParams],
  );

  const handleTimeRange = (range: TimeRange) => {
    if (range === "custom") {
      updateParams({ range: "custom" });
    } else {
      updateParams({ range, from: null, to: null });
    }
  };

  const handleTypeToggle = (type: SubmissionType) => {
    const next = new Set(selectedTypes);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    if (next.size === 0) next.add("story");
    updateParams({ type: Array.from(next).join(",") });
  };

  return (
    <div className="sticky top-12 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <TimeRangePicker
          selected={timeRange}
          customFrom={customFrom}
          customTo={customTo}
          onSelect={handleTimeRange}
          onCustomFromChange={(v) => updateParams({ from: v })}
          onCustomToChange={(v) => updateParams({ to: v })}
        />
        <TypeFilter selected={selectedTypes} onToggle={handleTypeToggle} />
      </div>
    </div>
  );
}
