import { describe, it, expect } from "vitest";
import { trapezoidProgress } from "./scroll-profile";

describe("trapezoidProgress", () => {
  it("covers zero distance instantly", () => {
    const { totalMs, at } = trapezoidProgress(0, 5, 150);
    expect(totalMs).toBe(0);
    expect(at(0)).toBe(1);
    expect(at(1000)).toBe(1);
  });

  it("starts at 0 and ends at 1, never negative or over 1", () => {
    const { totalMs, at } = trapezoidProgress(3000, 5, 150);
    expect(at(-10)).toBe(0);
    expect(at(0)).toBe(0);
    expect(at(totalMs)).toBe(1);
    expect(at(totalMs + 1000)).toBe(1);
  });

  it("is monotonically non-decreasing across the whole trip", () => {
    const { totalMs, at } = trapezoidProgress(4200, 5, 150);
    let prev = -1;
    for (let t = 0; t <= totalMs + 50; t += 5) {
      const p = at(t);
      expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
  });

  it("collapses to a symmetric triangle when too short to reach cruise speed", () => {
    // accel = cruise/ramp = 5/150 px/ms^2. Distance short enough that
    // sqrt(accel * distance) < cruise, i.e. distance < cruise^2/accel = 750.
    const distance = 200;
    const { totalMs, at } = trapezoidProgress(distance, 5, 150);
    // A pure ramp-up/ramp-down triangle is symmetric: the midpoint in time
    // is exactly the midpoint in distance covered.
    expect(at(totalMs / 2)).toBeCloseTo(0.5, 5);
    // And it should finish well before the full 150ms ramp, since it never
    // reached cruising speed.
    expect(totalMs).toBeLessThan(2 * 150);
  });

  it("holds a cruise phase when there's room to reach top speed", () => {
    // distance well past the 750px triangle/trapezoid threshold above.
    const distance = 5000;
    const cruise = 5;
    const ramp = 150;
    const { totalMs, at } = trapezoidProgress(distance, cruise, ramp);
    // Closed-form total time for the trapezoidal case: T = D/v + v/a.
    const accel = cruise / ramp;
    const expectedTotal = distance / cruise + cruise / accel;
    expect(totalMs).toBeCloseTo(expectedTotal, 5);
    // Sampled mid-cruise, progress should track cruise-speed-times-elapsed
    // (offset by the initial ramp), not the eased curve of a short trip.
    const midCruiseT = totalMs / 2;
    const rampMs = cruise / accel;
    const rampDistance = (cruise * cruise) / (2 * accel);
    const expectedDistance = rampDistance + cruise * (midCruiseT - rampMs);
    expect(at(midCruiseT) * distance).toBeCloseTo(expectedDistance, 3);
  });

  it("takes proportionally longer for a longer trip, never capping duration", () => {
    const short = trapezoidProgress(2000, 5, 150).totalMs;
    const long = trapezoidProgress(200000, 5, 150).totalMs;
    // Once cruising, extra distance costs extra time 1:1 at the cruise speed.
    expect(long).toBeGreaterThan(short * 10);
  });
});
