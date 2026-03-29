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
  // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by the JS spec.
  // We keep this behavior so custom browse ranges use the same UTC boundaries
  // as highlights periods.
  const date = new Date(input);
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

function formatPeriodLabel(start: Date, step: Step, inProgress?: boolean): string {
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
  // weekly in-progress: "Mar 23 - Present"
  if (inProgress) {
    const startMonth = start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    const startDay = start.getUTCDate();
    return `${startMonth} ${startDay} - Present`;
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
 * When `includeCurrent` is true (default), the first period is the current
 * in-progress period. The remaining `count - 1` periods are completed ones.
 * When false, all `count` periods are completed (used by getMorePeriods).
 */
export function getPeriods(step: Step, count: number, before?: Date, includeCurrent: boolean = true): Period[] {
  const periods: Period[] = [];
  const anchor = before ?? new Date();

  // Start from the beginning of the current period
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

  // Include the current in-progress period as the first entry
  if (includeCurrent) {
    let periodEnd: Date;
    if (step === "monthly") {
      periodEnd = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    } else if (step === "weekly") {
      periodEnd = new Date(cursor.getTime() + 7 * 86400 * 1000);
    } else {
      periodEnd = new Date(cursor.getTime() + 86400 * 1000);
    }

    periods.push({
      start: Math.floor(cursor.getTime() / 1000),
      end: Math.floor(periodEnd.getTime() / 1000),
      label: formatPeriodLabel(cursor, step, true),
      inProgress: true,
    });
  }

  const remaining = includeCurrent ? count - 1 : count;
  for (let i = 0; i < remaining; i++) {
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
 * Never includes the current period (that's only in the initial load).
 */
export function getMorePeriods(step: Step, count: number, cursorTimestamp: number): Period[] {
  const cursorDate = new Date(cursorTimestamp * 1000);
  return getPeriods(step, count, cursorDate, false);
}
