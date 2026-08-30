import { describe, it, expect } from "vitest";
import { extractDomain, itemHref, parseHnItemUrl } from "./url";

describe("extractDomain", () => {
  it("strips www and returns the host", () => {
    expect(extractDomain("https://www.example.com/a/b?c=1")).toBe("example.com");
    expect(extractDomain("https://sub.example.co.uk/")).toBe("sub.example.co.uk");
  });

  it("returns null for null and unparseable input", () => {
    expect(extractDomain(null)).toBe(null);
    expect(extractDomain("not a url")).toBe(null);
  });
});

describe("itemHref", () => {
  it("builds a thread path, with a comment hash when asked", () => {
    expect(itemHref(123)).toBe("/item?id=123");
    expect(itemHref(123, 456)).toBe("/item?id=123#c456");
    expect(itemHref("123", null)).toBe("/item?id=123");
  });
});

describe("parseHnItemUrl", () => {
  it("reads a thread link", () => {
    expect(parseHnItemUrl("https://news.ycombinator.com/item?id=1")).toEqual({
      id: 1,
      commentId: null,
    });
  });

  it("accepts www and http", () => {
    expect(parseHnItemUrl("http://www.news.ycombinator.com/item?id=7")).toEqual({
      id: 7,
      commentId: null,
    });
  });

  it("reads a fragment as the comment inside the item", () => {
    expect(parseHnItemUrl("https://news.ycombinator.com/item?id=100#101")).toEqual(
      { id: 100, commentId: 101 }
    );
  });

  it("finds the id among other query params", () => {
    expect(parseHnItemUrl("https://news.ycombinator.com/item?p=2&id=42")).toEqual(
      { id: 42, commentId: null }
    );
  });

  it("rejects HN pages Amber has no route for", () => {
    expect(parseHnItemUrl("https://news.ycombinator.com/user?id=pg")).toBe(null);
    expect(parseHnItemUrl("https://news.ycombinator.com/newest")).toBe(null);
    expect(parseHnItemUrl("https://news.ycombinator.com/threads?id=pg")).toBe(null);
    expect(parseHnItemUrl("https://news.ycombinator.com/from?site=x.test")).toBe(
      null
    );
  });

  it("rejects other hosts, including lookalikes", () => {
    expect(parseHnItemUrl("https://example.com/item?id=1")).toBe(null);
    expect(parseHnItemUrl("https://hn.algolia.com/item?id=1")).toBe(null);
    expect(parseHnItemUrl("https://news.ycombinator.com.evil.test/item?id=1")).toBe(
      null
    );
  });

  it("rejects a missing or non-numeric id", () => {
    expect(parseHnItemUrl("https://news.ycombinator.com/item")).toBe(null);
    expect(parseHnItemUrl("https://news.ycombinator.com/item?id=abc")).toBe(null);
    expect(parseHnItemUrl("https://news.ycombinator.com/item?id=1x")).toBe(null);
  });

  it("ignores a non-numeric fragment rather than rejecting the link", () => {
    expect(
      parseHnItemUrl("https://news.ycombinator.com/item?id=9#comments")
    ).toEqual({ id: 9, commentId: null });
  });

  it("returns null for anything that isn't an absolute URL", () => {
    expect(parseHnItemUrl("")).toBe(null);
    expect(parseHnItemUrl("not a url")).toBe(null);
    // Amber's own badge href, which must never earn a badge of its own.
    expect(parseHnItemUrl("/item?id=123")).toBe(null);
  });
});
