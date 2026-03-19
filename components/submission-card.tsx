import { Submission } from "@/lib/types";
import { formatTimeAgo } from "@/lib/time";

interface Props {
  submission: Submission;
  rank: number;
}

const HN_ITEM_URL = "https://news.ycombinator.com/item?id=";

export default function SubmissionCard({ submission, rank }: Props) {
  const { id, title, url, domain, author, points, commentCount, createdAtTimestamp } = submission;

  return (
    <div className="flex gap-3 py-3 border-b border-gray-100 last:border-b-0">
      <span className="mt-0.5 w-8 shrink-0 text-right text-sm text-gray-400 font-mono">
        {rank}.
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-medium text-gray-900 hover:text-orange-600 transition-colors leading-snug"
            >
              {title}
            </a>
          ) : (
            <a
              href={`${HN_ITEM_URL}${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[15px] font-medium text-gray-900 hover:text-orange-600 transition-colors leading-snug"
            >
              {title}
            </a>
          )}
          {domain && (
            <span className="text-xs text-gray-400 whitespace-nowrap">({domain})</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
          <span className="font-medium text-orange-600">{points} pts</span>
          <span>by {author}</span>
          <span>{formatTimeAgo(createdAtTimestamp)}</span>
          <a
            href={`${HN_ITEM_URL}${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-orange-600 transition-colors"
          >
            {commentCount} comments
          </a>
        </div>
      </div>
    </div>
  );
}
