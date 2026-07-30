"use client";

import { useEffect, useState } from "react";
import { framePolicy } from "@/lib/frame-policy";

interface Props {
  url: string | null;
  title: string;
  domain: string | null;
  onShowComments: () => void;
}

/** How long to wait before admitting the page probably isn't coming. */
const HINT_DELAY_MS = 4000;

/**
 * Shows the linked article inline, on touch devices only.
 *
 * Roughly 40% of HN links refuse to be framed and we cannot detect that from
 * JavaScript - the browser fires `load` either way. So failure is handled in
 * three layers: skip the attempt for hosts we know refuse, always offer the
 * original, and surface a hint if nothing has loaded after a few seconds.
 */
export default function ArticlePane({ url, title, domain, onShowComments }: Props) {
  const policy = framePolicy(url);

  // Tracked by URL rather than as booleans, so switching stories resets both
  // without an effect that resets state on every change.
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);
  const [hintUrl, setHintUrl] = useState<string | null>(null);
  const loaded = loadedUrl !== null && loadedUrl === url;
  const showHint = hintUrl !== null && hintUrl === url;

  useEffect(() => {
    if (policy !== "embed" || loaded) return;
    const timer = setTimeout(() => setHintUrl(url), HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [policy, loaded, url]);

  // top-[100px] clears the nav and item header. Anchoring to bottom-0 rather
  // than using a height sidesteps iOS's shifting viewport entirely.
  const shell = "fixed inset-x-0 bottom-0 top-[100px] z-10 bg-white dark:bg-gray-900";

  if (policy !== "embed" || !url) {
    return (
      <div className={shell}>
        <Fallback policy={policy} url={url} domain={domain} onShowComments={onShowComments} />
      </div>
    );
  }

  return (
    <div className={shell}>
      <iframe
        src={url}
        title={title}
        onLoad={() => setLoadedUrl(url)}
        className="h-full w-full border-0 bg-white"
        // allow-same-origin is safe here because the framed document is
        // cross-origin, so the sandbox origin is the site's own. Omitting
        // allow-top-navigation also blocks frame-busting redirects.
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {showHint && (
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-gray-200 bg-white/95 px-4 py-2 text-xs text-gray-500 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-400">
          <span className="min-w-0 flex-1">Not loading? Some sites block embedding.</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 font-medium text-orange-600 hover:underline dark:text-orange-400"
          >
            Open original <span aria-hidden>&#8599;</span>
          </a>
        </div>
      )}
    </div>
  );
}

function Fallback({
  policy,
  url,
  domain,
  onShowComments,
}: {
  policy: ReturnType<typeof framePolicy>;
  url: string | null;
  domain: string | null;
  onShowComments: () => void;
}) {
  const label = domain ?? "This site";
  const message =
    policy === "insecure"
      ? `${label} is served over http, so it can't be shown here securely.`
      : policy === "none"
        ? "This is a text post, so there's no article to show."
        : `${label} doesn't allow embedding.`;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-full bg-orange-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
        >
          Open {label} <span aria-hidden>&#8599;</span>
        </a>
      )}

      <button
        type="button"
        onClick={onShowComments}
        className="mt-3 block w-full text-sm text-orange-600 hover:underline dark:text-orange-400"
      >
        Read comments instead
      </button>
    </div>
  );
}
