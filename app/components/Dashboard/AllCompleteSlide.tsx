import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../PressableScale";
import {
  Icon,
  Text,
  accentEdge,
  icons,
  radius,
  space,
  spacing,
  useTheme,
  withAlpha,
} from "../../design-system";
import { SLIDE_CARD_HEIGHT } from "./OfferSlide";
import { CTA_ICON, ctaIsland } from "./RecHeroCard";
import { allFinishedTitle } from "../../util/packs/forYouShelf";

/**
 * THEY OWN EVERYTHING AND HAVE BEEN THROUGH IT.
 *
 * Lifted out of SmartRecommendationCard along with the in-progress card. It is
 * a real state and it has nowhere else to live: somebody who has finished
 * everything they own has no active program AND nothing left to recommend, so
 * without this the shelf would have rendered nothing and Home would have had a
 * hole exactly where a card belongs. That hole is the reason the old card's
 * `ALL_COMPLETE` branch stopped checking for a top pick.
 *
 * It used to be the only slide with no action, and it told them to come back
 * tomorrow. Somebody who has finished every program can start any of them
 * again, so it now says that and opens the Programs list.
 */
export interface AllCompleteSlideProps {
  /** How many programs they own, or null when the offers fetch failed. */
  count: number | null;
  onPress: () => void;
}

export const ALL_COMPLETE_BODY =
  "Go back to any day that helped you. New programs show up here as they come out.";
export const ALL_COMPLETE_CTA = "See programs";

const AllCompleteSlide: React.FC<AllCompleteSlideProps> = ({
  count,
  onPress,
}) => {
  const { colors, scheme } = useTheme();
  const ink = colors.accentOn.success;
  const { islandBg, islandInk } = ctaIsland(colors, scheme === "dark", "success");
  const title = allFinishedTitle(count);

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title} ${ALL_COMPLETE_BODY} ${ALL_COMPLETE_CTA}.`}
      style={styles.press}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.accent.success },
          accentEdge(colors, "success"),
        ]}
      >
        <View style={styles.watermark} pointerEvents="none">
          <Icon name={icons.success} size={140} color={withAlpha(ink, 0.1)} />
        </View>

        <Text variant="h2" color={ink} center>
          {title}
        </Text>
        <Text variant="body" color={ink} center style={styles.body}>
          {ALL_COMPLETE_BODY}
        </Text>
        {/* Same button as the owner card and "See inside": icon first, title
            weight, no chevron (founder, 2026-11-07). */}
        <View style={[styles.cta, { backgroundColor: islandBg }]}>
          <Icon name={icons.journey} size={CTA_ICON} color={islandInk} />
          <Text variant="title" style={{ color: islandInk }}>
            {ALL_COMPLETE_CTA}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
};

export default AllCompleteSlide;

const styles = StyleSheet.create({
  press: { flex: 1 },
  card: {
    // Floor plus flex, the same rule every other slide follows, so a row that
    // ever contains this and something taller stays level.
    flex: 1,
    minHeight: SLIDE_CARD_HEIGHT,
    borderRadius: radius.card,
    padding: space.cardPad,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  watermark: { position: "absolute", right: -28, bottom: -28 },
  body: { marginTop: spacing.sm },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: spacing.lg,
  },
});
