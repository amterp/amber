import { Submission } from "./types";

/**
 * Remembers where you were on /browse so returning from a thread is instant
 * instead of a refetch that dumps you back at the top.
 *
 * Module-level rather than sessionStorage, on purpose: it survives client-side
 * navigation but resets on a hard reload, which is exactly the semantic you
 * want ("back feels instant, refresh is fresh"), and it avoids serializing
 * thousands of objects on every navigation.
 */
export interface BrowseSnapshot {
  key: string;
  /** Full hybrid result set, which "Load more" pages through without a request. */
  all: Submission[] | null;
  hits: Submission[];
  page: number;
  hasMore: boolean;
  scrollY: number;
}

const TTL_MS = 10 * 60_000;
const CAP = 3;

const store = new Map<string, BrowseSnapshot & { at: number }>();

/** Identifies a distinct set of browse results. Page is excluded by design. */
export function browseKey(params: {
  get(name: string): string | null;
}): string {
  return [
    params.get("range") ?? "hot",
    params.get("type") ?? "story",
    params.get("from") ?? "",
    params.get("to") ?? "",
  ].join("|");
}

export function readBrowse(key: string): BrowseSnapshot | null {
  const snapshot = store.get(key);
  if (!snapshot) return null;
  if (Date.now() - snapshot.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return snapshot;
}

export function writeBrowse(snapshot: BrowseSnapshot): void {
  store.delete(snapshot.key); // re-insert so recency ordering holds
  store.set(snapshot.key, { ...snapshot, at: Date.now() });
  while (store.size > CAP) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}
