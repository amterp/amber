/**
 * How many ancestor chips fit in the breadcrumb bar before eliding the rest
 * behind a "+N" pill. Pulled out of the component as pure arithmetic so the
 * greedy-fit logic - the one part of that bar with real edge cases - gets a
 * real unit test instead of only manual verification.
 *
 * `chipWidths` is root-first (oldest ancestor first), matching `FlatComment`'s
 * `ancestorIndices`. Fit is computed from the tail backward, since the chips
 * closest to what's currently being read matter more than the top of the
 * chain when there isn't room for all of them.
 *
 * This is deliberately approximate, not sub-pixel accurate: it charges one
 * `chevronWidth` per connector (pill-to-chip or chip-to-chip) and doesn't
 * model text reflow or fractional layout. The ancestor bar's own
 * `overflow-x-auto` is the fallback for anything this slightly misjudges.
 */
export function computeVisibleChipCount(
  containerWidth: number,
  chipWidths: readonly number[],
  pillWidth: number,
  chevronWidth: number
): number {
  const total = chipWidths.length;
  if (total === 0) return 0;

  const fullWidth =
    chipWidths.reduce((sum, w) => sum + w, 0) + chevronWidth * (total - 1);
  if (fullWidth <= containerWidth) return total;

  // Eliding: the "+N" pill plus one chevron connecting it to the first shown
  // chip, then one chevron between each subsequent pair of shown chips.
  let width = pillWidth;
  let count = 0;
  for (let i = total - 1; i >= 0; i--) {
    const next = width + chevronWidth + chipWidths[i];
    // Always keep at least one chip, even if it overflows - a bar with
    // nothing shown but a pill would be nonsensical, and overflow-x-auto
    // covers the rest.
    if (count > 0 && next > containerWidth) break;
    width = next;
    count++;
  }
  return count;
}
