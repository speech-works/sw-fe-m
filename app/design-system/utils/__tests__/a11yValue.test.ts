import { execSync } from "child_process";
import { join } from "path";
import { rangeValue } from "../a11y";

/**
 * ============================================================================
 * A SCREEN-READER RANGE IS NEVER A FRACTION
 * ----------------------------------------------------------------------------
 * Android reads `accessibilityValue` min/max/now as integers. A fraction
 * crashes the screen ("Loss of precision during arithmetic conversion"), and it
 * only shows on a real Android phone, never in Jest or on iOS. So the rule is
 * enforced, not remembered: every `accessibilityValue` and `aria-value*` prop
 * in the app must be built with `rangeValue` from design-system/utils/a11y.
 * ============================================================================
 */
describe("rangeValue", () => {
  it("rounds a fraction", () => {
    expect(rangeValue(2.3333333333333335, 0, 7)).toEqual({ min: 0, max: 7, now: 2 });
  });
  it("defaults to a 0 to 100 scale and clamps", () => {
    expect(rangeValue(33.4)).toEqual({ min: 0, max: 100, now: 33 });
    expect(rangeValue(140)).toEqual({ min: 0, max: 100, now: 100 });
    expect(rangeValue(-3)).toEqual({ min: 0, max: 100, now: 0 });
  });
  it("survives NaN, Infinity and a reversed range", () => {
    expect(rangeValue(NaN, 0, 10)).toEqual({ min: 0, max: 10, now: 0 });
    expect(rangeValue(Infinity, 0, 10)).toEqual({ min: 0, max: 10, now: 0 });
    expect(rangeValue(5, 10, 0)).toEqual({ min: 0, max: 10, now: 5 });
    expect(rangeValue(1.5, 0.4, 3.6)).toEqual({ min: 0, max: 4, now: 2 });
  });
  it("keeps the spoken text", () => {
    expect(rangeValue(1, 0, 4, "Part 1 of 4").text).toBe("Part 1 of 4");
  });
});

describe("every accessibilityValue in the app goes through rangeValue", () => {
  const root = join(__dirname, "..", "..", "..", "..");
  it("has no raw ranges", () => {
    let out = "";
    try {
      out = execSync(
        "grep -rnE 'accessibilityValue=|aria-value(now|min|max)=' app modules --include='*.tsx' --include='*.ts'",
        { cwd: root, encoding: "utf8" },
      );
    } catch {
      out = ""; // grep exits 1 when nothing matches
    }
    const offenders = out
      .split("\n")
      .filter(Boolean)
      .filter((line) => !line.includes("__tests__"))
      .filter((line) => !/accessibilityValue=\{rangeValue\(/.test(line));
    expect(offenders).toEqual([]);
  });
});
