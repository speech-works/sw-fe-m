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
import {
  Text,
  radius,
  spacing,
  useMotion,
  useTheme,
} from "../../design-system";
import { StageBlobs } from "./WelcomeStage";

/**
 * The call-offer illustration: somebody about to ring, on the same drifting
 * colour field the welcome and teaser screens stand on.
 *
 * IT IS THE WELCOME STAGE WITH A DIFFERENT PERSON ON IT. Same blob, same
 * drift, same bubble language — because this is the third screen of one
 * sequence and the composition holding still is what makes it read as the next
 * page rather than a different app. What changes is who is standing there: the
 * first two screens show the reader's own character, and this one shows
 * somebody else, which is the entire point of the screen.
 *
 * ONE AMBIENT MOTION, and it means something. The welcome stage keeps exactly
 * one (the character's breath) on the principle that one living thing in a
 * still frame reads as alive while four read as busy. Here that one is a slow
 * ring expanding out of the medallion — not decoration, but the only thing on
 * the screen that says INCOMING. A pulse is the universal shorthand for a
 * phone about to go off, so it carries meaning the copy would otherwise have
 * to spend a line on.
 *
 * Decorative by a11y, like its sibling: every word of it is said in the copy
 * underneath, so the whole stage is hidden rather than read out as a pile of
 * disconnected fragments.
 */

/** Same derivation as WelcomeStage's `sizes`, so the two silhouettes match. */
const MIN_BLOB = 150;

const sizes = (width: number, available: number) => {
  const blob = Math.max(MIN_BLOB, Math.min(width * 0.82, available / 1.14));
  return {
    blob,
    // The medallion is a circle where the welcome stage puts a character, and
    // a circle reads bigger than an irregular figure at the same width — so it
    // sits a little tighter than the 0.62 used there.
    medallion: blob * 0.52,
    stageHeight: blob * 1.14,
  };
};

/** The ring cadence, matching the incoming-call screen the answer leads to. */
const RING_PERIOD_MS = 2200;

const CallerStage: React.FC<{
  available: number;
  /** FontAwesome5 glyph, the same vocabulary the calling widget renders. */
  icon: string;
  /** What the call is about, in the reader's own words. Omitted when we were
   *  told nothing to route on — a bubble with no content is worse than none. */
  about?: string | null;
}> = ({ available, icon, about }) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();
  const { width } = useWindowDimensions();
  const s = sizes(width, available);

  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
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
  }, [reduced, pulse]);

  const ring = useAnimatedStyle(() => ({
    opacity: pulse.value === 0 ? 0 : (1 - pulse.value) * 0.4,
    transform: [{ scale: 1 + pulse.value * 0.55 }],
  }));

  return (
    <View
      style={[styles.stage, { height: s.stageHeight }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <StageBlobs size={s.blob} />

      {!reduced && (
        <Animated.View
          style={[
            styles.ring,
            {
              height: s.medallion,
              width: s.medallion,
              borderRadius: s.medallion / 2,
              backgroundColor: colors.accent.purple,
            },
            ring,
          ]}
          pointerEvents="none"
        />
      )}

      <View
        style={[
          styles.medallion,
          {
            height: s.medallion,
            width: s.medallion,
            borderRadius: s.medallion / 2,
            backgroundColor: colors.accentTint.purple,
          },
        ]}
      >
        <FA5Icon
          solid
          name={icon || "user"}
          size={s.medallion * 0.38}
          color={colors.accentText.purple}
        />
      </View>

      {/* One bubble, not three. The welcome stage uses three because it is
          showing a LIST; this screen is about a single call, and the bubble
          exists to name what it is about — the reader's own answer, echoed
          back one screen later. */}
      {about ? (
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: colors.accent.purple,
              top: s.stageHeight * 0.74,
            },
          ]}
        >
          <Text variant="caption" color={colors.accentOn.purple}>
            {about}
          </Text>
        </View>
      ) : null}
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
  },
  bubble: {
    position: "absolute",
    maxWidth: "78%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});
