import { describe, it, expect } from "vitest";
import { computeVisibleChipCount } from "./chip-fit";

describe("computeVisibleChipCount", () => {
  it("shows every chip when they all fit, with no pill reserved", () => {
    // 3 chips of 20 + 2 chevrons of 8 = 76, well under 200.
    expect(computeVisibleChipCount(200, [20, 20, 20], 30, 8)).toBe(3);
  });

  it("fits exactly at the boundary without eliding", () => {
    // 2 chips of 20 + 1 chevron of 8 = 48, container is exactly 48.
    expect(computeVisibleChipCount(48, [20, 20], 30, 8)).toBe(2);
  });

  it("elides the oldest ancestors first, keeping the tail closest to current", () => {
    const widths = [50, 50, 50, 50]; // root-first
    // Full row: 200 + 3*8 = 224, too wide for 150.
    // Elided budget: pill(30) + chevron(8) + chip = fits 2 tail chips:
    //   30 + 8 + 50 = 88, + 8 + 50 = 146 <= 150; a 3rd would be 204 > 150.
    expect(computeVisibleChipCount(150, widths, 30, 8)).toBe(2);
  });

  it("always shows at least one chip, even if it alone overflows", () => {
    expect(computeVisibleChipCount(10, [500, 500, 500], 30, 8)).toBe(1);
  });

  it("returns 0 for an empty chain", () => {
    expect(computeVisibleChipCount(500, [], 30, 8)).toBe(0);
  });

  it("does not reserve pill width when only a single chip exists", () => {
    // A lone chip that doesn't fit still shows as 1, not "elided to 0 behind a pill".
    expect(computeVisibleChipCount(10, [50], 30, 8)).toBe(1);
  });

  it("is monotonically non-decreasing as container width grows", () => {
    const widths = [40, 35, 60, 25, 45];
    let prev = 0;
    for (let w = 0; w <= 400; w += 17) {
      const count = computeVisibleChipCount(w, widths, 30, 8);
      expect(count).toBeGreaterThanOrEqual(prev);
      prev = count;
    }
    expect(prev).toBe(widths.length);
  });
});
