import { trapezoidProgress } from "@/lib/scroll-profile";

/**
 * Movement cues for the thread view. Collapsing a subtree or jumping to a
 * sibling rearranges the page underneath you; animating the change is what
 * makes it followable rather than a teleport.
 *
 * Skipped entirely when the reader has asked for reduced motion.
 */

export const SHIFT_MS = 200;

/** Decelerating curve: fast off the mark, gentle on arrival. */
const EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * scrollToComment's speed while cruising, and how long it takes to spin up
 * to (or down from) that speed. A rail or ancestor chip can now skip a
 * branch of any size, so a fixed animation duration no longer makes sense -
 * past a few viewports it either compresses into an unreadable strobe or,
 * with the old distance cutoff, teleports outright. Scaling the *time*
 * instead of squeezing distance into a fixed time (see trapezoidProgress in
 * lib/scroll-profile.ts) keeps speed bounded and legible no matter how far
 * the jump is - a cross-thread skip just takes proportionally longer, which
 * given how rarely anyone will drag that far (Deutsche Bank-thread-sized
 * threads are the exception, not the rule) is a better trade than either of
 * the alternatives above.
 */
const CRUISE_PX_PER_MS = 10;
/**
 * Time to spin up to (or down from) cruising speed. Doubling cruise speed
 * alone doesn't uniformly double how fast a trip *feels* - the ramp is
 * accelerating at the same rate either way, so its own duration wouldn't
 * budge and short jumps barely speed up at all. Halving it alongside the
 * cruise speed keeps accel scaling right along with velocity, so every trip
 * - ramp-only short hops included - takes exactly half as long, not just
 * the cruise-dominated long ones.
 */
const RAMP_MS = 75;

let activeFrame: number | null = null;
let settleTimer: ReturnType<typeof setTimeout> | null = null;

function cancelActiveScroll() {
  if (activeFrame !== null) cancelAnimationFrame(activeFrame);
  if (settleTimer !== null) clearTimeout(settleTimer);
  activeFrame = null;
  settleTimer = null;
}

/**
 * Scroll a comment to just below the sticky headers.
 *
 * The target is recomputed every frame rather than measured once: rows above it
 * carry `content-visibility` size estimates that resolve to real heights as they
 * come into range, which drifts a fixed target out from under us mid-flight.
 */
export function scrollToComment(id: number): void {
  const targetY = (): number | null => {
    const el = document.getElementById(`c${id}`);
    if (!el) return null;
    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return Math.max(0, window.scrollY + el.getBoundingClientRect().top - margin);
  };

  const destination = targetY();
  if (destination === null) return;

  cancelActiveScroll();

  const startY = window.scrollY;
  const settle = () => {
    settleTimer = setTimeout(() => {
      const finalY = targetY();
      if (finalY !== null && Math.abs(window.scrollY - finalY) > 2) {
        window.scrollTo(0, finalY);
      }
    }, 100);
  };

  if (prefersReducedMotion()) {
    window.scrollTo(0, destination);
    settle();
    return;
  }

  // A manual scroll means the reader has taken over; stop fighting them.
  const abort = () => cancelActiveScroll();
  window.addEventListener("wheel", abort, { passive: true, once: true });
  window.addEventListener("touchstart", abort, { passive: true, once: true });

  const { totalMs, at } = trapezoidProgress(
    Math.abs(destination - startY),
    CRUISE_PX_PER_MS,
    RAMP_MS
  );
  const started = performance.now();
  const step = (now: number) => {
    const to = targetY();
    if (to === null) return cancelActiveScroll();

    const elapsed = now - started;
    window.scrollTo(0, startY + (to - startY) * at(elapsed));

    if (elapsed < totalMs) {
      activeFrame = requestAnimationFrame(step);
    } else {
      activeFrame = null;
      window.removeEventListener("wheel", abort);
      window.removeEventListener("touchstart", abort);
      settle();
    }
  };

  activeFrame = requestAnimationFrame(step);
}

/** How far outside the viewport we still bother animating. */
const SHIFT_MARGIN_PX = 200;

function rowsNearViewport(): HTMLElement[] {
  const rows = document.querySelectorAll<HTMLElement>("article[data-index]");
  if (rows.length === 0) return [];

  // Rows are a flat vertical list, so their positions are monotonic and we can
  // binary search to the viewport. Walking from the top instead cost 7ms per
  // scan on a 1,400-comment thread scrolled deep - twice per collapse, that's a
  // dropped frame, and an animation that drops frames is worse than none.
  const limit = window.innerHeight + SHIFT_MARGIN_PX;
  let lo = 0;
  let hi = rows.length - 1;
  let first = rows.length;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].getBoundingClientRect().bottom >= -SHIFT_MARGIN_PX) {
      first = mid;
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  const out: HTMLElement[] = [];
  for (let i = first; i < rows.length; i++) {
    const el = rows[i];
    if (el.getBoundingClientRect().top > limit) break;
    out.push(el);
  }
  return out;
}

function headerOffset(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--hn-scroll-offset"
  );
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 140;
}

/** The row the reader is looking at, and where on screen it sits. */
export interface ScrollAnchor {
  index: number;
  viewportTop: number;
}

/**
 * Pin the reader's place across a list change.
 *
 * Collapsing removes content, and if that content sat above the viewport the
 * page slides out from under you. Anchoring is what lets collapse be a pure
 * collapse: no scrolling, and nothing appears to move except the gap closing.
 */
export function captureScrollAnchor(): ScrollAnchor | null {
  const offset = headerOffset();
  for (const el of rowsNearViewport()) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom > offset) {
      return { index: Number(el.dataset.index), viewportTop: rect.top };
    }
  }
  return null;
}

/**
 * Put the anchored row back where it was, instantly - this is a correction, not
 * a movement, so animating it would be the very jump we're avoiding.
 *
 * When the anchor was itself inside the collapsed subtree it no longer exists,
 * and `fallbackId` (the comment that was collapsed) takes its place. That lands
 * the collapsed summary exactly where the reader's eyes already were, which is
 * the smallest possible change of view.
 */
export function restoreScrollAnchor(
  anchor: ScrollAnchor | null,
  fallbackId?: number
): void {
  if (!anchor) return;

  let el = document.querySelector<HTMLElement>(
    `article[data-index="${anchor.index}"]`
  );
  let targetTop = anchor.viewportTop;

  if (!el && fallbackId !== undefined) {
    el = document.getElementById(`c${fallbackId}`);
    // A tall anchor row can straddle the header line with a negative top.
    // Substituting the collapsed summary at that same offset would park it
    // off-screen, so keep it at the reading line instead.
    targetTop = Math.max(anchor.viewportTop, headerOffset());
  }
  if (!el) return;

  const delta = el.getBoundingClientRect().top - targetTop;
  if (Math.abs(delta) < 1) return;
  window.scrollBy(0, delta);
}

/**
 * Record where on-screen rows sit, to be replayed by {@link playRowShift} after
 * React commits. Only rows near the viewport are measured, so the cost is the
 * same on a 20-comment thread and a 4,000-comment one.
 *
 * Positions are in document space, not viewport space, so that the anchoring
 * correction above doesn't register as movement. Otherwise every row would
 * animate by the scroll delta, visually undoing and redoing the correction.
 */
export function captureRowTops(): Map<number, number> {
  const tops = new Map<number, number>();
  for (const el of rowsNearViewport()) {
    tops.set(
      Number(el.dataset.index),
      el.getBoundingClientRect().top + window.scrollY
    );
  }
  return tops;
}

/**
 * FLIP: rows that moved get placed back where they were and animated to their
 * new home, so collapsing visibly closes a gap instead of teleporting the page.
 * Rows that are genuinely new fade in rather than popping.
 */
export function playRowShift(before: Map<number, number>): void {
  if (prefersReducedMotion()) return;

  const scrollY = window.scrollY;

  for (const el of rowsNearViewport()) {
    const index = Number(el.dataset.index);
    const previousTop = before.get(index);
    const currentTop = el.getBoundingClientRect().top + scrollY;

    if (previousTop === undefined) {
      el.animate(
        [
          { opacity: 0, transform: "translateY(-4px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: SHIFT_MS, easing: EASE }
      );
      continue;
    }

    const delta = previousTop - currentTop;
    if (Math.abs(delta) < 1) continue;
    // A shift larger than the viewport reads as a jump cut anyway, and animating
    // it just drags unrelated content across the screen.
    if (Math.abs(delta) > window.innerHeight) continue;

    el.animate(
      [{ transform: `translateY(${delta}px)` }, { transform: "translateY(0)" }],
      { duration: SHIFT_MS, easing: EASE }
    );
  }
}
