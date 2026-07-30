import { axisAccent } from "../accents";
import { VISIBLE_AXES, GrowthAxis } from "../../../api/dailyPlan";
import { darkColors } from "../../../design-system/semantic/dark";
import { lightColors } from "../../../design-system/semantic/light";
import { contrastRatio, AA_NORMAL, AA_LARGE } from "../../../design-system/utils/contrast";

/**
 * ============================================================================
 * A FILL IS NOT A TEXT COLOUR
 * ----------------------------------------------------------------------------
 * The mistake this guards against reads perfectly in dark mode and fails on
 * paper: using `accent.lime` — a bright fill, chosen to carry dark ink on top
 * of it — as a foreground. It is a plausible-looking one-word substitution, and
 * nobody notices until somebody opens the app in light mode.
 *
 * Both schemes are asserted, because that is the whole point.
 * ============================================================================
 */

const SCHEMES = [
  { name: "dark", colors: darkColors },
  { name: "light", colors: lightColors },
];

describe("axis accents", () => {
  for (const { name, colors } of SCHEMES) {
    describe(name, () => {
      it("carries its own ink on its own fill", () => {
        // The number on Home sits directly on `fill` and is rendered in `on`.
        // Large-text AA: these are h3-sized figures, not body copy.
        for (const axis of VISIBLE_AXES) {
          const { fill, on } = axisAccent(axis, colors);
          const ratio = contrastRatio(on, fill);
          expect(`${axis}:${ratio >= AA_LARGE}`).toBe(`${axis}:true`);
        }
      });

      it("stays legible as text on the card surface", () => {
        // The count in the report's own column is `text` on `surface.default`.
        // Body-size AA, and the check that catches somebody swapping in `fill`.
        for (const axis of VISIBLE_AXES) {
          const { text } = axisAccent(axis, colors);
          const ratio = contrastRatio(text, colors.surface.default);
          expect(`${axis}:${ratio >= AA_NORMAL}`).toBe(`${axis}:true`);
        }
      });

      it("keeps a separate text token even where the two coincide", () => {
        // NOT `fill !== text`. That was the first version of this test and it
        // was wrong: in the dark scheme `lime.base` and `lime.textOnDark` are
        // the same value, because a bright lime genuinely IS legible as text on
        // a dark canvas. Asserting they differ would have forced a worse colour
        // to satisfy a proxy for the real rule.
        //
        // The real rule is the two tests above — each token is contrast-correct
        // for its own job in this scheme. What this adds is the reason the map
        // bothers to keep them apart at all, asserted where it bites: on paper,
        // the fills are unusable as foreground. If that ever stops being true
        // the separation is free to collapse — but it should be a decision,
        // not a coincidence somebody leaned on.
        for (const axis of VISIBLE_AXES) {
          const { fill } = axisAccent(axis, colors);
          const asTextOnPaper = contrastRatio(fill, lightColors.surface.default);
          if (name === "light") {
            expect(`${axis}:${asTextOnPaper >= AA_NORMAL}`).toBe(
              `${axis}:false`,
            );
          }
        }
      });

      it("gives the three visible axes three different hues", () => {
        const fills = VISIBLE_AXES.map((a) => axisAccent(a, colors).fill);
        expect(new Set(fills).size).toBe(VISIBLE_AXES.length);
      });

      it("falls back to neutral for an axis with no considered hue", () => {
        // Finisher is hidden today. If it — or a new axis — ever renders
        // without being given a colour here, it must look unstyled rather than
        // borrow one and imply a meaning nobody chose.
        const { fill } = axisAccent(GrowthAxis.STEADIER, colors);
        expect(fill).toBe(colors.surface.control);
      });
    });
  }
});
