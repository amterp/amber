import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

/**
 * True on touch devices, false where there's a mouse.
 *
 * This is the one place Amber reads a media query from JavaScript instead of
 * CSS, and it's deliberate: the article pane's iframe must not *mount* on a
 * desktop, and `display: none` doesn't stop an iframe from loading. Link
 * destinations stay pure CSS (see components/submission-card.tsx).
 *
 * Keyed to pointer type rather than width so rotating a phone doesn't change
 * where links go.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Assume a mouse during prerender; the client corrects on its first render. */
function getServerSnapshot(): boolean {
  return false;
}
