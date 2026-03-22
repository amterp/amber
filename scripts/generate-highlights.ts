/**
 * Generate cached highlights data.
 *
 * For each UTC day from the start date (2020-01-01) up to the cache
 * cutoff (30 days ago), fetches the top 50 stories from Algolia and
 * writes them as a JSON file.
 *
 * Uses a continuous refresh function to decide when existing data is
 * stale: the refresh interval scales linearly with data age (roughly
 * half the age), floored at 7 days and capped at 180 days. A per-run
 * cap of 200 prevents excessive API calls.
 *
 * Writes index.json - an object mapping date strings to their
 * last-updated timestamps (seconds). The frontend uses this index to
 * decide whether to load from cache or query Algolia live.
 *
 * Usage: npx tsx scripts/generate-highlights.ts
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { searchAlgolia } from "../lib/algolia";
import { dateCacheKey } from "../lib/highlights";

const DATA_DIR = path.resolve(__dirname, "../public/data/highlights");
const INDEX_PATH = path.join(DATA_DIR, "index.json");
const START_DATE = "2020-01-01";
const CUTOFF_DAYS = 30;
const DELAY_MS = 100;
const MAX_REFRESHES = 200;

const SEVEN_DAYS_SEC = 604800;
const ONE_EIGHTY_DAYS_SEC = 15552000;
const ONE_YEAR_SEC = 31536000;

type Index = Record<string, number>;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * How often a data point should be refreshed based on its age.
 * Scales linearly: roughly half the data age, floored at 7 days,
 * capped at 180 days.
 */
function refreshIntervalSec(dataAgeSec: number): number {
  return Math.max(
    SEVEN_DAYS_SEC,
    Math.min(ONE_EIGHTY_DAYS_SEC, (ONE_EIGHTY_DAYS_SEC / ONE_YEAR_SEC) * dataAgeSec),
  );
}

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const msPerDay = 86400 * 1000;
  const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
  const endMs = new Date(`${endDate}T00:00:00Z`).getTime();

  for (let ms = startMs; ms < endMs; ms += msPerDay) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }

  return dates;
}

async function loadIndex(nowSec: number): Promise<Index> {
  try {
    const raw = await readFile(INDEX_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    // Migrate from old array format to object format
    if (Array.isArray(parsed)) {
      console.log(`Migrating index.json from array format (${parsed.length} entries)`);
      const migrated: Index = {};
      for (const date of parsed) {
        migrated[date] = nowSec;
      }
      return migrated;
    }

    return parsed as Index;
  } catch {
    return {};
  }
}

interface DateEntry {
  date: string;
  isNew: boolean;
  stalenessRatio: number;
}

function classifyDates(
  dates: string[],
  index: Index,
  nowSec: number,
): { toFetch: DateEntry[]; freshCount: number } {
  const toFetch: DateEntry[] = [];
  let freshCount = 0;

  for (const date of dates) {
    const updatedAtSec = index[date];

    if (updatedAtSec === undefined) {
      toFetch.push({ date, isNew: true, stalenessRatio: Infinity });
      continue;
    }

    const dateTimestampSec = Math.floor(
      new Date(`${date}T00:00:00Z`).getTime() / 1000,
    );
    const dataAgeSec = nowSec - dateTimestampSec;
    const intervalSec = refreshIntervalSec(dataAgeSec);
    const timeSinceUpdateSec = nowSec - updatedAtSec;

    if (timeSinceUpdateSec > intervalSec) {
      toFetch.push({
        date,
        isNew: false,
        stalenessRatio: timeSinceUpdateSec / intervalSec,
      });
    } else {
      freshCount++;
    }
  }

  // Most stale first
  toFetch.sort((a, b) => b.stalenessRatio - a.stalenessRatio);

  return { toFetch, freshCount };
}

async function main(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  const nowSec = Math.floor(Date.now() / 1000);
  const cutoffSec = nowSec - CUTOFF_DAYS * 86400;
  const cutoffDate = dateCacheKey(cutoffSec);

  const index = await loadIndex(nowSec);
  const dates = generateDateRange(START_DATE, cutoffDate);
  const { toFetch, freshCount } = classifyDates(dates, index, nowSec);

  const capped = toFetch.slice(0, MAX_REFRESHES);
  const skippedByCap = toFetch.length - capped.length;

  const newCount = capped.filter((e) => e.isNew).length;
  const refreshCount = capped.length - newCount;

  console.log(
    `${dates.length} total days (${START_DATE} to ${cutoffDate})\n` +
    `  ${freshCount} fresh, ${newCount} new, ${refreshCount} stale` +
    (skippedByCap > 0 ? `, ${skippedByCap} deferred (cap)` : ""),
  );

  let fetched = 0;
  let failed = 0;

  for (const entry of capped) {
    const fromTimestampSec = Math.floor(
      new Date(`${entry.date}T00:00:00Z`).getTime() / 1000,
    );
    const toTimestampSec = fromTimestampSec + 86400;

    try {
      const data = await searchAlgolia({
        type: "story",
        sort: "points",
        per_page: 50,
        page: 0,
        from: String(fromTimestampSec),
        to: String(toTimestampSec),
      });

      const filePath = path.join(DATA_DIR, `${entry.date}.json`);
      await writeFile(filePath, JSON.stringify(data.hits), "utf-8");
      index[entry.date] = nowSec;
      fetched++;

      if (fetched % 50 === 0) {
        console.log(`  Fetched ${fetched}/${capped.length}...`);
      }

      await sleep(DELAY_MS);
    } catch (err) {
      console.error(`  Failed: ${entry.date} - ${(err as Error).message}`);
      failed++;
      await sleep(DELAY_MS * 5);
    }
  }

  await writeFile(INDEX_PATH, JSON.stringify(index, null, 0), "utf-8");
  console.log(`\nWrote index.json with ${Object.keys(index).length} entries`);

  console.log(
    `Done: ${newCount > 0 ? `${fetched - refreshCount + failed} new, ` : ""}` +
    `${refreshCount - failed} refreshed, ${freshCount} fresh, ${failed} failed`,
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
