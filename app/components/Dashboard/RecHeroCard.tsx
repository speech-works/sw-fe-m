import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import PressableScale from "../PressableScale";
import {
  Text,
  Icon,
  icons,
  useTheme,
  withAlpha,
  spacing,
  space,
  radius,
} from "../../design-system";

/**
 * The Home recommendation hero — a flat, solid vivid-accent banner in the same
 * language as the Home `PromoCard` (profile / mood nudges): a single
 * `colors.accent` fill, AA-correct `accentOn` dark ink, an eyebrow + `h2` title,
 * subtle ink-circle texture, and a solid dark-island CTA. No gradient, no
 * illustration — sleek and content-first, so the matched-program showcase reads
 * as one family with the other Home cards rather than a different tier.
 *
 * One vibrant treatment shared by both CTA states — the matched-program
 * showcase and the neutral "browse programs" fallback. The MATCH just fills the
 * same shell with more inside it (a reason, a price).
 *
 * The accent is `REC_HERO_ACCENT` (a cool blue — deliberately distinct from the
 * warm brand orange and from the gold/purple sibling promos). Callers that place
 * a node on the fill (the price) read the same `accentOn[REC_HERO_ACCENT]` ink
 * from this one source, so the on-fill ink can never drift from the fill.
 */

/** The vivid DS accent this hero fills with. Its dark ink is `accentOn[REC_HERO_ACCENT]`. */
export const REC_HERO_ACCENT = "info" as const;

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
  const { colors, scheme } = useTheme();
  const isDark = scheme === "dark";
  const fill = colors.accent[REC_HERO_ACCENT];
  const ink = colors.accentOn[REC_HERO_ACCENT];
  // Primary action = a solid dark island on the bright fill (pure inverse surface
  // in light mode). Mirrors PromoCard so the two CTAs are visually identical.
  const islandBg = isDark ? colors.action.secondary : colors.surface.inverse;
  const islandInk = isDark ? colors.action.onSecondary : colors.text.primary;

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} style={[styles.card, style]}>
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
          {subtitle ? (
            <Text variant="body" color={ink}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Footer — price on the leading edge, dark-island CTA trailing (CTA sits
            alone at the leading edge when there is no price). */}
        <View style={styles.footer}>
          {priceNode ? <View>{priceNode}</View> : null}
          <View style={[styles.cta, { backgroundColor: islandBg }]}>
            <Text variant="title" color={islandInk}>
              {ctaLabel}
            </Text>
            <Icon name={icons.chevronRight} size={18} color={islandInk} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
};

export default RecHeroCard;

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
    borderRadius: 75,
  },
  blobB: {
    position: "absolute",
    bottom: -20,
    right: 40,
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  title: {
    marginTop: space.titleSub,
    marginBottom: space.titleSub,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
