import { Fragment } from "react";
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

/** Chips shown before the chain gets elided. */
const MAX_CHIPS = 4;

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
  const chain = current?.ancestorIndices ?? [];

  if (chain.length === 0) return null;

  const elided = !expandedChain && chain.length > MAX_CHIPS;
  const shown = elided ? chain.slice(chain.length - MAX_CHIPS) : chain;
  const firstShownLevel = chain.length - shown.length;

  return (
    <div className="sticky top-[100px] z-30 -mx-4 flex items-center gap-1 overflow-x-auto border-b border-gray-200 bg-white/95 px-4 py-1.5 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95">
      <span className="sr-only">Replying within:</span>

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
              title={`Collapse ${author}'s thread`}
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
