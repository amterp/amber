"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  expandAncestors,
  firstChild,
  nextSibling,
  nextTopLevel,
  parentIndex,
  positionOf,
  prevSibling,
  prevTopLevel,
  stepVisible,
  toggleCollapsed,
  visibleIndices,
} from "@/lib/thread";
import { Thread } from "@/lib/types";
import AncestorBar from "./ancestor-bar";
import CommentRow from "./comment-row";
import KeyboardHelp from "./keyboard-help";
import {
  captureRowTops,
  captureScrollAnchor,
  playRowShift,
  restoreScrollAnchor,
  scrollToComment,
  ScrollAnchor,
} from "./motion";
import { createRowTracker, RowTracker } from "./row-tracker";
import { useAmberLinkClick } from "./use-amber-links";

interface Props {
  thread: Thread;
  articleUrl: string | null;
}

/**
 * Scroll a comment under the sticky headers and optionally focus it.
 *
 * Two frames before we touch the scroll position: the first for React's commit,
 * the second for layout of rows whose content-visibility placeholder just became
 * real. The animation itself handles any remaining drift.
 */
function revealComment(id: number, focus: boolean) {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const el = document.getElementById(`c${id}`);
      if (!el) return;
      if (focus) el.focus({ preventScroll: true });
      scrollToComment(id);
    })
  );
}

export default function CommentThread({ thread, articleUrl }: Props) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(
    () => new Set()
  );
  /** Set by keyboard and by the per-comment nav controls. */
  const [focused, setFocused] = useState(-1);
  /** Set by the scroll tripwire. */
  const [tracked, setTracked] = useState(-1);
  const [showHelp, setShowHelp] = useState(false);
  const [expandedChain, setExpandedChain] = useState(false);

  const visible = useMemo(
    () => visibleIndices(thread, collapsed),
    [thread, collapsed]
  );

  // One notion of "the comment I'm on": what you last navigated to, otherwise
  // whatever is under the headers. On touch there is no focus gesture to spare
  // (tapping a header collapses it), and "next reply at this level" should mean
  // next reply to what you're looking at anyway. The pin releases on the next
  // wheel/touch scroll (see the effect above), so this only wins for as long
  // as the reader hasn't scrolled since navigating.
  const current = focused >= 0 && positionOf(visible, focused) >= 0 ? focused : tracked;

  // Built once via a lazy initializer, not in an effect: rows' effects run
  // before this component's, so the tracker has to exist by first render or the
  // initial rows never get observed. Its identity stays stable for the whole
  // thread, so it never re-triggers a row's observe effect.
  const [tracker] = useState<RowTracker | null>(() =>
    typeof window === "undefined" ? null : createRowTracker(setTracked)
  );

  useEffect(() => () => tracker?.disconnect(), [tracker]);

  // A wheel tick or touch drag means the reader has moved on from wherever
  // they last navigated to - release the pin so `current` tracks the header
  // line again instead of staying stuck on a spot they've since scrolled
  // away from (including a top-level comment's empty ancestor chain, which
  // otherwise keeps the ancestor bar hidden long after scrolling into its
  // replies). Deliberately not a plain `scroll` listener: our own animated
  // navigation calls `window.scrollTo` every frame, which fires `scroll`
  // events indistinguishable from the reader's own - wheel/touch are real
  // input, so they're what everything else in this file already keys off of
  // to tell "the reader took over" apart from "we're still animating".
  useEffect(() => {
    const releaseFocus = () => setFocused(-1);
    window.addEventListener("wheel", releaseFocus, { passive: true });
    window.addEventListener("touchmove", releaseFocus, { passive: true });
    return () => {
      window.removeEventListener("wheel", releaseFocus);
      window.removeEventListener("touchmove", releaseFocus);
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const target = thread.comments[index];
      if (!target) return;
      setFocused(index);
      setCollapsed((prev) =>
        positionOf(visibleIndices(thread, prev), index) >= 0
          ? prev
          : expandAncestors(thread, prev, index)
      );
      revealComment(target.id, true);
    },
    [thread]
  );

  /**
   * Collapsing never navigates. It holds the reader's place with a scroll
   * anchor and animates the gap closing, so the only thing that appears to move
   * is the content that actually changed.
   */
  const pendingCollapse = useRef<{
    anchor: ScrollAnchor | null;
    tops: Map<number, number>;
    collapsedId?: number;
  } | null>(null);

  useLayoutEffect(() => {
    const pending = pendingCollapse.current;
    pendingCollapse.current = null;
    if (!pending) return;
    // Anchor first: playRowShift measures against the corrected scroll position.
    restoreScrollAnchor(pending.anchor, pending.collapsedId);
    playRowShift(pending.tops);
  }, [visible]);

  const beginCollapse = useCallback((collapsedId?: number) => {
    pendingCollapse.current = {
      anchor: captureScrollAnchor(),
      tops: captureRowTops(),
      collapsedId,
    };
  }, []);

  const toggle = useCallback(
    (id: number) => {
      beginCollapse(id);
      setCollapsed((prev) => toggleCollapsed(prev, id));
    },
    [beginCollapse]
  );

  // Bulk-collapses a whole ancestor branch. Reached only via the 'z'
  // keyboard shortcut now - rails and ancestor-bar chips navigate instead,
  // since a click landing near a row used to collapse whatever ancestor
  // happened to own that column, not the row it looked like you clicked.
  const collapseAncestor = useCallback(
    (index: number) => {
      const target = thread.comments[index];
      if (!target) return;
      beginCollapse(target.id);
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.add(target.id);
        return next;
      });
    },
    [thread, beginCollapse]
  );

  /** Jump past an ancestor's whole branch to whatever comes next at its level. */
  const skipAncestor = useCallback(
    (index: number) => goTo(nextSibling(thread, index)),
    [thread, goTo]
  );

  /**
   * A badge pointing at a comment this thread already holds should not cost a
   * page load. Anything else is declined, and navigates.
   */
  const jumpToComment = useCallback(
    (id: number) => {
      const index = thread.indexById.get(id);
      if (index === undefined) return false;
      goTo(index);
      return true;
    },
    [thread, goTo]
  );

  const onAmberLink = useAmberLinkClick(jumpToComment);

  // Stable across renders, so it never defeats CommentRow's memo.
  const authorAt = useCallback(
    (index: number) => thread.comments[index]?.author ?? "[deleted]",
    [thread]
  );

  /** Lets a rail know, without touching thread.comments directly, whether it has anywhere to skip to. */
  const nextSiblingAt = useCallback(
    (index: number) => thread.comments[index]?.nextSiblingIndex ?? -1,
    [thread]
  );

  const keyState = useRef({ thread, visible, current, collapsed, articleUrl });
  useEffect(() => {
    keyState.current = { thread, visible, current, collapsed, articleUrl };
  });

  useEffect(() => {
    let awaitingSecondG = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const s = keyState.current;
      const at = s.current;
      const jump = (index: number) => {
        if (index >= 0) {
          e.preventDefault();
          goTo(index);
        }
      };

      const isG = e.key === "g";
      if (awaitingSecondG && isG) {
        awaitingSecondG = false;
        jump(s.visible[0] ?? -1);
        return;
      }
      awaitingSecondG = isG;
      if (isG) return;

      switch (e.key) {
        case "j":
          return jump(stepVisible(s.visible, at, 1));
        case "k":
          return jump(stepVisible(s.visible, at, -1));
        case "n":
          return jump(nextSibling(s.thread, at));
        case "p":
          return jump(prevSibling(s.thread, at));
        case "h":
          return jump(parentIndex(s.thread, at));
        case "l": {
          const child = firstChild(s.thread, at);
          if (child < 0) return;
          const self = s.thread.comments[at];
          if (self && s.collapsed.has(self.id)) toggle(self.id);
          return jump(child);
        }
        case "u": {
          const self = s.thread.comments[at];
          const root = self?.ancestorIndices[0];
          return jump(root === undefined ? -1 : root);
        }
        case "[":
          return jump(prevTopLevel(s.thread, at));
        case "]":
          return jump(nextTopLevel(s.thread, at));
        case "G":
          return jump(s.visible[s.visible.length - 1] ?? -1);
        case "c":
        case "Enter": {
          const self = s.thread.comments[at];
          if (!self) return;
          e.preventDefault();
          return toggle(self.id);
        }
        case "z": {
          const parent = parentIndex(s.thread, at);
          if (parent < 0) return;
          e.preventDefault();
          return collapseAncestor(parent);
        }
        case "o": {
          if (!s.articleUrl) return;
          e.preventDefault();
          window.open(s.articleUrl, "_blank", "noopener,noreferrer");
          return;
        }
        case "?":
          e.preventDefault();
          return setShowHelp((v) => !v);
        case "Escape":
          setShowHelp(false);
          setFocused(-1);
          return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, toggle, collapseAncestor]);

  // Deep links: #c12345 expands whatever it takes to reveal that comment.
  const handledHash = useRef<string | null>(null);
  useEffect(() => {
    const applyHash = () => {
      const match = /^#c(\d+)$/.exec(window.location.hash);
      if (!match) return;
      if (handledHash.current === window.location.hash) return;
      handledHash.current = window.location.hash;

      const index = thread.indexById.get(Number(match[1]));
      if (index === undefined) return;
      goTo(index);
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, [thread, goTo]);

  if (thread.comments.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        No comments yet.
      </p>
    );
  }

  return (
    <>
      <AncestorBar
        thread={thread}
        currentIndex={current}
        expandedChain={expandedChain}
        onExpandChain={() => setExpandedChain(true)}
        onPick={goTo}
      />

      <div onClick={onAmberLink}>
        {visible.map((index) => {
          const comment = thread.comments[index];
          return (
            <CommentRow
              key={comment.id}
              comment={comment}
              collapsed={collapsed.has(comment.id)}
              current={index === focused}
              onToggle={toggle}
              onSkipAncestor={skipAncestor}
              nextSiblingAt={nextSiblingAt}
              onNavigate={goTo}
              authorAt={authorAt}
              tracker={tracker}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowHelp(true)}
        aria-label="Keyboard shortcuts"
        className="fixed bottom-4 right-4 z-40 hidden h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-sm text-gray-500 shadow-sm backdrop-blur-sm transition-colors hover:text-gray-900 pointer-fine:flex dark:border-gray-700 dark:bg-gray-900/90 dark:text-gray-400 dark:hover:text-gray-100"
      >
        <span aria-hidden>?</span>
      </button>

      {showHelp && <KeyboardHelp onClose={() => setShowHelp(false)} />}
    </>
  );
}
