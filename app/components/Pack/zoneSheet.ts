/**
 * The "two beats" look of the program screens: an orange zone on top and one rounded sheet under it, with Pip standing
 * behind the sheet's top edge. The numbers and colours that the day-done screen (DayDone) and the day screen's frame
 * (DayFrame) share, so the two can never drift apart.
 */
import { Easing } from "react-native-reanimated";
import type { SemanticColors } from "../../design-system/semantic/roles";

/** Text in the zone and in the sheet starts here; rows, buttons and the dock reach out to the screen gutter (16). */
export const ZONE_TEXT_X = 24;

/** The share of Pip's picture that sits behind the edge. Small: with no blob cut his jacket is drawn on below his picture
 *  (Pip.tsx padB: about 8% of his width more), so the edge always cuts through the jacket, under the whole collar and tie. */
export const PIP_HIDE = 0.03;
/** In Pip's picture (372 wide), from his middle: how far his raised sleeve reaches at the edge while he waves (measured
 *  on every frame of h-wave: 0.39; his body alone is 0.3), and half of his head. */
export const PIP_HALF_WAVE = 0.4, PIP_HALF_HEAD = 0.21;

/** The one curve for everything that slides here (the sheet, Pip's place, the heading). */
export const ZONE_EASE = Easing.bezier(0.2, 0.8, 0.2, 1);

/** The sheet's fill: one step up from the canvas on ink, the paper canvas itself on paper. */
export const sheetFill = (colors: SemanticColors, scheme: string) => (scheme === "dark" ? colors.surface.default : colors.background.canvas);

/** On the orange zone: the ink is `action.onPrimary`; these are its three alphas (not design-system tokens yet). */
export const ON_ORANGE_MUTED = "rgba(42,21,5,0.74)", ON_ORANGE_TRACK = "rgba(42,21,5,0.20)", ON_ORANGE_DISC = "rgba(42,21,5,0.12)";
