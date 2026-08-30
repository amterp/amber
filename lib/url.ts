/**
 * Where Amber's own URLs are built and HN's are read. Threads live at
 * /item?id=N rather than /item/N because static export can't prerender a route
 * per HN id, so the id is always a query param.
 */

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const HN_HOST = "news.ycombinator.com";

export function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * A thread URL, without basePath. Next's router and <Link> prepend that
 * themselves; a raw href in an HTML string does not, and has to add it.
 */
export function itemHref(
  id: number | string,
  commentId?: number | null
): string {
  const base = `/item?id=${id}`;
  return commentId ? `${base}#c${commentId}` : base;
}

export interface HnItemLink {
  id: number;
  /** From HN's item?id=100#101 form, which points at a comment inside the item. */
  commentId: number | null;
}

/**
 * Reads a link to an HN item, or null for anything Amber has no page for -
 * user profiles, /newest, /from, and every other host. Deliberately strict:
 * a badge that lands somewhere useless is worse than no badge.
 *
 * Expects a decoded URL. Hrefs lifted out of comment markup arrive escaped;
 * lib/comment-html.ts decodes them, since that is where HN's dialect lives.
 */
export function parseHnItemUrl(href: string): HnItemLink | null {
  let url: URL;
  try {
    url = new URL(href.trim());
  } catch {
    return null;
  }

  if (url.hostname.replace(/^www\./, "") !== HN_HOST) return null;
  if (url.pathname !== "/item") return null;

  const id = parseId(url.searchParams.get("id"));
  if (id === null) return null;

  return { id, commentId: parseId(url.hash.slice(1)) };
}

function parseId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  return Number(value);
}
