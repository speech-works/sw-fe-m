import { BURST_TOTAL_MS, CHIP_COUNT, chipPlan } from "../index";

/**
 * The confetti's exit.
 *
 * Everything here guards ONE failure: a chip still on screen after the burst is
 * over. The app has shipped that bug before — `ConfettiAnimation`'s own header
 * records the version that looped forever and left pieces parked and spinning —
 * and it is invisible in a screenshot taken during the fall, which is the only
 * moment anyone naturally looks.
 *
 * The burst unmounts itself at `BURST_TOTAL_MS`. That number is only correct
 * while it stays ahead of every chip, which is what these assert.
 */
describe("confetti burst lifetime", () => {
  it("outlives every chip", () => {
    for (let i = 0; i < CHIP_COUNT; i++) {
      const { delay, fall } = chipPlan(i);
      // Strictly greater, not equal: unmounting on the exact frame a chip
      // lands would clip its last step off.
      expect(delay + fall).toBeLessThan(BURST_TOTAL_MS);
    }
  });

  it("does not outlive them by long enough to matter", () => {
    const slowest = Math.max(
      ...Array.from({ length: CHIP_COUNT }, (_, i) => {
        const { delay, fall } = chipPlan(i);
        return delay + fall;
      }),
    );
    // A layer that hangs around for seconds after the last chip is a leak
    // waiting to be noticed, even at zero opacity.
    expect(BURST_TOTAL_MS - slowest).toBeLessThanOrEqual(250);
  });

  it("keeps the whole burst short enough to be a burst", () => {
    // Longer than this and it stops reading as a moment and starts reading as
    // weather over a modal someone is trying to dismiss.
    expect(BURST_TOTAL_MS).toBeLessThan(3500);
  });

  it("gives every chip a real schedule, and staggers them", () => {
    const delays = new Set<number>();
    const falls = new Set<number>();
    for (let i = 0; i < CHIP_COUNT; i++) {
      const { delay, fall } = chipPlan(i);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(fall).toBeGreaterThan(0);
      delays.add(delay);
      falls.add(fall);
    }
    // All-identical timings would land as one solid sheet rather than a fall.
    expect(delays.size).toBeGreaterThan(1);
    expect(falls.size).toBeGreaterThan(1);
  });
});
