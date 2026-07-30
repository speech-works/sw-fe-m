import type { SemanticColors } from "../../design-system/semantic/roles";
import { GrowthAxis } from "../../api/dailyPlan";

/**
 * ============================================================================
 * ONE COLOUR PER AXIS
 * ----------------------------------------------------------------------------
 * The growth surfaces first shipped built entirely from `surface.default` and
 * `surface.elevated` — two browns a shade apart — so the numbers, which are the
 * whole point of the screen, rendered in the same grey as their own labels.
 *
 * A FILL COLOUR AND A TEXT COLOUR ARE NOT THE SAME TOKEN, and this is where
 * that goes wrong quietly. `accent.lime` is a fill: bright enough to carry
 * `accentOn.lime` ink on top of it in either scheme. Used as TEXT it collapses
 * on the light "paper" canvas. `accentText.*` is the scheme-aware cut for that
 * job — `textOnDark` in dark, `textOnLight` in light — so a number tinted with
 * it stays legible both ways. Every caller takes the pair from here rather than
 * reaching for `colors.accent.*` directly, which is the mistake that reads fine
 * in dark mode and fails review on paper.
 *
 * WHY THESE THREE. Braver takes the app's own orange because taking something
 * on is the closest thing the product has to a hero action. Wider takes lime —
 * the outdoors one, and unspoken for elsewhere. Regular takes purple, which is
 * ALSO the reflection accent (see the card-accent-inheritance rule). That
 * overlap is deliberate and safe here: these are labels on a static card, not
 * an accent threaded into a screen you navigated to, so nothing inherits the
 * wrong hue. If it ever grates, `info` is free and this is the only file to
 * change.
 *
 * Finisher is absent for the same reason it is absent from `VISIBLE_AXES`.
 * ============================================================================
 */
export interface AxisAccent {
  /** Solid background. Pair ONLY with `on`. */
  fill: string;
  /** Ink for text sitting on `fill`. AA in both schemes by construction. */
  on: string;
  /** The hue as TEXT on an ordinary surface. Never use `fill` for this. */
  text: string;
}

export function axisAccent(
  axis: GrowthAxis | string,
  colors: SemanticColors,
): AxisAccent {
  switch (axis) {
    case GrowthAxis.BRAVER:
      return {
        fill: colors.action.primary,
        on: colors.action.onPrimary,
        // `text.accent`, not `action.primary` — the bright orange fill is a
        // documented fail as a foreground on paper.
        text: colors.text.accent,
      };
    case GrowthAxis.WIDER:
      return {
        fill: colors.accent.lime,
        on: colors.accentOn.lime,
        text: colors.accentText.lime,
      };
    case GrowthAxis.REGULAR:
      return {
        fill: colors.accent.purple,
        on: colors.accentOn.purple,
        text: colors.accentText.purple,
      };
    default:
      // Finisher, or anything added later that has not been given a hue.
      // Neutral rather than a guessed colour: an axis with no considered
      // accent should look unstyled, not miscoloured.
      return {
        fill: colors.surface.control,
        on: colors.text.primary,
        text: colors.text.secondary,
      };
  }
}
