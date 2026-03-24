import { TimeRange, Step, Period } from "./types";

export function getTimeRangeTimestamp(range: TimeRange): number {
  const now = Math.floor(Date.now() / 1000);
  switch (range) {
    case "hot":
      throw new Error("getTimeRangeTimestamp is not valid for 'hot'");
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

function formatPeriodLabel(start: Date, step: Step): string {
  if (step === "monthly") {
    return start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  }
  if (step === "daily") {
    return start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  // weekly: "Mar 10 - 16, 2025" or "Mar 31 - Apr 6, 2025" when spanning months
  const end = new Date(start.getTime() + 6 * 86400 * 1000);
  const startMonth = start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const endYear = end.getUTCFullYear();
  if (start.getUTCMonth() === end.getUTCMonth()) {
    return `${startMonth} ${startDay} - ${endDay}, ${endYear}`;
  }
  const endMonth = end.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`;
}

/**
 * Generate periods going backward in time.
 * Returns `count` periods ending before `before` (defaults to start of current period).
 */
export function getPeriods(step: Step, count: number, before?: Date): Period[] {
  const periods: Period[] = [];
  const anchor = before ?? new Date();

  // Start from the beginning of the current period (exclusive - we skip it since it's incomplete)
  let cursor: Date;
  if (step === "monthly") {
    cursor = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
  } else if (step === "weekly") {
    // Walk back to Monday
    const d = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
    const day = d.getUTCDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0 offset
    d.setUTCDate(d.getUTCDate() - diff);
    cursor = d;
  } else {
    cursor = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()));
  }

  for (let i = 0; i < count; i++) {
    // Step backward
    let periodStart: Date;
    if (step === "monthly") {
      periodStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - 1, 1));
    } else if (step === "weekly") {
      periodStart = new Date(cursor.getTime() - 7 * 86400 * 1000);
    } else {
      periodStart = new Date(cursor.getTime() - 86400 * 1000);
    }

    let periodEnd: Date;
    if (step === "monthly") {
      periodEnd = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
    } else if (step === "weekly") {
      periodEnd = new Date(periodStart.getTime() + 7 * 86400 * 1000);
    } else {
      periodEnd = new Date(periodStart.getTime() + 86400 * 1000);
    }

    periods.push({
      start: Math.floor(periodStart.getTime() / 1000),
      end: Math.floor(periodEnd.getTime() / 1000),
      label: formatPeriodLabel(periodStart, step),
    });

    cursor = periodStart;
  }

  return periods;
}

/**
 * Generate the next batch of periods continuing from a cursor timestamp.
 * The cursor should be the `start` of the last loaded period.
 */
export function getMorePeriods(step: Step, count: number, cursorTimestamp: number): Period[] {
  const cursorDate = new Date(cursorTimestamp * 1000);
  return getPeriods(step, count, cursorDate);
}
