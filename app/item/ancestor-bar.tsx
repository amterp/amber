import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { computeVisibleChipCount } from "@/lib/chip-fit";
import { FlatComment, Thread } from "@/lib/types";
import { railTint } from "./rail-style";

interface Props {
  thread: Thread;
  /** The comment currently under the sticky headers, or -1. */
  currentIndex: number;
  expandedChain: boolean;
  onExpandChain: () => void;
  onPick: (index: number) => void;
}

/** Shown before the bar's first real measurement resolves, so first paint matches. */
const INITIAL_VISIBLE_CHIPS = 4;

/**
 * Shows the ancestor chain of whatever you're reading, so a deep reply never
 * leaves you wondering who it's replying to. Each chip's dot matches that
 * level's rail, which is what makes the bar read as part of the same system
 * rather than a bolted-on breadcrumb.
 */
export default function AncestorBar({
  thread,
  currentIndex,
  expandedChain,
  onExpandChain,
  onPick,
}: Props) {
  const current: FlatComment | undefined = thread.comments[currentIndex];
  // Memoized so a reader with no ancestors (chain === []) gets a referentially
  // stable empty array, not a fresh one every render - otherwise recomputeFit
  // below would rebuild on every render instead of only when current changes.
  const chain = useMemo(() => current?.ancestorIndices ?? [], [current]);

  // How many chips actually fit the bar's current width, measured below
  // rather than capped at a fixed count - a wide window shouldn't elide any
  // sooner than it has to.
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CHIPS);
  const barRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const pillRef = useRef<HTMLElement | null>(null);
  const chevronRef = useRef<HTMLElement | null>(null);

  const recomputeFit = useCallback(() => {
    const container = barRef.current;
    if (!container || chain.length === 0) return;
    const chipWidths = chipRefs.current
      .slice(0, chain.length)
      .map((el) => el?.offsetWidth ?? 0);
    setVisibleCount(
      computeVisibleChipCount(
        container.clientWidth,
        chipWidths,
        pillRef.current?.offsetWidth ?? 0,
        chevronRef.current?.offsetWidth ?? 0
      )
    );
  }, [chain]);

  // Runs before paint so a chain change (navigating to a different comment)
  // never flashes the previous count for a frame.
  useLayoutEffect(() => {
    recomputeFit();
  }, [recomputeFit]);

  useEffect(() => {
    const container = barRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => recomputeFit());
    observer.observe(container);
    return () => observer.disconnect();
  }, [recomputeFit]);

  if (chain.length === 0) return null;

  const elided = !expandedChain && chain.length > visibleCount;
  const shown = elided ? chain.slice(chain.length - visibleCount) : chain;
  const firstShownLevel = chain.length - shown.length;

  return (
    <div
      ref={barRef}
      className="sticky top-[100px] z-30 -mx-4 flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white/95 px-4 py-1.5 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95"
    >
      <span className="sr-only">Replying within:</span>

      {/* Off-screen twin of the full, unelided chain plus a worst-case pill
          and a chevron, purely so recomputeFit can read real rendered widths.
          visibility:hidden (not display:none, which reports zero width) keeps
          it out of both the visual layout and hit-testing. */}
      <div
        aria-hidden
        className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-1"
      >
        {chain.map((ancestorIndex, i) => (
          <span
            key={ancestorIndex}
            ref={(el) => {
              chipRefs.current[i] = el;
            }}
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          >
            <span className="h-2 w-2 shrink-0 rounded-full" />
            {thread.comments[ancestorIndex]?.author ?? "[deleted]"}
          </span>
        ))}
        <span
          ref={(el) => {
            pillRef.current = el;
          }}
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
        >
          {/* Widest realistic pill for this chain: can never elide more than
              chain.length - 1 chips, since at least one chip always shows. */}
          +{Math.max(chain.length - 1, 1)}
        </span>
        <span
          ref={(el) => {
            chevronRef.current = el;
          }}
          className="shrink-0"
        >
          &rsaquo;
        </span>
      </div>

      {elided && (
        <>
          <button
            type="button"
            onClick={onExpandChain}
            title={`Show all ${chain.length} levels`}
            className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            +{chain.length - shown.length}
          </button>
          <span aria-hidden className="shrink-0 text-gray-300 dark:text-gray-600">
            &rsaquo;
          </span>
        </>
      )}

      {shown.map((ancestorIndex, i) => {
        const level = firstShownLevel + i;
        const author = thread.comments[ancestorIndex]?.author ?? "[deleted]";
        return (
          <Fragment key={ancestorIndex}>
            {i > 0 && (
              <span aria-hidden className="shrink-0 text-gray-300 dark:text-gray-600">
                &rsaquo;
              </span>
            )}
            <button
              type="button"
              onClick={() => onPick(ancestorIndex)}
              title={`Jump to ${author}'s comment`}
              className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${railTint(level)}`}
              />
              {author}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
