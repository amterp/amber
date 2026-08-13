/**
 * The trapezoidal velocity profile motion control uses everywhere from
 * stepper motors to camera dollies: ramp up to cruising speed at a constant
 * acceleration, hold it, ramp back down, timed to land exactly on target.
 * Distance is the integral of velocity, so `at(t)` below - the closed-form
 * fraction of the trip covered by time `t` - is just that integral evaluated
 * piecewise per phase.
 *
 * A trip too short to ever reach cruising speed collapses to a triangle: the
 * two ramps meet at a lower peak partway up. That's what keeps a short jump
 * snappy without a separate minimum-duration constant - it falls out of the
 * same formula instead of needing a special case.
 *
 * Returns a fraction (0-1) of distance covered, not a pixel count, so a
 * caller mid-animation can keep applying it against a live-recomputed
 * distance instead of one fixed at the start of the trip.
 */
export function trapezoidProgress(
  distance: number,
  cruisePxPerMs: number,
  rampMs: number
): { totalMs: number; at: (elapsedMs: number) => number } {
  if (distance <= 0) return { totalMs: 0, at: () => 1 };

  const accelPxPerMs2 = cruisePxPerMs / rampMs;
  const peak = Math.min(cruisePxPerMs, Math.sqrt(accelPxPerMs2 * distance));
  const peakRampMs = peak / accelPxPerMs2;
  const rampDistance = (peak * peak) / (2 * accelPxPerMs2);
  const cruiseDistance = Math.max(0, distance - 2 * rampDistance);
  const cruiseMs = cruiseDistance / peak;
  const totalMs = 2 * peakRampMs + cruiseMs;

  const at = (elapsedMs: number): number => {
    if (elapsedMs <= 0) return 0;
    if (elapsedMs >= totalMs) return 1;

    let covered: number;
    if (elapsedMs <= peakRampMs) {
      covered = 0.5 * accelPxPerMs2 * elapsedMs * elapsedMs;
    } else if (elapsedMs <= peakRampMs + cruiseMs) {
      covered = rampDistance + peak * (elapsedMs - peakRampMs);
    } else {
      const remaining = totalMs - elapsedMs;
      covered = distance - 0.5 * accelPxPerMs2 * remaining * remaining;
    }
    return covered / distance;
  };

  return { totalMs, at };
}
