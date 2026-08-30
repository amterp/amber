import { describe, it, expect } from "vitest";
import { isSafeHnHtml, normalizeHnHtml, renderHnHtml } from "./comment-html";

describe("isSafeHnHtml", () => {
  it("accepts every tag HN actually emits", () => {
    expect(
      isSafeHnHtml(
        'Sure.<p><i>maybe</i> see <a href="https://example.com" rel="nofollow">this</a>' +
          "<p><pre><code>  npm install\n</code></pre>"
      )
    ).toBe(true);
    expect(isSafeHnHtml("")).toBe(true);
    expect(isSafeHnHtml("plain text with &gt; and &#x27;")).toBe(true);
  });

  it("rejects event handlers", () => {
    expect(isSafeHnHtml('<img src=x onerror="alert(1)">')).toBe(false);
    expect(isSafeHnHtml('<p ONLOAD="x">hi')).toBe(false);
  });

  it("rejects tags outside the allowlist", () => {
    expect(isSafeHnHtml("<iframe src=https://evil.test></iframe>")).toBe(false);
    expect(isSafeHnHtml("<img src=https://x.test/a.png>")).toBe(false);
    expect(isSafeHnHtml("<div>hi</div>")).toBe(false);
  });

  it("rejects script, style and dangerous schemes", () => {
    expect(isSafeHnHtml("<script>alert(1)</script>")).toBe(false);
    expect(isSafeHnHtml("<style>body{}</style>")).toBe(false);
    expect(isSafeHnHtml('<a href="javascript:alert(1)">x</a>')).toBe(false);
    expect(isSafeHnHtml('<a href="data:text/html,<b>">x</a>')).toBe(false);
  });

  it("accepts the escaped hrefs HN actually writes", () => {
    // HN escapes even the slashes. Judging the raw value sent every comment
    // carrying a link down the slow path.
    expect(
      isSafeHnHtml(
        '<a href="https:&#x2F;&#x2F;news.ycombinator.com&#x2F;item?id=1">x</a>'
      )
    ).toBe(true);
    expect(isSafeHnHtml('<a href="https:&#x2F;&#x2F;x.test&#x2F;a?b=1&amp;c=2">x</a>')).toBe(
      true
    );
  });

  it("rejects hrefs that are not http(s), including entity-encoded schemes", () => {
    expect(isSafeHnHtml('<a href="ftp://x.test/f">x</a>')).toBe(false);
    expect(isSafeHnHtml('<a href="&#106;avascript:alert(1)">x</a>')).toBe(false);
    expect(isSafeHnHtml('<a href="#c123">x</a>')).toBe(true);
  });
});

describe("normalizeHnHtml", () => {
  it("wraps the bare first paragraph HN leaves unwrapped", () => {
    expect(normalizeHnHtml("First para.<p>Second para.")).toBe(
      "<p>First para.<p>Second para."
    );
  });

  it("does not double-wrap markup that already opens with a paragraph", () => {
    expect(normalizeHnHtml("<p>Already wrapped.")).toBe("<p>Already wrapped.");
  });

  it("leaves the empty paragraph that HN's <p><pre> pairing creates", () => {
    // The parser auto-closes <p> before <pre>, so an empty <p> is unavoidable.
    // CSS hides it via .hn-text p:empty rather than string surgery here.
    const out = normalizeHnHtml("Try:<p><pre><code>ls\n</code></pre>after");
    expect(out).toBe("<p>Try:<p><pre><code>ls\n</code></pre>after");
  });

  it("marks quote paragraphs and strips the marker", () => {
    expect(normalizeHnHtml("<p>&gt; quoted line<p>my reply")).toBe(
      '<p class="hn-quote">quoted line<p>my reply'
    );
  });

  it("marks each line of a multi-line quote", () => {
    const out = normalizeHnHtml("<p>&gt; line one<p>&gt; line two<p>reply");
    expect(out).toBe(
      '<p class="hn-quote">line one<p class="hn-quote">line two<p>reply'
    );
  });

  it("does not treat a mid-paragraph &gt; as a quote", () => {
    expect(normalizeHnHtml("<p>5 &gt; 3 is true")).toBe("<p>5 &gt; 3 is true");
  });

  it("points anchors at a new tab, replacing HN's own rel", () => {
    expect(
      normalizeHnHtml('<p>see <a href="https://example.com" rel="nofollow">this</a>')
    ).toBe(
      '<p>see <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">this</a>'
    );
  });

  it("is idempotent", () => {
    const input = '<p>&gt; quoted<p>see <a href="https://x.test" rel="nofollow">x</a>';
    const once = normalizeHnHtml(input);
    expect(normalizeHnHtml(once)).toBe(once);
  });

  it("returns empty string for blank input", () => {
    expect(normalizeHnHtml("   ")).toBe("");
  });
});

describe("renderHnHtml", () => {
  it("returns empty string for null and empty bodies", () => {
    expect(renderHnHtml(null)).toBe("");
    expect(renderHnHtml("")).toBe("");
  });

  it("normalizes safe markup on the fast path", () => {
    expect(renderHnHtml("Hello.<p>World.")).toBe("<p>Hello.<p>World.");
  });

  it("escapes unsafe markup when no DOM is available", () => {
    // Node environment: sanitizeHnHtml has no DOMParser, so it must fall back to
    // escaping rather than passing the payload through.
    const out = renderHnHtml('<img src=x onerror="alert(1)">bad');
    expect(out).not.toContain("<img");
    expect(out).not.toContain("onerror=\"");
    expect(out).toContain("&lt;img");
  });
});

describe("Amber badges", () => {
  const HN_LINK =
    '<p>previous discussion: <a href="https:&#x2F;&#x2F;news.ycombinator.com&#x2F;item?id=9456810" rel="nofollow">https:&#x2F;&#x2F;news.ycombinator.com&#x2F;item?id=9456810</a>';

  it("appends a badge after a link to another HN item", () => {
    const out = normalizeHnHtml(HN_LINK);
    expect(out).toContain(
      '</a> <a class="hn-item-badge" href="/item?id=9456810" data-amber-item="9456810" title="Open in Amber" aria-label="Open in Amber">Amber</a>'
    );
  });

  it("leaves the commenter's own link untouched", () => {
    const out = normalizeHnHtml(HN_LINK);
    expect(out).toContain(
      '<a href="https:&#x2F;&#x2F;news.ycombinator.com&#x2F;item?id=9456810" target="_blank" rel="noopener noreferrer nofollow">'
    );
  });

  it("badges an escaped link, and reads &amp; in the right order", () => {
    // Decoding &amp; before the numeric escapes would leave a slash in the
    // query string and lose the id.
    const out = normalizeHnHtml(
      '<p><a href="https:&#x2F;&#x2F;news.ycombinator.com&#x2F;item?id=5&amp;p=2">x</a>'
    );
    expect(out).toContain('data-amber-item="5"');
  });

  it("survives an out-of-range numeric escape in an href", () => {
    expect(() =>
      normalizeHnHtml('<p><a href="https://x.test/&#x110000;">x</a>')
    ).not.toThrow();
  });

  it("carries a comment fragment through to the thread hash", () => {
    const out = normalizeHnHtml(
      '<p><a href="https://news.ycombinator.com/item?id=100#101">x</a>'
    );
    expect(out).toContain('href="/item?id=100#c101"');
    expect(out).toContain('data-amber-comment="101"');
  });

  it("badges a link whose text is prose rather than the URL", () => {
    const out = normalizeHnHtml(
      '<p>see <a href="https://news.ycombinator.com/item?id=5">my post</a> for more'
    );
    expect(out).toContain(">my post</a> <a class=\"hn-item-badge\"");
  });

  it("badges each of several links in one comment", () => {
    const out = normalizeHnHtml(
      '<p><a href="https://news.ycombinator.com/item?id=1">a</a>' +
        '<p><a href="https://news.ycombinator.com/item?id=2">b</a>'
    );
    expect(out.match(/hn-item-badge/g)).toHaveLength(2);
  });

  it("leaves alone links Amber has no page for", () => {
    const out = normalizeHnHtml(
      '<p><a href="https://example.com/x">a</a>' +
        '<p><a href="https://news.ycombinator.com/user?id=pg">pg</a>'
    );
    expect(out).not.toContain("hn-item-badge");
  });

  it("does not badge an anchor HN left unclosed, but still opens it in a new tab", () => {
    const out = normalizeHnHtml(
      '<p><a href="https://news.ycombinator.com/item?id=3">dangling'
    );
    expect(out).not.toContain("hn-item-badge");
    expect(out).toContain('target="_blank"');
  });

  it("stays idempotent: no second badge, and the badge keeps this tab", () => {
    const once = normalizeHnHtml(HN_LINK);
    expect(normalizeHnHtml(once)).toBe(once);
    expect(once.match(/hn-item-badge/g)).toHaveLength(1);
    expect(once).not.toContain('class="hn-item-badge" href="/item?id=9456810" target');
  });
});
