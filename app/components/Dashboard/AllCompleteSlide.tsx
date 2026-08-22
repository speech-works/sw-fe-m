import React from "react";
import { StyleSheet, View } from "react-native";
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
 * The only slide with no action on it. There is nothing to do, and a button
 * that admits that would be worse than none.
 */
const AllCompleteSlide: React.FC = () => {
  const { colors } = useTheme();
  const ink = colors.accentOn.success;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.accent.success },
        accentEdge(colors, "success"),
      ]}
      accessible
      accessibilityRole="text"
      accessibilityLabel="Today's work is done. You have been through everything you own. Come back tomorrow."
    >
      <View style={styles.watermark} pointerEvents="none">
        <Icon name={icons.success} size={140} color={withAlpha(ink, 0.1)} />
      </View>

      <Text variant="h2" color={ink} center>
        Today&apos;s work is done
      </Text>
      <Text variant="body" color={ink} center style={styles.body}>
        You&apos;ve been through everything you own. Come back tomorrow.
      </Text>
    </View>
  );
};

export default AllCompleteSlide;

const styles = StyleSheet.create({
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
});
