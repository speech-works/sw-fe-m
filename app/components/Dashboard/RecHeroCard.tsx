import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import PressableScale from "../PressableScale";
import {
  Gradient,
  Text,
  Icon,
  icons,
  useTheme,
  easing,
  spacing,
  space,
  radius,
  withAlpha,
} from "../../design-system";

/**
 * The rich hero shell for the Home recommendation card.
 *
 * One vibrant treatment shared by both orange CTA states — the matched-program
 * showcase and the neutral "browse programs" fallback — so the card always
 * reads as premium and the two never look like different tiers of the app. The
 * MATCH just fills the same shell with more inside it (a reason, a price).
 *
 * Vividness comes from the design system, not one-off styling: a `brand`
 * gradient fill, a `sheen` gloss over the top, and a large brand glyph that
 * drifts on a slow ambient loop. Everything on the bright fill is dark ink
 * (`action.onPrimary`) per the dark-on-bright AA rule, and the float is gated
 * on reduced motion (static, opacity kept — never zeroed).
 */

/** Ambient drift period (ms). Deliberately slow — this is atmosphere, not UI. */
const FLOAT_PERIOD = 3200;

export interface RecHeroCardProps {
  /** ALL-CAPS eyebrow — "MATCHED TO YOU" / "PROGRAMS". */
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  /** CTA pill label. */
  ctaLabel: string;
  /** Optional node shown at the footer's leading edge (e.g. a PriceTag). */
  priceNode?: React.ReactNode;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const RecHeroCard: React.FC<RecHeroCardProps> = ({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  priceNode,
  onPress,
  style,
}) => {
  const { colors } = useTheme();
  const ink = colors.action.onPrimary;
  const reduceMotion = useReducedMotion();
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    // Symmetric breathing drift, mirrored (withRepeat reverse) so it eases at
    // both ends — the same ambient-loop recipe as PulseDot / the avatar float.
    drift.value = withRepeat(
      withTiming(1, { duration: FLOAT_PERIOD, easing: easing.loop }),
      -1,
      true,
    );
    return () => cancelAnimation(drift);
  }, [reduceMotion, drift]);

  const watermarkStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -7 + drift.value * 14 },
      { rotate: `${-15 + drift.value * 6}deg` },
    ],
  }));

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      style={[styles.container, { shadowColor: colors.shadow }, style]}
    >
      <Gradient token="brand" style={StyleSheet.absoluteFill} pointerEvents="none" />
      {/* Glossy top highlight — reads as depth/elevation on the flat fill. */}
      <Gradient
        token="sheen"
        style={styles.sheen}
        pointerEvents="none"
      />

      <Animated.View
        style={[styles.watermark, watermarkStyle]}
        pointerEvents="none"
      >
        <Icon name={icons.roadmap} size={190} color={withAlpha(ink, 0.12)} />
      </Animated.View>

      <View style={styles.content}>
        <Text variant="label" color={ink}>
          {eyebrow}
        </Text>
        <Text variant="h2" color={ink}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" color={ink} style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}

        <View style={styles.footer}>
          {priceNode ? <View>{priceNode}</View> : null}
          <View
            style={[
              styles.cta,
              { borderColor: ink, backgroundColor: withAlpha(ink, 0.08) },
              !priceNode && styles.ctaSolo,
            ]}
          >
            <Text variant="title" color={ink}>
              {ctaLabel}
            </Text>
            <Icon name={icons.chevronRight} size={18} color={ink} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

export default RecHeroCard;

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  watermark: {
    position: "absolute",
    top: -30,
    right: -46,
  },
  content: {
    padding: spacing.xl,
    gap: space.inlineGap,
  },
  subtitle: {
    marginTop: space.titleSub,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  ctaSolo: {
    alignSelf: "flex-start",
  },
});
