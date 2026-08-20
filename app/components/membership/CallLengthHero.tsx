import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import {
  Text,
  Icon,
  icons,
  radius,
  size,
  spacing,
  useTheme,
  useMotion,
  duration,
  easing,
  withAlpha,
} from "../../design-system";
import { CALL_LENGTH_FIGURE } from "../../services/membershipOffer";

/**
 * ===========================================================================
 * 3 → 10
 * ---------------------------------------------------------------------------
 * The single strongest fact about membership, given the space it deserves.
 *
 * ── WHY A FIGURE AND NOT A SENTENCE ────────────────────────────────────────
 * Everything else on a paywall is a claim the reader has to take on trust.
 * This is an arithmetic they can check against their own experience: they have
 * felt a call end at three minutes. Two numbers and an arrow say more than the
 * paragraph that used to be here, and they say it before the thumb moves.
 *
 * ── THE MOTION, AND WHY IT IS ALLOWED ──────────────────────────────────────
 * This screen is seen a handful of times per user, ever. That is the frequency
 * band where a deliberate reveal is worth its cost, and the same motion on
 * something opened daily would be an irritation instead.
 *
 * The reveal has one job: make the reader look at the "10" LAST. The "3" and
 * the arrow are already settled when the "10" arrives, so the eye lands on the
 * number we are selling rather than averaging the pair. Hence the two delays,
 * and hence the arrow travelling rather than fading: an arrow that slides
 * left-to-right is direction, an arrow that fades is decoration.
 *
 * Transform and opacity only, so it runs off the main thread while the offers
 * request is still in flight. Nothing here animates layout.
 *
 * ── REDUCED MOTION ─────────────────────────────────────────────────────────
 * The whole thing appears at once, at full opacity, with no transform. The
 * emphasis is carried by size and colour, which do not move. Reduced motion
 * must never mean "the important number does not arrive".
 * ===========================================================================
 */

/** Arrow travel, in points. Small on purpose: it reads as a nudge, not a swipe. */
const ARROW_TRAVEL = 10;

export interface CallLengthHeroProps {
  /**
   * Draw the gold frame around the figure. True on a surface that needs the
   * figure to read as a distinct object (the sheet, where it sits among rows);
   * false on the paywall's first page, where the figure IS the page and a
   * frame would make the hero look like one more card.
   */
  framed?: boolean;
  /** Left-align instead of centring. Right whenever the page is left-aligned. */
  align?: "center" | "left";
}

export const CallLengthHero: React.FC<CallLengthHeroProps> = ({
  framed = true,
  align = "center",
}) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  // One shared value per part, so each can carry its own delay. A single
  // progress value would force all three to share an easing curve, and the
  // point of the piece is that they do NOT arrive together.
  const from = useSharedValue(reduced ? 1 : 0);
  const arrow = useSharedValue(reduced ? 1 : 0);
  const to = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      from.value = 1;
      arrow.value = 1;
      to.value = 1;
      return;
    }
    const rise = { duration: duration.reveal, easing: easing.out };
    from.value = withTiming(1, rise);
    arrow.value = withDelay(90, withTiming(1, rise));
    to.value = withDelay(190, withTiming(1, rise));
  // The three shared values are stable for the component's lifetime, so this
  // runs once. Listing them keeps the lint rule honest rather than silenced.
  }, [reduced, from, arrow, to]);

  const fromStyle = useAnimatedStyle(() => ({
    opacity: from.value,
    // 0.94 rather than 0: nothing in the world appears from nothing, and a
    // number that grows from a point reads as a notification badge.
    transform: [{ scale: 0.94 + from.value * 0.06 }],
  }));

  const arrowStyle = useAnimatedStyle(() => ({
    opacity: arrow.value,
    transform: [{ translateX: -ARROW_TRAVEL + arrow.value * ARROW_TRAVEL }],
  }));

  const toStyle = useAnimatedStyle(() => ({
    opacity: to.value,
    transform: [{ scale: 0.94 + to.value * 0.06 }],
  }));

  return (
    <View
      style={[
        styles.frame,
        align === "left" && styles.left,
        framed && {
          backgroundColor: withAlpha(colors.premium.gold, 0.06),
          borderColor: withAlpha(colors.premium.gold, 0.22),
          borderWidth: 1,
          paddingVertical: spacing.lg,
          paddingHorizontal: spacing.md,
        },
      ]}
    >
      <View style={styles.figure}>
        {/* The "before" is deliberately quieter than the "after". Same size, so
            the comparison stays honest, but tertiary so it does not compete. */}
        <Animated.View style={fromStyle}>
          <Text variant="poster" color="tertiary">
            {CALL_LENGTH_FIGURE.from}
          </Text>
        </Animated.View>

        <Animated.View style={arrowStyle}>
          <Icon
            name={icons.forward}
            size={size.icon}
            color={withAlpha(colors.premium.gold, 0.7)}
          />
        </Animated.View>

        <Animated.View style={toStyle}>
          <Text variant="poster" color={colors.premium.gold}>
            {CALL_LENGTH_FIGURE.to}
          </Text>
        </Animated.View>
      </View>

      <Text variant="eyebrow" color="tertiary" center={align === "center"}>
        {CALL_LENGTH_FIGURE.unit}
      </Text>
    </View>
  );
};

export default CallLengthHero;

const styles = StyleSheet.create({
  frame: {
    borderRadius: radius.card,
    alignItems: "center",
    gap: spacing.xs,
  },
  left: { alignItems: "flex-start" },
  figure: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
});
