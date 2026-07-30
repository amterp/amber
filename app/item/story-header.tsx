"use client";

import { formatTimeAgo } from "@/lib/time";
import { StoryHeader } from "@/lib/types";

export type ItemViewMode = "comments" | "article";

interface Props {
  story: StoryHeader | null;
  /** Touch devices get the in-app article tab; mouse users get a real new tab. */
  coarse: boolean;
  view: ItemViewMode;
  onViewChange: (view: ItemViewMode) => void;
  onBack: () => void;
}

const PILL = "rounded-full px-3 py-1 text-sm font-medium transition-colors";

export default function StoryHeaderBar({
  story,
  coarse,
  view,
  onViewChange,
  onBack,
}: Props) {
  const hasArticle = Boolean(story?.url);

  return (
    <header className="sticky top-12 z-40 h-[52px] border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95">
      <div className="mx-auto flex h-full max-w-5xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        >
          <span aria-hidden>&larr;</span>
        </button>

        <div className="min-w-0 flex-1">
          {story ? (
            <>
              <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                {story.title}
              </div>
              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {story.points} pts
                </span>
                {story.author && <> by {story.author}</>}
                {story.createdAtTimestamp > 0 && (
                  <> &middot; {formatTimeAgo(story.createdAtTimestamp)}</>
                )}
                <> &middot; {story.commentCount} comments</>
              </div>
            </>
          ) : (
            <div className="animate-pulse">
              <div className="h-3.5 w-64 max-w-full rounded bg-gray-200 dark:bg-gray-800" />
              <div className="mt-2 h-3 w-40 rounded bg-gray-100 dark:bg-gray-800/60" />
            </div>
          )}
        </div>

        {hasArticle && !coarse && (
          <a
            href={story!.url!}
            target="_blank"
            rel="noopener noreferrer"
            title="Open the article in a new tab (o)"
            className="shrink-0 rounded-full bg-orange-500 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            Article <span aria-hidden>&#8599;</span>
          </a>
        )}

        {hasArticle && coarse && (
          <div
            role="tablist"
            aria-label="View"
            className="flex shrink-0 rounded-full bg-gray-100 p-0.5 dark:bg-gray-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "article"}
              onClick={() => onViewChange("article")}
              className={`${PILL} ${
                view === "article"
                  ? "bg-orange-500 text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Article
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "comments"}
              onClick={() => onViewChange("comments")}
              className={`${PILL} ${
                view === "comments"
                  ? "bg-orange-500 text-white"
                  : "text-gray-600 dark:text-gray-300"
              }`}
            >
              Comments
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
