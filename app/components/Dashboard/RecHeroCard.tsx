import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import PressableScale from "../PressableScale";
import {
  Text,
  Icon,
  icons,
  useTheme,
  withAlpha,
  bestForeground,
  onColor,
  accentEdge,
  spacing,
  space,
  radius,
} from "../../design-system";
import type { IconName, SemanticColors } from "../../design-system";

/**
 * The app's vivid banner — a flat, solid accent card in the same language as the
 * Home `PromoCard` (profile / mood nudges): a single `colors.accent` fill,
 * AA-correct `accentOn` dark ink, an eyebrow + `h2` title, subtle ink-circle
 * texture, and a solid dark-island CTA. No gradient, no illustration — sleek and
 * content-first, so it reads as one family with the other cards around it rather
 * than a different tier.
 *
 * One vibrant treatment, several jobs: the matched-program showcase, the neutral
 * "browse programs" fallback, and the shop's "answer a few questions" prompt.
 * Each just fills the same shell with more or less inside it (a reason, a price).
 *
 * `accentKey` defaults to `REC_HERO_ACCENT` (a cool blue — deliberately distinct
 * from the warm brand orange and from the gold/purple sibling promos). Callers
 * that place a node on the fill (the price) read the same `accentOn` ink from
 * this one source, so the on-fill ink can never drift from the fill.
 */

/** The vivid DS accent this hero fills with by default. Its dark ink is `accentOn[REC_HERO_ACCENT]`. */
export const REC_HERO_ACCENT = "info" as const;

/**
 * Glyph size inside a CTA island — 14, beside the 16px `title` label. Taken from
 * `PromoCard`'s "▶ Check In" pill, which is the shape every CTA island in the app
 * now copies. It lives here beside `REC_HERO_ACCENT` because this file is where
 * the vivid-card language is defined; PromoCard predates it and still spells the
 * number out inline.
 */
export const CTA_ICON = 14;

export interface RecHeroCardProps {
  /** ALL-CAPS eyebrow — "MATCHED TO YOU" / "PROGRAMS". */
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  /** CTA pill label. */
  ctaLabel: string;
  /**
   * Glyph on the CTA's LEADING edge — the `PromoCard` "▶ Check In" shape. Pass a
   * key off the `icons` registry that names what pressing it does; the default
   * says "a pack/journey", which is what these banners open.
   */
  ctaIcon?: IconName;
  /** Optional node shown at the footer's leading edge (e.g. a PriceTag). */
  priceNode?: React.ReactNode;
  /**
   * Which vivid accent to fill with. Defaults to `REC_HERO_ACCENT`. Use a
   * different one when this banner sits beside another that already owns the
   * default — two vivid cards in the same hue read as the same offer twice.
   */
  accentKey?: keyof SemanticColors["accent"];
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const RecHeroCard: React.FC<RecHeroCardProps> = ({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaIcon = icons.journey,
  priceNode,
  accentKey = REC_HERO_ACCENT,
  onPress,
  style,
}) => {
  const { colors, scheme } = useTheme();
  const isDark = scheme === "dark";
  const fill = colors.accent[accentKey];
  const ink = colors.accentOn[accentKey];
  // Primary action = a solid dark island on the bright fill. Mirrors PromoCard
  // so the two CTAs are visually identical.
  //
  // The island has to read as a SHAPE against the fill, not merely hold legible
  // text — so it is chosen by measurement, not by scheme. The old flat "pure
  // white in light mode" only worked because this card was locked to one
  // mid-tone blue; white on a PALE accent is about 1.2:1 and the button simply
  // dissolves into the card. `bestForeground` picks whichever candidate actually
  // contrasts with THIS fill, which on a pale accent is its own dark ink.
  const islandBg = isDark
    ? colors.action.secondary
    : bestForeground(fill, [colors.surface.inverse, ink]);
  const islandInk = isDark ? colors.action.onSecondary : onColor(islandBg, colors);

  return (
    <PressableScale scaleTo={0.98} onPress={onPress} style={[styles.card, style]}>
      {/* `accentEdge` is "transparent" on ink, where the fill already sits
          5–15:1 above the canvas and draws its own shape. On paper the same
          fill is 1.1–3.0:1: the HUE reads perfectly, but the card's edge does
          not, so a full-bleed accent card bleeds into the page. */}
      <View style={[styles.fill, { backgroundColor: fill }, accentEdge(colors, accentKey)]}>
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
          {/* Icon LEADS the label, at PromoCard's exact glyph size — the CTA
              islands across the app are one shape, and a trailing chevron on
              a card that is itself the tap target only said "pressable" twice. */}
          <View style={[styles.cta, { backgroundColor: islandBg }]}>
            <Icon name={ctaIcon} size={CTA_ICON} color={islandInk} />
            <Text variant="title" color={islandInk}>
              {ctaLabel}
            </Text>
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
