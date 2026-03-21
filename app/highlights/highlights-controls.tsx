"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Step } from "@/lib/types";

const STEPS: { label: string; value: Step }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const COUNTS = [5, 10, 20, 50] as const;

export default function HighlightsControls() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const step = (searchParams.get("step") as Step) || "monthly";
  const count = Number(searchParams.get("count")) || 20;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value);
      }
      router.push(`/highlights?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="sticky top-12 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95">
      <div className="mx-auto max-w-5xl px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">
            Period
          </span>
          {STEPS.map((s) => (
            <button
              key={s.value}
              onClick={() => updateParams({ step: s.value })}
              aria-pressed={step === s.value}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                step === s.value
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">
            Top
          </span>
          {COUNTS.map((c) => (
            <button
              key={c}
              onClick={() => updateParams({ count: String(c) })}
              aria-pressed={count === c}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                count === c
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
