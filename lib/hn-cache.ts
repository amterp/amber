import { Period, Submission } from "./types";

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const MS_PER_DAY = 86400 * 1000;

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
  const startMs = period.start * 1000;
  const endMs = period.end * 1000;

  for (let ms = startMs; ms < endMs; ms += MS_PER_DAY) {
    keys.push(new Date(ms).toISOString().slice(0, 10));
  }

  return keys;
}

/**
 * Generate all UTC date keys (YYYY-MM-DD) covering a timestamp range.
 * Floors both boundaries to their UTC day so non-midnight timestamps
 * still produce correct coverage.
 */
export function dayKeysForRange(startSec: number, endSec: number): string[] {
  if (startSec >= endSec) return [];

  const keys: string[] = [];
  const startDay = floorToUtcDay(startSec * 1000);
  const endDay = floorToUtcDay(endSec * 1000);

  for (let ms = startDay; ms < endDay; ms += MS_PER_DAY) {
    keys.push(new Date(ms).toISOString().slice(0, 10));
  }

  // Include the end day if endSec doesn't land exactly on midnight
  if (endSec * 1000 > endDay) {
    const endKey = new Date(endDay).toISOString().slice(0, 10);
    if (keys.length === 0 || keys[keys.length - 1] !== endKey) {
      keys.push(endKey);
    }
  }

  return keys;
}

function floorToUtcDay(ms: number): number {
  return ms - (ms % MS_PER_DAY);
}

// ---------------------------------------------------------------------------
// Cache index
// ---------------------------------------------------------------------------

let cachedIndexPromise: Promise<Set<string>> | null = null;

export function loadIndex(): Promise<Set<string>> {
  if (!cachedIndexPromise) {
    cachedIndexPromise = fetch(`${basePath}/data/highlights/index.json`)
      .then((res) => {
        if (!res.ok) return new Set<string>();
        return res.json().then((data: Record<string, number>) =>
          new Set(Object.keys(data)),
        );
      })
      .catch(() => {
        cachedIndexPromise = null;
        return new Set<string>();
      });
  }
  return cachedIndexPromise;
}

// ---------------------------------------------------------------------------
// Segmentation for hybrid cache+Algolia
// ---------------------------------------------------------------------------

// Merge uncached gaps separated by fewer than this many cached days into a
// single Algolia query. Keeps the number of API calls low when the cache has
// small scattered holes (e.g. a missing day here and there). 7 was chosen so
// that a single missing day within a week-long cached run doesn't split into
// two separate Algolia queries.
const COALESCE_THRESHOLD = 7;

// If more than this many uncached segments remain after coalescing, the cache
// coverage is too fragmented to be useful - fall back to a full Algolia query
// (same cost as the pre-cache behavior). 3 keeps the max Algolia calls per
// browse request small while handling the common case of a leading gap,
// trailing gap, or one mid-range hole.
const MAX_UNCACHED_SEGMENTS = 3;

export interface CacheSegmentation {
  cachedKeys: string[];
  uncachedRanges: { from: number; to: number }[];
}

/**
 * Partition day keys into cached and uncached groups. Nearby uncached
 * segments (separated by < COALESCE_THRESHOLD cached days) are merged
 * into a single Algolia query range. Returns null if too many uncached
 * segments remain after coalescing, signaling the caller to fall back
 * to a full Algolia query.
 */
export function segmentDayKeys(
  dayKeys: string[],
  index: Set<string>,
): CacheSegmentation | null {
  if (dayKeys.length === 0) return { cachedKeys: [], uncachedRanges: [] };

  // Build raw segments: runs of cached / uncached day keys
  const rawUncached: { startIdx: number; endIdx: number }[] = [];
  let uncachedStart: number | null = null;

  for (let i = 0; i < dayKeys.length; i++) {
    const isCached = index.has(dayKeys[i]);
    if (!isCached) {
      if (uncachedStart === null) uncachedStart = i;
    } else {
      if (uncachedStart !== null) {
        rawUncached.push({ startIdx: uncachedStart, endIdx: i - 1 });
        uncachedStart = null;
      }
    }
  }
  if (uncachedStart !== null) {
    rawUncached.push({ startIdx: uncachedStart, endIdx: dayKeys.length - 1 });
  }

  if (rawUncached.length === 0) {
    return { cachedKeys: [...dayKeys], uncachedRanges: [] };
  }

  // Coalesce segments that are close together
  const coalesced: { startIdx: number; endIdx: number }[] = [rawUncached[0]];
  for (let i = 1; i < rawUncached.length; i++) {
    const prev = coalesced[coalesced.length - 1];
    const gap = rawUncached[i].startIdx - prev.endIdx - 1;
    if (gap < COALESCE_THRESHOLD) {
      prev.endIdx = rawUncached[i].endIdx;
    } else {
      coalesced.push(rawUncached[i]);
    }
  }

  if (coalesced.length > MAX_UNCACHED_SEGMENTS) {
    return null;
  }

  // Build the set of uncached key indices for fast lookup
  const uncachedIdxSet = new Set<number>();
  for (const seg of coalesced) {
    for (let i = seg.startIdx; i <= seg.endIdx; i++) {
      uncachedIdxSet.add(i);
    }
  }

  // Cached keys: all day keys not inside a coalesced uncached range.
  // Days inside a coalesced range that ARE cached still get fetched
  // from cache - the Algolia query will overlap for those days, and
  // the caller deduplicates by story ID after merging.
  const cachedKeys = dayKeys.filter((key, i) => !uncachedIdxSet.has(i) || index.has(key));

  // Convert coalesced segments to timestamp ranges for Algolia
  const uncachedRanges = coalesced.map((seg) => {
    const fromKey = dayKeys[seg.startIdx];
    const toKey = dayKeys[seg.endIdx];
    return {
      from: Date.parse(fromKey + "T00:00:00Z") / 1000,
      // End of the last day (next day midnight)
      to: Date.parse(toKey + "T00:00:00Z") / 1000 + 86400,
    };
  });

  return { cachedKeys, uncachedRanges };
}

/**
 * Fetch cached daily files for the given day keys. Returns merged
 * submissions from all files. Throws on any fetch failure.
 */
export async function fetchCachedDays(dayKeys: string[]): Promise<Submission[]> {
  if (dayKeys.length === 0) return [];

  const responses = await Promise.all(
    dayKeys.map((key) =>
      fetch(`${basePath}${dateCacheUrl(key)}`).then((res) => {
        if (!res.ok) throw new Error(`Cache miss: ${key}`);
        return res.json() as Promise<Submission[]>;
      }),
    ),
  );

  return responses.flat();
}
