import { auditSchemes } from "../schemeAudit";

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

/*
 * THE AXIS-ACCENT AUDIT USED TO LIVE HERE.
 *
 * It measured the Braver/Wider/Regular accent colours against
 * `surface.contrast`, which flips with the scheme, and it caught a real bug:
 * using `text` instead of `onContrast` failed every axis in light mode only.
 *
 * Those counts are gone from the product and no screen paints an axis colour,
 * so the audit had no subject left. The rule it protected still holds for any
 * FUTURE colour placed on `surface.contrast`: the cut tuned for the current
 * scheme is the wrong one there. If something lands on that surface again,
 * bring this back and point it at the new colour.
 */
