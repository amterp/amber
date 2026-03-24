"use client";

import { SubmissionType } from "@/lib/types";

interface Props {
  selected: Set<SubmissionType>;
  onToggle: (type: SubmissionType) => void;
}

const TYPES: { label: string; value: SubmissionType }[] = [
  { label: "Story", value: "story" },
  { label: "Ask HN", value: "ask_hn" },
  { label: "Show HN", value: "show_hn" },
  { label: "Poll", value: "poll" },
  { label: "Job", value: "job" },
];

export default function TypeFilter({ selected, onToggle }: Props) {
  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
      <span className="shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Type</span>
      {TYPES.map((type) => (
        <button
          key={type.value}
          onClick={() => onToggle(type.value)}
          aria-pressed={selected.has(type.value)}
          className={`shrink-0 rounded-full px-2 sm:px-3 py-1 text-sm font-medium transition-colors ${
            selected.has(type.value)
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
}
