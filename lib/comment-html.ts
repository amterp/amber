/**
 * HN comment bodies arrive as HTML fragments in a dialect of its own. Measured
 * over 1,201 real nodes, the entire tag universe is p, a, i, pre and code, with
 * only href and rel attributes. This module normalizes that for rendering and
 * checks it before we hand anything to dangerouslySetInnerHTML.
 */

import { basePath, HnItemLink, itemHref, parseHnItemUrl } from "./url";

const ALLOWED_TAGS = new Set([
  "p",
  "i",
  "a",
  "pre",
  "code",
  "b",
  "em",
  "strong",
  "u",
  "br",
]);

const BADGE_CLASS = "hn-item-badge";

const TAG_NAME_RE = /<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/g;
const HREF_ATTR_RE = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const HREF_RE = new RegExp(HREF_ATTR_RE.source, "gi");
const EVENT_ATTR_RE = /\son[a-z]+\s*=/i;
const DANGEROUS_RE = /javascript:|vbscript:|data:|srcdoc|<script|<style/i;

/**
 * Cheap allowlist check. True means the string is safe to render as-is, which is
 * the case for essentially every real comment. Anything that fails falls through
 * to the DOM-based sanitizer instead of being trusted.
 *
 * Hrefs are decoded before their scheme is judged. Without that every comment
 * carrying a link failed here, because HN writes "https:&#x2F;&#x2F;", and the
 * whole body took the slow path. Decoding also tightens the check rather than
 * loosening it: an entity-encoded "javascript:" is now read for what it is.
 */
export function isSafeHnHtml(html: string): boolean {
  if (!html) return true;
  if (EVENT_ATTR_RE.test(html)) return false;
  if (DANGEROUS_RE.test(html)) return false;

  for (const m of html.matchAll(TAG_NAME_RE)) {
    if (!ALLOWED_TAGS.has(m[1].toLowerCase())) return false;
  }

  for (const m of html.matchAll(HREF_RE)) {
    const value = decodeEntities((m[1] ?? m[2] ?? m[3] ?? "").trim());
    if (!/^https?:\/\//i.test(value) && !value.startsWith("#")) return false;
  }

  return true;
}

/**
 * Pure string transform applied to every comment body:
 *  - wrap the implicit first paragraph, which HN emits as a bare text node
 *  - tag quote paragraphs so CSS can style them, stripping the "&gt;" marker
 *  - point every link at a new tab
 *  - offer an in-app badge beside links to other HN items
 *
 * Idempotent, so re-running it on already-normalized markup is harmless.
 */
export function normalizeHnHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const withOpener = /^<p[\s>]/i.test(trimmed) ? trimmed : `<p>${trimmed}`;
  const quoted = withOpener.replace(/<p>\s*&gt;\s?/gi, '<p class="hn-quote">');
  return appendItemBadges(rewriteAnchors(quoted));
}

function rewriteAnchors(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (match, attrs: string) => {
    // Our own badge is not HN's markup, and it opens in this tab.
    if (attrs.includes(BADGE_CLASS)) return match;

    const cleaned = attrs.replace(
      /\s(?:target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      ""
    );
    return `<a${cleaned} target="_blank" rel="noopener noreferrer nofollow">`;
  });
}

/**
 * An anchor and its content, skipped once a badge already follows it. The
 * content may not cross an anchor tag: a pattern that could would backtrack
 * past the first </a> to the badge's own, clear the lookahead there, and append
 * a second badge.
 */
const ITEM_ANCHOR_RE = new RegExp(
  `<a\\b([^>]*)>(?:(?!</?a\\b)[\\s\\S])*</a>(?! <a class="${BADGE_CLASS}")`,
  "gi"
);

/**
 * Offers a badge beside every link to an item Amber can open, leaving the link
 * the commenter wrote exactly as they wrote it. Separate from rewriteAnchors
 * because placing the badge needs the closing tag, while that one matches
 * opening tags and so still reaches an anchor HN left unclosed - which here
 * simply goes unbadged.
 */
function appendItemBadges(html: string): string {
  return html.replace(ITEM_ANCHOR_RE, (match, attrs: string) => {
    const m = HREF_ATTR_RE.exec(attrs);
    const href = decodeEntities((m?.[1] ?? m?.[2] ?? m?.[3] ?? "").trim());
    const link = href ? parseHnItemUrl(href) : null;
    return link ? `${match} ${itemBadge(link)}` : match;
  });
}

/**
 * Both ids came through a digits-only check in parseHnItemUrl, so they need no
 * escaping here. The href carries basePath for a middle-click or a JS-less
 * load; the data attributes are what the click handler hands to the router,
 * which prepends basePath itself.
 */
function itemBadge({ id, commentId }: HnItemLink): string {
  const comment = commentId ? ` data-amber-comment="${commentId}"` : "";
  return (
    `<a class="${BADGE_CLASS}" href="${basePath}${itemHref(id, commentId)}"` +
    ` data-amber-item="${id}"${comment}` +
    ` title="Open in Amber" aria-label="Open in Amber">Amber</a>`
  );
}

/**
 * Slow path for markup that failed the allowlist. Unwraps disallowed elements
 * rather than deleting them, so the reader still sees the text. Browser-only:
 * during prerender there is no DOMParser, so the content is escaped instead.
 */
export function sanitizeHnHtml(html: string): string {
  if (typeof DOMParser === "undefined") return escapeHtml(html);

  const doc = new DOMParser().parseFromString(html, "text/html");
  scrubElement(doc.body);
  return doc.body.innerHTML;
}

function scrubElement(el: Element): void {
  for (const child of Array.from(el.children)) {
    scrubElement(child);

    if (!ALLOWED_TAGS.has(child.tagName.toLowerCase())) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }

    const href = child.getAttribute("href");
    for (const attr of Array.from(child.attributes)) {
      child.removeAttribute(attr.name);
    }
    if (
      child.tagName.toLowerCase() === "a" &&
      href &&
      /^https?:\/\//i.test(href.trim())
    ) {
      child.setAttribute("href", href.trim());
    }
  }
}

/**
 * HN escapes href attributes heavily - even the slashes come through as &#x2F;
 * - so nothing that reasons about a URL can look at the raw attribute value.
 * &amp; is decoded last: doing it first leaves a &#x2F; for the numeric pass to
 * turn into a slash that was never in the link.
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+);/gi, (match, body: string) => {
      const b = body.toLowerCase();
      const code = b.startsWith("#x")
        ? parseInt(b.slice(2), 16)
        : parseInt(b.slice(1), 10);
      // Out-of-range escapes would make fromCodePoint throw; leave them as they
      // are and let the caller reject the result.
      return code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    })
    .replace(/&amp;/gi, "&");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderHnHtml(html: string | null): string {
  if (!html) return "";
  const safe = isSafeHnHtml(html) ? html : sanitizeHnHtml(html);
  return normalizeHnHtml(safe);
}
