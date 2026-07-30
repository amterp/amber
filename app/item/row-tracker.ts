/**
 * Tracks which comment currently sits just under the sticky headers, using a
 * single IntersectionObserver configured as a thin tripwire band. That's what
 * feeds the ancestor breadcrumb and, on touch, the floating pager.
 *
 * One observer for the whole thread, with rows observing and unobserving
 * themselves. Rebuilding it on every collapse would mean re-observing thousands
 * of elements, which reads to the user as a janky breadcrumb.
 *
 * Resize handling lives in here rather than in the component so the tracker's
 * identity stays stable: a new instance would force every row to re-observe.
 */
export interface RowTracker {
  observe(el: HTMLElement): void;
  unobserve(el: HTMLElement): void;
  disconnect(): void;
}

/** Height of the band below the headers. Generous enough to survive fast scrolls. */
const BAND_PX = 120;
const RESIZE_DEBOUNCE_MS = 200;

export function createRowTracker(onChange: (index: number) => void): RowTracker {
  const observed = new Set<HTMLElement>();
  const intersecting = new Set<number>();
  let observer: IntersectionObserver;

  const indexOf = (el: Element) => Number((el as HTMLElement).dataset.index);

  const emit = () => {
    let min = Infinity;
    for (const i of intersecting) if (i < min) min = i;
    if (Number.isFinite(min)) onChange(min);
  };

  const offsetPx = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(
      "--hn-scroll-offset"
    );
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 140;
  };

  const build = () => {
    const top = offsetPx();
    const bottom = Math.max(0, window.innerHeight - top - BAND_PX);
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = indexOf(entry.target);
          if (Number.isNaN(index)) continue;
          if (entry.isIntersecting) intersecting.add(index);
          else intersecting.delete(index);
        }
        emit();
      },
      { rootMargin: `-${top}px 0px -${bottom}px 0px` }
    );
  };

  build();

  let resizeTimer: ReturnType<typeof setTimeout>;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      observer.disconnect();
      intersecting.clear();
      build();
      for (const el of observed) observer.observe(el);
    }, RESIZE_DEBOUNCE_MS);
  };
  window.addEventListener("resize", onResize);

  return {
    observe(el) {
      observed.add(el);
      observer.observe(el);
    },
    unobserve(el) {
      // Collapsing unmounts rows without firing a callback, so drop them here or
      // a stale index keeps winning the "topmost" race.
      observed.delete(el);
      const index = indexOf(el);
      if (!Number.isNaN(index)) intersecting.delete(index);
      observer.unobserve(el);
      emit();
    },
    disconnect() {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      observed.clear();
      intersecting.clear();
      observer.disconnect();
    },
  };
}
