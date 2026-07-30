import { describe, it, expect } from "vitest";
import { framePolicy, FRAME_BLOCKED_HOSTS } from "./frame-policy";

describe("framePolicy", () => {
  it("allows sites verified as frameable", () => {
    expect(framePolicy("https://danluu.com/deconstruct-files/")).toBe("embed");
    expect(framePolicy("https://en.wikipedia.org/wiki/Ada")).toBe("embed");
    expect(framePolicy("https://simonwillison.net/2025/Jan/1/")).toBe("embed");
    expect(framePolicy("https://blog.cloudflare.com/post")).toBe("embed");
  });

  it("blocks known refusers", () => {
    expect(framePolicy("https://github.com/rust-lang/rust")).toBe("blocked");
    expect(framePolicy("https://arxiv.org/abs/2501.00001")).toBe("blocked");
    expect(framePolicy("https://www.nytimes.com/2025/01/01/x.html")).toBe("blocked");
  });

  it("blocks subdomains of a blocked host", () => {
    expect(framePolicy("https://gist.github.com/abc")).toBe("blocked");
    expect(framePolicy("https://someone.substack.com/p/hello")).toBe("blocked");
    expect(framePolicy("https://docs.google.com/document/d/1")).toBe("blocked");
  });

  it("does not match a host that merely ends with a blocked name", () => {
    expect(framePolicy("https://notgithub.com/x")).toBe("embed");
    expect(framePolicy("https://mygithub.com/x")).toBe("embed");
    expect(framePolicy("https://fake-x.com/x")).toBe("embed");
  });

  it("treats http as insecure rather than embeddable", () => {
    // Mixed content is blocked by the browser, and unlike an X-Frame-Options
    // refusal we can see this one coming.
    expect(framePolicy("http://example.com/a")).toBe("insecure");
    expect(framePolicy("http://github.com/a")).toBe("insecure");
  });

  it("reports nothing to show for missing or unparseable URLs", () => {
    expect(framePolicy(null)).toBe("none");
    expect(framePolicy(undefined)).toBe("none");
    expect(framePolicy("")).toBe("none");
    expect(framePolicy("not a url")).toBe("none");
  });

  it("keeps HN itself off the frame path so links stay in-app", () => {
    expect(framePolicy("https://news.ycombinator.com/item?id=1")).toBe("blocked");
  });

  it("has a blocklist of unique, bare hostnames", () => {
    expect(new Set(FRAME_BLOCKED_HOSTS).size).toBe(FRAME_BLOCKED_HOSTS.length);
    for (const host of FRAME_BLOCKED_HOSTS) {
      expect(host).toBe(host.toLowerCase());
      expect(host.startsWith("www.")).toBe(false);
      expect(host).not.toContain("/");
    }
  });
});
