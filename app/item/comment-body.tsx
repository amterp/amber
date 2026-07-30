import { useMemo } from "react";
import { renderHnHtml } from "@/lib/comment-html";

/**
 * Only the string transform is memoized. The browser's own parse of the markup
 * happens on mount either way, so caching the output across collapse/expand
 * would buy nothing.
 */
export default function CommentBody({ html }: { html: string | null }) {
  const rendered = useMemo(() => renderHnHtml(html), [html]);
  if (!rendered) return null;

  return (
    <div
      className="hn-text mt-1 text-gray-800 dark:text-gray-200"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}
