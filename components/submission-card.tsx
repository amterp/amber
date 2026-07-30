import Link from "next/link";
import { Submission } from "@/lib/types";
import { formatTimeAgo } from "@/lib/time";

interface Props {
  submission: Submission;
  rank: number;
}

const TITLE_CLASS =
  "text-[15px] font-medium text-gray-900 hover:text-orange-600 transition-colors leading-snug dark:text-gray-100 dark:hover:text-orange-400";

export default function SubmissionCard({ submission, rank }: Props) {
  const { id, title, url, domain, author, points, commentCount, createdAtTimestamp } =
    submission;

  const threadHref = `/item?id=${id}`;

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-b-0 dark:border-gray-800">
      <span className="mt-0.5 w-8 shrink-0 text-right text-sm text-gray-400 font-mono dark:text-gray-500">
        {rank}.
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {/*
            Two anchors swapped by CSS alone: no JavaScript, no hydration
            mismatch, and middle-click still does the right thing at each size.

            With a mouse, a title opens the real article in a new browser tab,
            which beats any iframe. On touch it opens Amber's own view, where the
            article and the discussion are one tap apart instead of two tabs
            apart.

            The shown-by-default case is the external link, so a device
            reporting no pointer at all behaves like desktop instead of showing
            both anchors.

            This relies on `display: none` pulling the hidden anchor out of the
            accessibility tree, so screen readers announce exactly one title.
            Switching to visibility or opacity would silently announce both.
          */}
          {url ? (
            <>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`pointer-coarse:hidden ${TITLE_CLASS}`}
              >
                {title}
              </a>
              <Link
                href={`${threadHref}&view=article`}
                className={`hidden pointer-coarse:inline ${TITLE_CLASS}`}
              >
                {title}
              </Link>
            </>
          ) : (
            <Link href={threadHref} className={TITLE_CLASS}>
              {title}
            </Link>
          )}

          {domain && url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Open ${domain} in a new tab`}
              className="text-xs text-gray-400 whitespace-nowrap transition-colors hover:text-orange-600 dark:text-gray-500 dark:hover:text-orange-400"
            >
              ({domain})
            </a>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500 sm:gap-x-2 dark:text-gray-400">
          <span className="font-medium text-orange-600 dark:text-orange-400">
            {points} pts
          </span>
          <span>by {author}</span>
          <span>{formatTimeAgo(createdAtTimestamp)}</span>
          <Link
            href={threadHref}
            className="hover:text-orange-600 transition-colors dark:hover:text-orange-400"
          >
            {commentCount} comments
          </Link>
        </div>
      </div>
    </div>
  );
}
