import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../PressableScale";
import PriceTag from "../PriceTag";
import {
  Text,
  Icon,
  icons,
  useTheme,
  withAlpha,
  spacing,
  space,
  radius,
  borderWidth,
} from "../../design-system";
import { REC_HERO_ACCENT } from "./RecHeroCard";
import type { OfferItem } from "../../api/users";

/**
 * One program in the Home carousel, in two tiers.
 *
 * WHY THE HIGHLIGHT IS COLOUR AND NOT SIZE. `Carousel` snaps on a single
 * uniform slide width, so a wider first slide would desync the snap from the
 * slide boundaries a little further with every swipe. Height is safer — the
 * content row stretches — but a taller first slide just leaves dead space under
 * its neighbours. So every slide shares `SLIDE_MIN_HEIGHT` and the top match is
 * marked by fill, ink and an eyebrow instead.
 *
 * The highlighted tier deliberately reuses `RecHeroCard`'s exact language — the
 * same `accent.info` fill, the same `accentOn` ink, the same dark-island CTA —
 * because that is the card this carousel replaces. The blue does not change for
 * anyone; it just moved into a deck.
 */

/** Shared by both tiers. Matches Home's `PromoCard` height so the row is even. */
export const SLIDE_MIN_HEIGHT = 260;

export interface OfferSlideProps {
  item: OfferItem;
  /** The vivid treatment, reserved for a top match that earned a reason. */
  highlight?: boolean;
  onPress: (item: OfferItem) => void;
}

const OfferSlide: React.FC<OfferSlideProps> = ({ item, highlight, onPress }) => {
  const { colors, scheme } = useTheme();
  const isDark = scheme === "dark";

  // Only ever rendered when the backend supplied one. `signalLevel: "none"`
  // never reaches here — `selectForYou` returns nothing in that state.
  const reason = item.match?.reason ?? null;

  if (highlight) {
    const fill = colors.accent[REC_HERO_ACCENT];
    const ink = colors.accentOn[REC_HERO_ACCENT];
    const islandBg = isDark ? colors.action.secondary : colors.surface.inverse;
    const islandInk = isDark ? colors.action.onSecondary : colors.text.primary;

    return (
      <PressableScale scaleTo={0.98} onPress={() => onPress(item)}>
        <View style={[styles.slide, styles.fill, { backgroundColor: fill }]}>
          <View
            style={[styles.blob, { backgroundColor: withAlpha(ink, 0.1) }]}
            pointerEvents="none"
          />

          <View style={styles.body}>
            <Text variant="label" color={ink}>
              TOP MATCH
            </Text>
            {/* h3, not h2: at slide width minus the peek, h2 wraps to three
                lines and swallows the card. */}
            <Text variant="h3" color={ink} style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {reason ? (
              <Text variant="bodySm" color={ink} numberOfLines={3}>
                {reason}
              </Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            <PriceTag
              priceInr={item.priceInr}
              anchorInr={item.anchorPriceInr}
              compact
              ink={ink}
            />
            <View style={[styles.cta, { backgroundColor: islandBg }]}>
              <Icon name={icons.chevronRight} size={18} color={islandInk} />
            </View>
          </View>
        </View>
      </PressableScale>
    );
  }

  return (
    <PressableScale scaleTo={0.98} onPress={() => onPress(item)}>
      <View
        style={[
          styles.slide,
          styles.plain,
          {
            backgroundColor: colors.surface.default,
            // Load-bearing on the paper scheme, where `surface.default` sits at
            // roughly 1.02:1 against the canvas and the card edge vanishes.
            borderColor: colors.border.default,
          },
        ]}
      >
        <View style={styles.body}>
          <Text variant="title" color="primary" numberOfLines={2}>
            {item.title}
          </Text>
          {reason ? (
            // Solid control surface + accent text. NOT accent text on an accent
            // tint, which the conventions call out at ~1.5:1.
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: colors.surface.control,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <Text variant="caption" color="accent" numberOfLines={2}>
                {reason}
              </Text>
            </View>
          ) : item.blurb ? (
            <Text variant="bodySm" color="secondary" numberOfLines={3}>
              {item.blurb}
            </Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <PriceTag priceInr={item.priceInr} anchorInr={item.anchorPriceInr} compact />
          <Icon name={icons.chevronRight} size={18} color={colors.text.tertiary} />
        </View>
      </View>
    </PressableScale>
  );
};

export default OfferSlide;

const styles = StyleSheet.create({
  slide: {
    minHeight: SLIDE_MIN_HEIGHT,
    borderRadius: radius.card,
    padding: spacing.xl,
    justifyContent: "space-between",
  },
  fill: {
    overflow: "hidden",
  },
  plain: {
    borderWidth: borderWidth.hairline,
  },
  blob: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  body: {
    gap: space.titleSub,
  },
  title: {
    marginTop: space.titleSub,
  },
  chip: {
    alignSelf: "flex-start",
    borderWidth: borderWidth.hairline,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  cta: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
  },
});
