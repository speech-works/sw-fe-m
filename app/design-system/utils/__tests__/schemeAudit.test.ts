import { auditSchemes } from "../schemeAudit";
import { axisAccent } from "../../../util/growth/accents";
import { schemes } from "../../theme";
import { VISIBLE_AXES } from "../../../api/dailyPlan";
import { contrastRatio, AA_NORMAL } from "../contrast";

/**
 * ============================================================================
 * THE SCHEME AUDIT, ACTUALLY RUN
 * ----------------------------------------------------------------------------
 * `runSchemeAudit` walks every canonical pairing in both schemes and warns on
 * anything below AA. It is thorough, it is correct, and NOTHING CALLED IT — it
 * is `__DEV__`-gated, console-based, and has no callers anywhere in the app. So
 * adding a pairing to it recorded an intention and enforced nothing.
 *
 * This runs it. Every token retune from here on has to survive `npx jest`.
 * ============================================================================
 */
describe("colour schemes", () => {
  it("clears WCAG AA on every canonical pairing, in both schemes", () => {
    // Reported as labels rather than a count, so a failure names the pair and
    // the scheme instead of saying "expected 0, got 3".
    const failures = auditSchemes().map(
      (f) => `${f.scheme}: ${f.label} = ${f.ratio} (needs ${f.need})`,
    );
    expect(failures).toEqual([]);
  });
});

describe("axis accents on the high-contrast card", () => {
  /**
   * THE TRAP THIS EXISTS FOR. `surface.contrast` deliberately flips against the
   * scheme — dark on paper, light on ink — so the accent cut tuned for the
   * CURRENT scheme is the wrong one there. Using `text` instead of `onContrast`
   * measures 2.80–2.94:1 in light mode: every axis fails, and only in light,
   * which is precisely the kind of thing that ships and gets noticed by a user
   * rather than by us.
   */
  for (const scheme of ["light", "dark"] as const) {
    it(`reads on the contrast card in ${scheme}`, () => {
      const colors = schemes[scheme];
      const failures: string[] = [];
      for (const axis of VISIBLE_AXES) {
        const { onContrast } = axisAccent(axis, colors);
        const ratio = contrastRatio(onContrast, colors.surface.contrast);
        if (ratio < AA_NORMAL) {
          failures.push(`${axis} = ${ratio.toFixed(2)}`);
        }
      }
      expect(failures).toEqual([]);
    });

    it(`would FAIL with the ordinary text cut in ${scheme} — proving the split is load-bearing`, () => {
      // A guard against somebody "simplifying" `onContrast` away by pointing it
      // at `text`. If this ever stops failing, the two cuts have converged and
      // the extra field can go — but that has to be a measurement, not a guess.
      const colors = schemes[scheme];
      const worst = Math.min(
        ...VISIBLE_AXES.map((axis) =>
          contrastRatio(axisAccent(axis, colors).text, colors.surface.contrast),
        ),
      );
      expect(worst).toBeLessThan(AA_NORMAL);
    });
  }
});
