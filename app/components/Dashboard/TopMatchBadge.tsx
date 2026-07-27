import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme, spacing, radius, zIndex } from "../../design-system";

/**
 * The "TOP MATCH" flag — one badge, one wording, everywhere a ranked program is
 * shown (the Home carousel slide and the shop's matched hero). It used to say
 * "MATCHED TO YOU" in the shop and "TOP MATCH" on Home, for the same pack,
 * ranked by the same call.
 *
 * GEOMETRY IS COPIED, NOT INVENTED. The app already had a corner badge — the
 * "FREE" pill on the Cognitive Practice cards (`cornerBadge` there): a bright
 * accent pill with its `accentOn` ink, `radius.chip`, `spacing.sm`/`xxs`
 * padding, hung 6px off the top-right so it half-overlaps the card. This is that
 * badge, so the two read as the same kind of object rather than two teams'
 * takes on a corner flag.
 *
 * WHAT DIFFERS IS THE HUE, deliberately. FREE is `accent.success` green; a second
 * green pill in the same position would read as the same label. Lime is also the
 * only accent far enough in hue AND luminance from BOTH cards it lands on — the
 * cool blue on Home and the warm orange in the shop — to stay a separate object
 * on either. A cool-toned pick (purple) sits ~30° from the blue card and would
 * dissolve into it. Its `accentOn` ink is AA on it by construction.
 */

/**
 * How far the badge hangs off the card, up and to the right — the FREE badge's
 * 6px.
 *
 * A CALL SITE MUST DO TWO THINGS or the badge is invisible, not merely misplaced:
 *   1. render this as the last child of a wrapper that does NOT clip. The cards
 *      set `overflow: "hidden"` to keep their blob/watermark texture inside their
 *      radius, so the badge has to be a SIBLING of the card, never a child.
 *   2. give that wrapper `paddingTop: BADGE_OVERHANG`. The FREE badge can simply
 *      use `top: -6` because it sits in an ordinary page body; a carousel slide's
 *      real ceiling is the horizontal ScrollView's frame, which crops anything
 *      above it. Padding the wrapper and pinning the badge to `top: 0` puts the
 *      overhang inside that frame while looking identical.
 */
export const BADGE_OVERHANG = 6;

/**
 * Roughly the badge's width. It is absolutely positioned, so it occupies no
 * space and the eyebrow beside it has no idea it is there — this is the
 * clearance a call site puts on that eyebrow (`marginRight`) so a long shelf
 * label ("FULL PROGRAM · 14 DAYS") stops before the badge instead of sliding
 * underneath it.
 */
export const BADGE_LANE = 100;

const TopMatchBadge: React.FC = () => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.accent.lime }]}
      pointerEvents="none"
    >
      <Text variant="label" color={colors.accentOn.lime}>
        TOP MATCH
      </Text>
    </View>
  );
};

export default TopMatchBadge;

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 0,
    right: -BADGE_OVERHANG,
    zIndex: zIndex.sticky,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.chip,
  },
});
