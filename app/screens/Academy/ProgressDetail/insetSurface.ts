import type { SemanticColors } from "../../../design-system/semantic/roles";

/**
 * ============================================================================
 * THE INNER CONTAINER, IDENTICAL ON EVERY PROGRESS-REPORT CARD
 * ----------------------------------------------------------------------------
 * Four cards on this screen nest a block inside a `surface.elevated` card —
 * the weekly stat badges, the lifetime stat tiles, the mood remark, the growth
 * rows — and each one had picked its own fill. They should be one thing, so
 * they are defined once here.
 *
 * WHY THE FILL DEPENDS ON THE SCHEME, when almost nothing else in this codebase
 * does. The two ramps do not behave alike, and the numbers are not close:
 *
 *                     inside surface.elevated
 *                     LIGHT     DARK
 *   surface.default   1.008     1.126   <- the established look, in dark
 *   background.canvas 1.105     1.302
 *   background.sunken 1.207     1.362
 *
 * In DARK, `surface.default` is right: 1.126 is a soft, well-judged inset and
 * it is what the weekly card has always used. Anything deeper reads as a hole
 * punched in the card rather than a panel resting in it.
 *
 * In LIGHT, that same pair is 1.008 — the same colour twice, with an 8%-alpha
 * hairline as the only thing drawing the shape. `background.canvas` restores
 * the separation at 1.105 while staying softer than a true sunken well.
 *
 * So: the same intent — "a panel inset into this card" — needs a different
 * token per ramp. That is what a scheme conditional is FOR, and hiding it
 * behind a single token would just mean one of the two schemes is wrong.
 * ============================================================================
 */
export function insetSurface(
  colors: SemanticColors,
  scheme: string,
): { backgroundColor: string; borderColor: string } {
  return {
    backgroundColor:
      scheme === "dark" ? colors.surface.default : colors.background.canvas,
    // Kept in both schemes. In dark it is a soft edge on a shape the fill has
    // already drawn; in light it is doing more of the work.
    borderColor: colors.border.hairline,
  };
}
