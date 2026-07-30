import { fetchItem } from "./algolia";
import { cacheGetOrSet } from "./cache";
import { buildThread, commentPermalinkRedirect } from "./thread";
import { Thread } from "./types";

const THREAD_TTL_MS = 5 * 60_000;

export type ThreadResult =
  | { kind: "thread"; thread: Thread }
  /** The requested id was a comment. HN's own permalinks look like this. */
  | { kind: "comment"; storyId: number; commentId: number };

/**
 * Fetch and flatten a discussion, memoized for five minutes.
 *
 * Deliberately takes no AbortSignal. Aborting would poison the shared promise
 * for every other caller and throw away a download we'd only have to repeat, and
 * React's development double-mount would abort every first attempt. Callers that
 * unmount should ignore the result instead.
 */
export function loadThread(id: string): Promise<ThreadResult> {
  return cacheGetOrSet(`item:${id}`, THREAD_TTL_MS, async () => {
    const root = await fetchItem(id);

    const redirect = commentPermalinkRedirect(root);
    if (redirect) {
      return {
        kind: "comment" as const,
        storyId: redirect.storyId,
        commentId: redirect.commentId,
      };
    }

    return { kind: "thread" as const, thread: buildThread(root) };
  });
}
