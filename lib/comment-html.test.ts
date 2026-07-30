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
