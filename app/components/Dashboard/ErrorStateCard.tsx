import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated from "react-native-reanimated";

import PressableScale from "../PressableScale";
import {
  size,
  Text,
  Icon,
  icons,
  useTheme,
  useMotion,
  withAlpha,
  spacing,
  space,
  radius,
} from "../../design-system";

interface ErrorStateCardProps {
  /** ALL-CAPS eyebrow — the family's "what kind of card is this" slot. */
  eyebrow?: string;
  title?: string;
  message?: string;
  onRetry: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The failed-to-load card (reports, trends, recommendations).
 *
 * Built on the Home card recipe shared by `PromoCard` and `RecHeroCard`: one
 * solid `colors.accent` fill, AA-correct `accentOn` ink, two ink-circle blobs
 * for texture, a left-aligned eyebrow → `h2` title → `body` message, and a
 * solid dark-island CTA pill. Same padding, same radius, same press feedback —
 * so a load failure reads as one of Home's cards rather than a different tier.
 *
 * `danger` is the one accent slot the other Home cards leave free (success,
 * warning, purple and info are taken), so the hue does double duty: it says
 * "problem" while still sitting in the family.
 *
 * The old bespoke shape — flat header band, convex hill, a pulsing ripple motif
 * and a brand-orange `Button` — is gone. Nothing else on Home is centered,
 * two-tone or illustrated, and the two ambient loops (a 4s drift and a 2.6s
 * ripple) ran forever behind a card that carries no meaning in its motion.
 */
const ErrorStateCard: React.FC<ErrorStateCardProps> = ({
  eyebrow = "COULDN'T LOAD",
  title = "Uh oh.",
  message = "Something weird happened. Keep calm and try again.",
  onRetry,
  style,
}) => {
  const { colors, scheme } = useTheme();
  const motion = useMotion();
  const isDark = scheme === "dark";

  const fill = colors.accent.danger;
  const ink = colors.accentOn.danger;
  // Primary action = a solid dark island on the bright fill (pure inverse surface
  // in light mode). Identical to PromoCard/RecHeroCard so the three CTAs match.
  const islandBg = isDark ? colors.action.secondary : colors.surface.inverse;
  const islandInk = isDark ? colors.action.onSecondary : colors.text.primary;

  return (
    // The card swaps in where a spinner just was, so it fades up rather than
    // popping. Reduced-motion degrades it to opacity-only via `useMotion`.
    <Animated.View entering={motion.enter()} style={style}>
      <PressableScale
        scaleTo={0.98}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={`${title} ${message} Try again.`}
        style={styles.card}
      >
        <View style={[styles.fill, { backgroundColor: fill }]}>
          {/* Subtle ink-circle texture (the Explore/PromoCard pattern) — depth without art. */}
          <View
            style={[styles.blobA, { backgroundColor: withAlpha(ink, 0.1) }]}
            pointerEvents="none"
          />
          <View
            style={[styles.blobB, { backgroundColor: withAlpha(ink, 0.1) }]}
            pointerEvents="none"
          />

          {/* Message */}
          <View>
            <Text variant="label" color={ink}>
              {eyebrow}
            </Text>
            <Text variant="h2" color={ink} style={styles.title}>
              {title}
            </Text>
            <Text variant="body" color={ink}>
              {message}
            </Text>
          </View>

          {/* Footer — dark-island CTA at the leading edge. The whole card is the
              tap target; the pill is the affordance, as on the sibling cards. */}
          <View style={styles.footer}>
            <View style={[styles.cta, { backgroundColor: islandBg }]}>
              <Icon name={icons.refresh} size={size.iconInline} color={islandInk} />
              <Text variant="title" color={islandInk}>
                Try again
              </Text>
            </View>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
  },
  fill: {
    borderRadius: radius.card,
    overflow: "hidden",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
  },
  blobA: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: radius.full,
  },
  blobB: {
    position: "absolute",
    bottom: -20,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: radius.full,
  },
  title: {
    marginTop: space.titleSub,
    marginBottom: space.titleSub,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xl,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
});

export default React.memo(ErrorStateCard);
