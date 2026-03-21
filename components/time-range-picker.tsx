"use client";

import { TimeRange } from "@/lib/types";

interface Props {
  selected: TimeRange;
  customFrom: string;
  customTo: string;
  onSelect: (range: TimeRange) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
}

const PRESETS: { label: string; value: TimeRange }[] = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
  { label: "1y", value: "1y" },
  { label: "Custom", value: "custom" },
];

export default function TimeRangePicker({
  selected,
  customFrom,
  customTo,
  onSelect,
  onCustomFromChange,
  onCustomToChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide dark:text-gray-400">Time</span>
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onSelect(preset.value)}
          aria-pressed={selected === preset.value}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            selected === preset.value
              ? "bg-orange-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          }`}
        >
          {preset.label}
        </button>
      ))}
      {selected === "custom" && (
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-1">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
          <span className="text-gray-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          />
        </div>
      )}
    </div>
  );
}
