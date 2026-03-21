import { TimeRange } from "./types";

export function getTimeRangeTimestamp(range: TimeRange): number {
  const now = Math.floor(Date.now() / 1000);
  switch (range) {
    case "24h":
      return now - 86400;
    case "7d":
      return now - 7 * 86400;
    case "30d":
      return now - 30 * 86400;
    case "1y":
      return now - 365 * 86400;
    case "custom":
      return 0;
  }
}

export function parseDate(input: string): number {
  const asNumber = Number(input);
  if (!isNaN(asNumber) && asNumber > 1e9) {
    return Math.floor(asNumber);
  }
  // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by the JS spec,
  // which shifts the boundary in non-UTC timezones. Appending T00:00:00 forces
  // local-time interpretation, matching what a user selecting a date expects.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(input) ? `${input}T00:00:00` : input;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${input}`);
  }
  return Math.floor(date.getTime() / 1000);
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

export function getMonthRange(year: number, month: number): { start: number; end: number } {
  const start = Math.floor(Date.UTC(year, month, 1) / 1000);
  const end = Math.floor(Date.UTC(year, month + 1, 1) / 1000);
  return { start, end };
}

export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
