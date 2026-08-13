/**
 * Rails are the vertical lines to the left of a comment, one per ancestor. They
 * carry the indentation, show the nesting depth, and act as the click target for
 * skipping past that ancestor's branch to whatever comes next at that level.
 */

/** Rails thin out with depth so a depth-21 comment still has room for text. */
export function railTier(level: number): 0 | 1 | 2 {
  if (level < 6) return 0;
  if (level < 12) return 1;
  return 2;
}

const RAIL_WIDTH_CLASS = [
  "w-[var(--rail-1)]",
  "w-[var(--rail-2)]",
  "w-[var(--rail-3)]",
] as const;

/**
 * A six-hue cycle. Depth 6 repeats depth 0's color, but rail position and the
 * tier width change also encode depth, and the collapsed pill and ancestor bar
 * both name the author, so color is never the only signal.
 *
 * These must stay complete literal class names. Tailwind scans source as text,
 * so a template literal like `bg-${hue}-400` emits no CSS and no error.
 */
export const RAIL_TINTS = [
  "bg-orange-500 dark:bg-orange-400",
  "bg-sky-500 dark:bg-sky-400",
  "bg-emerald-500 dark:bg-emerald-400",
  "bg-violet-500 dark:bg-violet-400",
  "bg-amber-500 dark:bg-amber-300",
  "bg-rose-500 dark:bg-rose-400",
] as const;

export function railTint(level: number): string {
  return RAIL_TINTS[level % RAIL_TINTS.length];
}

export function railWidthClass(level: number): string {
  return RAIL_WIDTH_CLASS[railTier(level)];
}
