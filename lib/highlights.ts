import { Period } from "./types";

/**
 * Derive a UTC date string (YYYY-MM-DD) from a Unix timestamp (seconds).
 */
export function dateCacheKey(timestampSec: number): string {
  return new Date(timestampSec * 1000).toISOString().slice(0, 10);
}

/**
 * Build the URL path to a cached daily JSON file.
 * Caller must prepend basePath if needed.
 */
export function dateCacheUrl(dateKey: string): string {
  return `/data/highlights/${dateKey}.json`;
}

/**
 * Generate all UTC date keys (YYYY-MM-DD) covering a period's range.
 * For a daily period this returns 1 key; weekly returns 7; monthly ~28-31.
 */
export function dayKeysForPeriod(period: Period): string[] {
  const keys: string[] = [];
  const msPerDay = 86400 * 1000;
  const startMs = period.start * 1000;
  const endMs = period.end * 1000;

  for (let ms = startMs; ms < endMs; ms += msPerDay) {
    keys.push(new Date(ms).toISOString().slice(0, 10));
  }

  return keys;
}
