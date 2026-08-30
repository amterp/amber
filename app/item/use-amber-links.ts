"use client";

import { useRouter } from "next/navigation";
import { MouseEvent, useCallback } from "react";
import { itemHref } from "@/lib/url";

/**
 * Delegated click handling for the "open in Amber" badges that
 * lib/comment-html.ts injects into comment bodies. One listener per container
 * of comment HTML, rather than anything per comment, since the markup goes in
 * through dangerouslySetInnerHTML and has no React nodes to hang a handler on.
 *
 * `onJump` gets first refusal: a thread can claim a comment it already holds
 * and scroll to it, which beats fetching a thread that is on screen already.
 * Anything it declines becomes an ordinary soft navigation - worth keeping over
 * the anchor's own href, because a full document load throws away the seen-store
 * cache that paints the next story's header on the first frame.
 */
export function useAmberLinkClick(
  onJump?: (id: number) => boolean
): (e: MouseEvent<HTMLElement>) => void {
  const router = useRouter();

  return useCallback(
    (e: MouseEvent<HTMLElement>) => {
      // Modified and non-primary clicks stay with the browser, so the badge
      // opens in a new tab like any other link.
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const badge = (e.target as Element | null)?.closest("[data-amber-item]");
      if (!badge) return;

      const id = Number(badge.getAttribute("data-amber-item"));
      const commentId =
        Number(badge.getAttribute("data-amber-comment")) || null;
      if (!id) return;

      e.preventDefault();
      // An id with no fragment is HN's own permalink shape, where the id may
      // itself be the comment - so that is what the thread is asked about.
      if (onJump?.(commentId ?? id)) return;
      router.push(itemHref(id, commentId));
    },
    [router, onJump]
  );
}
