export type FramePolicy = "embed" | "blocked" | "insecure" | "none";

/**
 * Sites that refuse to be framed, via X-Frame-Options or a restrictive
 * frame-ancestors. Every entry here was confirmed by reading response headers,
 * except linkedin.com which busts frames from JavaScript instead.
 *
 * This list exists because a blocked frame is undetectable from JavaScript: the
 * browser fires `load` either way and cross-origin access tells us nothing. So we
 * skip the attempt for the sites we know about, and fall back to a visible hint
 * for the ones we don't. It will drift as sites change their headers - see the
 * "iframe embed blocklist needs periodic review" card.
 *
 * Matching is by exact host or subdomain, so "github.com" also covers
 * "gist.github.com".
 */
export const FRAME_BLOCKED_HOSTS: readonly string[] = [
  // Code hosting
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "npmjs.com",
  "pypi.org",
  // Papers and journals
  "arxiv.org",
  "biorxiv.org",
  "science.org",
  "sciencedirect.com",
  "springer.com",
  "nature.com",
  "researchgate.net",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "acm.org",
  "ieee.org",
  // Q&A
  "stackoverflow.com",
  "stackexchange.com",
  "superuser.com",
  "serverfault.com",
  "askubuntu.com",
  // Social
  "reddit.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "youtu.be",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  // Publishing platforms
  "medium.com",
  "substack.com",
  "dev.to",
  "hackernoon.com",
  // News and magazines
  "nytimes.com",
  "bloomberg.com",
  "ft.com",
  "economist.com",
  "theguardian.com",
  "bbc.com",
  "bbc.co.uk",
  "apnews.com",
  "reuters.com",
  "arstechnica.com",
  "theverge.com",
  "techcrunch.com",
  "zdnet.com",
  "engadget.com",
  "vice.com",
  "quantamagazine.org",
  "lwn.net",
  "phoronix.com",
  "infoq.com",
  "digitalfoundry.net",
  // Tech companies
  "huggingface.co",
  "openai.com",
  "anthropic.com",
  "google.com",
  // Handled in-app rather than framed
  "news.ycombinator.com",
];

const BLOCKED = new Set(FRAME_BLOCKED_HOSTS);

/**
 * Whether we should even try to embed this URL.
 *
 *  - "none"     no link to show (a text post, or a URL we can't parse)
 *  - "insecure" http:// inside our https page; the browser blocks mixed content
 *  - "blocked"  a known refuser, so skip the attempt and show the fallback now
 *  - "embed"    worth trying
 */
export function framePolicy(url: string | null | undefined): FramePolicy {
  if (!url) return "none";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "none";
  }

  if (parsed.protocol !== "https:") return "insecure";

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (BLOCKED.has(host)) return "blocked";
  for (const blocked of BLOCKED) {
    if (host.endsWith(`.${blocked}`)) return "blocked";
  }

  return "embed";
}
