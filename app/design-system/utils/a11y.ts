/**
 * ── RANGE VALUES FOR SCREEN READERS, ALWAYS WHOLE NUMBERS ──────────────────
 * On Android (Fabric) `accessibilityValue.min/max/now` are native integers.
 * A fraction there does not get rounded: it throws "Loss of precision during
 * arithmetic conversion: (long) 2.333" and takes the whole screen down with a
 * Render Error. That happened on a program day (2026-11-25) because a bar's
 * value was "step 2, a third of the way through the lesson".
 *
 * Every `accessibilityValue` (and `aria-valuenow/min/max`) in the app goes
 * through `rangeValue`, so the value is rounded, ordered and finite before it
 * reaches native. `utils/__tests__/a11yValue.test.ts` fails the build when a
 * call site skips it.
 */
export interface RangeValue {
  min: number;
  max: number;
  now: number;
  text?: string;
}

const whole = (v: number, fallback: number) => (Number.isFinite(v) ? Math.round(v) : fallback);

/**
 * `now` within `min..max`, all three whole numbers. Defaults to a 0 to 100
 * scale, which is what a screen reader reads as a percentage.
 */
export function rangeValue(now: number, min = 0, max = 100, text?: string): RangeValue {
  const lo = whole(Math.min(min, max), 0);
  const hi = whole(Math.max(min, max), lo);
  const at = Math.min(hi, Math.max(lo, whole(now, lo)));
  return text ? { min: lo, max: hi, now: at, text } : { min: lo, max: hi, now: at };
}
