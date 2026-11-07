"use client";

import { framePolicy } from "@/lib/frame-policy";

interface Props {
  url: string | null;
  title: string;
  domain: string | null;
  onShowComments: () => void;
}

/**
 * Shows the linked article inline, on touch devices only.
 *
 * Roughly 40% of HN links refuse to be framed and we cannot detect that from
 * JavaScript - the browser fires `load` either way, so a refused frame is just
 * a blank page. Hence two layers: skip the attempt for hosts we know refuse,
 * and keep a link to the original on screen whenever we do frame.
 */
export default function ArticlePane({ url, title, domain, onShowComments }: Props) {
  const policy = framePolicy(url);

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
        className="h-full w-full border-0 bg-white"
        // allow-same-origin is safe here because the framed document is
        // cross-origin, so the sandbox origin is the site's own. Omitting
        // allow-top-navigation also blocks frame-busting redirects.
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer-when-downgrade"
      />

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 left-4 rounded-full bg-gray-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm dark:bg-gray-100/90 dark:text-gray-900"
      >
        Open original <span aria-hidden>&#8599;</span>
      </a>
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
