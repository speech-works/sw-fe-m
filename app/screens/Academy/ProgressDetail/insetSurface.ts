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
 * WHAT USED TO LIVE HERE was a `scheme === "dark"` conditional, because the two
 * ramps do not behave alike and no single token expressed both halves:
 *
 *                     inside surface.elevated
 *                     LIGHT     DARK
 *   surface.default   1.008     1.126   <- the established look, in dark
 *   background.canvas 1.105     1.302
 *   background.sunken 1.207     1.362
 *
 * That conditional was right about the problem and wrong about the scope: this
 * is not a ProgressDetail concern, it is what "a panel inset into a card" MEANS
 * on a scheme with no headroom, and the same collapse was happening on every
 * other nested block in the app. It is now the `surface.inset` role — dark
 * unchanged at 1.126, light deepened from 1.105 to 1.13:1 (ΔE 5.8) so it
 * matches the dark scheme's own nested step rather than merely clearing it.
 *
 * Kept as a helper because these four cards should stay one thing, and because
 * the hairline travels with the fill.
 * ============================================================================
 */
export function insetSurface(colors: SemanticColors): { backgroundColor: string; borderColor: string } {
  return {
    backgroundColor: colors.surface.inset,
    // Kept in both schemes. In dark it is a soft edge on a shape the fill has
    // already drawn; in light it is doing more of the work.
    borderColor: colors.border.hairline,
  };
}
