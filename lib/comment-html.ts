/**
 * HN comment bodies arrive as HTML fragments in a dialect of its own. Measured
 * over 1,201 real nodes, the entire tag universe is p, a, i, pre and code, with
 * only href and rel attributes. This module normalizes that for rendering and
 * checks it before we hand anything to dangerouslySetInnerHTML.
 */

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

const TAG_NAME_RE = /<\/?\s*([a-zA-Z][a-zA-Z0-9-]*)/g;
const HREF_RE = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
const EVENT_ATTR_RE = /\son[a-z]+\s*=/i;
const DANGEROUS_RE = /javascript:|vbscript:|data:|srcdoc|<script|<style/i;

/**
 * Cheap allowlist check. True means the string is safe to render as-is, which is
 * the case for essentially every real comment. Anything that fails falls through
 * to the DOM-based sanitizer instead of being trusted.
 */
export function isSafeHnHtml(html: string): boolean {
  if (!html) return true;
  if (EVENT_ATTR_RE.test(html)) return false;
  if (DANGEROUS_RE.test(html)) return false;

  for (const m of html.matchAll(TAG_NAME_RE)) {
    if (!ALLOWED_TAGS.has(m[1].toLowerCase())) return false;
  }

  for (const m of html.matchAll(HREF_RE)) {
    const value = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (!/^https?:\/\//i.test(value) && !value.startsWith("#")) return false;
  }

  return true;
}

/**
 * Pure string transform applied to every comment body:
 *  - wrap the implicit first paragraph, which HN emits as a bare text node
 *  - tag quote paragraphs so CSS can style them, stripping the "&gt;" marker
 *  - point every link at a new tab
 *
 * Idempotent, so re-running it on already-normalized markup is harmless.
 */
export function normalizeHnHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  const withOpener = /^<p[\s>]/i.test(trimmed) ? trimmed : `<p>${trimmed}`;
  const quoted = withOpener.replace(/<p>\s*&gt;\s?/gi, '<p class="hn-quote">');
  return rewriteAnchors(quoted);
}

function rewriteAnchors(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_match, attrs: string) => {
    const cleaned = attrs.replace(
      /\s(?:target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
      ""
    );
    return `<a${cleaned} target="_blank" rel="noopener noreferrer nofollow">`;
  });
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
