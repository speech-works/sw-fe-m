import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  Text,
  useTheme,
  useMotion,
  duration,
  easing,
  spring,
  withAlpha,
  spacing,
  radius,
  zIndex,
} from "../../design-system";

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

/** Variant 07: a broad ticket-punch stamp that crosses the card edge. */
export const STAMP_WIDTH = 196;
export const STAMP_HEIGHT = 80;
const STAMP_OPACITY = 0.52;
const IMPACT_DELAY = 160;
const IMPACT_DURATION = 900;
const CONTACT_AT = 0.56;

/**
 * THE SAME CLAIM, STAMPED RATHER THAN PINNED — for surfaces with room for it.
 *
 * A corner badge is chrome: it hangs off the card's edge, it needs the card's
 * clipping turned off, it needs a reserved lane so nothing runs under it, and it
 * reads as a sticker the interface applied. A stamp is a mark on the card
 * itself — it says a thing was examined and approved, which is nearer to what
 * "top match" actually means: the server ranked ten of these and this one came
 * first.
 *
 * THIS IS A WATERMARK, NOT A LABEL. It is painted before the card copy and CTA
 * at 52% opacity — intentionally visible, while still yielding wherever
 * functional content crosses it. Broken strokes retain the dry rubber texture.
 */
interface StampArtworkProps {
  ink: string;
  face?: string;
  solid?: boolean;
}

const StampArtwork: React.FC<StampArtworkProps> = ({ ink, face = "none", solid }) => (
  <View style={styles.stampArtwork}>
    <Svg width="100%" height="100%" viewBox="0 0 196 80" style={styles.stampArt}>
      <Path
        d="M4 4h188v18a16 16 0 000 32v22H4V54a16 16 0 000-32V4z"
        fill={face}
        stroke={ink}
        strokeWidth={solid ? 5 : 4}
        strokeLinejoin="round"
        strokeDasharray={solid ? undefined : "74 4 29 3 86 7"}
      />
      <Line
        x1="50"
        y1="14"
        x2="50"
        y2="66"
        stroke={ink}
        strokeWidth={solid ? 3 : 2}
        strokeDasharray="5 5"
      />
    </Svg>

    <View style={styles.ticketCopy}>
      <Text variant="caption" color={ink} style={[styles.stampLine, styles.stampTop]}>
        TOP
      </Text>
      <Text variant="title" color={ink} style={[styles.stampLine, styles.stampMatch]}>
        MATCH
      </Text>
    </View>
  </View>
);

export const TopMatchStamp: React.FC<{ ink: string; revealed?: boolean }> = ({
  ink,
  revealed = true,
}) => {
  const { reduced } = useMotion();
  const reveal = useSharedValue(revealed ? 1 : 0);
  const scale = useSharedValue(revealed ? 1 : 0.94);

  useEffect(() => {
    if (!revealed) {
      reveal.value = 0;
      scale.value = reduced ? 1 : 0.94;
      return;
    }

    reveal.value = withTiming(1, {
      duration: reduced ? duration.base : duration.fast,
      easing: easing.out,
    });
    scale.value = reduced ? 1 : withSpring(1, spring.press);
  }, [reduced, reveal, revealed, scale]);

  const revealStyle = useAnimatedStyle(() => ({
    opacity: reveal.value * STAMP_OPACITY,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.stampReveal, revealStyle]} pointerEvents="none">
      <View style={styles.stampRotation}>
        <StampArtwork ink={ink} />
      </View>
    </Animated.View>
  );
};

interface TopMatchImpactProps {
  ink: string;
  onContact: () => void;
  onFinished: () => void;
}

/**
 * Variant 07, DIAGONAL SLAM. This is the rubber die, not the ink impression:
 * it begins at the viewer plane, travels down the z-axis, compresses on the
 * card, then recoils toward the viewer and disappears. The separate imprint is
 * revealed at contact and stays behind the card content.
 */
export const TopMatchImpact: React.FC<TopMatchImpactProps> = ({
  ink,
  onContact,
  onFinished,
}) => {
  const progress = useSharedValue(-1);

  useEffect(() => {
    const contactTimer = setTimeout(onContact, IMPACT_DELAY + IMPACT_DURATION * CONTACT_AT);

    progress.value = withDelay(
      IMPACT_DELAY,
      withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(
          1,
          { duration: IMPACT_DURATION, easing: easing.linear },
          (finished) => {
            if (finished) runOnJS(onFinished)();
          },
        ),
      ),
    );

    return () => clearTimeout(contactTimer);
  }, [onContact, onFinished, progress]);

  const impactStyle = useAnimatedStyle(() => {
    const p = progress.value;
    if (p < 0) return { opacity: 0, transform: [{ scale: 10.5 }] };

    const input = [0, 0.45, 0.56, 0.69, 1];
    return {
      opacity: interpolate(p, input, [0.96, 0.98, 1, 0.8, 0], Extrapolation.CLAMP),
      transform: [
        { perspective: 900 },
        {
          translateX: interpolate(
            p,
            input,
            [-67, -6, 0, 4, 16],
            Extrapolation.CLAMP,
          ),
        },
        {
          translateY: interpolate(
            p,
            input,
            [-22, -2, 0, 2, 6],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            p,
            input,
            [10.5, 1.2, 1, 1.16, 2.35],
            Extrapolation.CLAMP,
          ),
        },
        {
          scaleX: interpolate(p, input, [1, 1, 1.08, 1, 1], Extrapolation.CLAMP),
        },
        {
          scaleY: interpolate(p, input, [1, 1, 0.89, 1, 1], Extrapolation.CLAMP),
        },
        {
          rotateX: `${interpolate(
            p,
            input,
            [-14, -4, 0, -3, -8],
            Extrapolation.CLAMP,
          )}deg`,
        },
        {
          rotateZ: `${interpolate(
            p,
            input,
            [-12, -3, 0, 2, 5],
            Extrapolation.CLAMP,
          )}deg`,
        },
      ],
    };
  });

  return (
    <Animated.View style={[styles.impact, impactStyle]} pointerEvents="none">
      <View style={styles.stampRotation}>
        <StampArtwork ink={ink} face={withAlpha(ink, 0.28)} solid />
      </View>
    </Animated.View>
  );
};

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
  stampReveal: {
    width: STAMP_WIDTH,
    height: STAMP_HEIGHT,
  },
  stampRotation: {
    width: STAMP_WIDTH,
    height: STAMP_HEIGHT,
    transform: [{ rotate: "-5deg" }],
  },
  stampArtwork: {
    width: STAMP_WIDTH,
    height: STAMP_HEIGHT,
  },
  stampArt: {
    ...StyleSheet.absoluteFillObject,
  },
  ticketCopy: {
    position: "absolute",
    top: 13,
    right: 8,
    bottom: 9,
    left: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  stampLine: {
    fontWeight: "800",
    textAlign: "center",
  },
  stampTop: {
    fontWeight: "700",
    letterSpacing: 4,
    paddingLeft: 4,
  },
  stampMatch: {
    fontWeight: "800",
    fontSize: 20,
    lineHeight: 22,
    letterSpacing: 2,
    paddingLeft: 2,
    marginTop: 2,
  },
  impact: {
    width: STAMP_WIDTH,
    height: STAMP_HEIGHT,
  },
});
