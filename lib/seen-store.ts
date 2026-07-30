import { StoryHeader, Submission } from "./types";

/**
 * Remembers submissions the feeds have already rendered, so opening a thread can
 * paint its real title and score immediately instead of showing a header
 * skeleton for the second or more that the comment fetch takes.
 *
 * Module-level and bounded: it survives client-side navigation, resets on a hard
 * reload, and never grows without limit.
 */
const CAP = 500;

const store = new Map<string, Submission>();

export function rememberSubmissions(subs: readonly Submission[]): void {
  for (const sub of subs) {
    store.delete(sub.id); // re-insert so recency ordering holds
    store.set(sub.id, sub);
  }
  while (store.size > CAP) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

export function recallSubmission(id: string | null): Submission | null {
  if (!id) return null;
  return store.get(id) ?? null;
}

/**
 * Shape a remembered submission like a thread's own header so the header
 * component has one prop type. `commentCount` here is the search API's figure,
 * which runs a couple of percent high because dead comments are counted; the
 * real count replaces it once the tree arrives.
 */
export function headerFromSubmission(sub: Submission): StoryHeader {
  return {
    id: Number(sub.id),
    title: sub.title,
    url: sub.url,
    domain: sub.domain,
    author: sub.author,
    points: sub.points,
    text: null,
    createdAtTimestamp: sub.createdAtTimestamp,
    commentCount: sub.commentCount,
  };
}
