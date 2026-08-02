import React, { useEffect } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing as REasing,
} from "react-native-reanimated";
import FA5Icon from "react-native-vector-icons/FontAwesome5";
import { useMotion, useTheme, withAlpha } from "../../design-system";
import { callerGlyph } from "../../util/callerGlyph";
import { StageBlobs } from "./StageBlobs";

/**
 * The call illustration: one soft field, one object on it.
 *
 * IT IS THE WELCOME STAGE, EMPTIED. Same blob, same drift, same silhouette —
 * because this sits in the middle of that sequence, and the composition holding
 * still is what makes it read as the next page rather than a different app.
 * What it does NOT keep is everything else that stage carries: no chips, no
 * second blob, no badge.
 *
 * ── ONE ACCENT ──────────────────────────────────────────────────────────────
 * The version this replaces had a peach blob, a pink medallion, a purple glyph,
 * a saturated purple chip and an orange button — four hues at similar
 * saturation, so nothing anchored and the loudest thing on the screen was the
 * chip, which mattered least.
 *
 * Now the ONLY saturated thing on the screen is the call to action. The
 * medallion is a plain raised disc carrying the brand hue in its glyph, so it
 * reads as an object sitting on the wash rather than as a second button
 * competing with the real one. A single focal point is most of what separates a
 * minimal screen from an empty one.
 *
 * ── ONE MOTION ──────────────────────────────────────────────────────────────
 * A slow ring leaving the disc, and nothing else. Not decoration: a pulse is
 * universal shorthand for a phone about to go off, so it carries the word
 * "incoming" the copy would otherwise spend a line on. The welcome stage keeps
 * exactly one ambient motion for the same reason — one living thing in a still
 * frame reads as alive, four read as busy.
 *
 * Decorative by a11y: the copy underneath says all of it in words, so the whole
 * stage is hidden rather than read out as disconnected fragments.
 */

/** Same derivation as WelcomeStage's `sizes`, so the two silhouettes match. */
const MIN_BLOB = 150;

const sizes = (width: number, available: number) => {
  const blob = Math.max(MIN_BLOB, Math.min(width * 0.82, available / 1.14));
  return {
    blob,
    // A circle reads bigger than an irregular figure at the same width, so it
    // sits tighter inside the blob than the 0.62 the character uses.
    medallion: blob * 0.46,
    stageHeight: blob * 1.14,
  };
};

/** The ring cadence, matching the incoming-call screen the answer leads to. */
const RING_PERIOD_MS = 2200;

const CallerStage: React.FC<{
  available: number;
  /** FontAwesome5 glyph, the same vocabulary the calling widget renders. */
  icon: string;
  /** Suppresses the pulse. Off wherever the call is not actually imminent —
   *  spending the "incoming" signal early costs it its meaning later. */
  pulsing?: boolean;
}> = ({ available, icon, pulsing = true }) => {
  const { colors, elevation } = useTheme();
  const { reduced } = useMotion();
  const { width } = useWindowDimensions();
  const s = sizes(width, available);

  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced || !pulsing) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: REasing.out(REasing.quad) }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: RING_PERIOD_MS - 1400 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [reduced, pulsing, pulse]);

  // Softer than the incoming-call screen's ring on purpose: there, the pulse is
  // the event; here it is an undertone beneath a headline, and at full strength
  // it pulled the eye off the words.
  const ring = useAnimatedStyle(() => ({
    opacity: pulse.value === 0 ? 0 : (1 - pulse.value) * 0.22,
    transform: [{ scale: 1 + pulse.value * 0.5 }],
  }));

  return (
    <View
      style={[styles.stage, { height: s.stageHeight }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <StageBlobs size={s.blob} layers={1} />

      {!reduced && pulsing && (
        <Animated.View
          style={[
            styles.ring,
            {
              height: s.medallion,
              width: s.medallion,
              borderRadius: s.medallion / 2,
              backgroundColor: colors.action.primary,
            },
            ring,
          ]}
          pointerEvents="none"
        />
      )}

      <View
        style={[
          styles.medallion,
          elevation.e2,
          {
            height: s.medallion,
            width: s.medallion,
            borderRadius: s.medallion / 2,
            backgroundColor: colors.surface.elevated,
            // A hairline in the brand hue rather than the border token: at 8%
            // it is invisible as a line and reads only as the disc having an
            // edge — which is what stops it dissolving into the wash behind it.
            borderColor: withAlpha(colors.action.primary, 0.08),
          },
        ]}
      >
        <FA5Icon
          solid
          name={callerGlyph(icon)}
          size={s.medallion * 0.34}
          color={colors.action.primary}
        />
      </View>
    </View>
  );
};

export default CallerStage;

const styles = StyleSheet.create({
  stage: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
  },
  medallion: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
