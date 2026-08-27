import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../PressableScale";
import { SLIDE_CARD_HEIGHT } from "./OfferSlide";
import {
  borderWidth,
  Icon,
  icons,
  radius,
  size,
  space,
  spacing,
  Text,
  useTheme,
} from "../../design-system";

/**
 * The last slide of the For-you carousel: the way into the full catalogue.
 *
 * It exists because the way out used to be a text link UNDER the paging dots,
 * at the lowest point of the section, which is both the least looked-at spot on
 * the shelf and 48pt of Home's fold spent on a link. Here the exit sits at the
 * end of the swipe people are already doing, and it costs nothing extra.
 *
 * IT DELIBERATELY COUNTS NOTHING. An earlier draft said "12 more programs",
 * which is a claim about the catalogue that this component cannot check: the
 * number comes from what the shop had at fetch time, and a person who owns some
 * of them would be told a figure that is wrong for them. "More programs" is
 * true whenever the tile is rendered at all, which is the only bar worth
 * clearing on a shelf that is careful about what it claims.
 *
 * RECESSED, NOT RAISED. The programs beside it are the offer; this is the door.
 * `surface.inset` steps DOWN from the card surface in both schemes, so the tile
 * reads as part of the rail rather than as a fourth thing to buy.
 */
export interface MoreProgramsTileProps {
  onPress: () => void;
  /**
   * `more` follows slides the shelf has already shown. `all` is the whole
   * catalogue, for when it showed none.
   *
   * The words matter more than they look. "More programs" and "the other
   * situations" are both claims about what came before the tile, and after a
   * shelf with nothing on it they are simply false: there is no "more" and no
   * "other". The same tile in that position has to say what it is actually a
   * door to.
   */
  variant?: "more" | "all";
}

const COPY = {
  more: {
    title: "More programs",
    subtitle: "Plans for the other situations",
    cta: "See more",
    label: "See more programs",
  },
  all: {
    title: "All programs",
    subtitle: "Guided plans, one situation each",
    cta: "Browse all",
    label: "Browse all programs",
  },
} as const;

const MoreProgramsTile: React.FC<MoreProgramsTileProps> = ({
  onPress,
  variant = "more",
}) => {
  const { colors } = useTheme();
  const copy = COPY[variant];

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={copy.label}
      style={styles.press}
    >
      <View
        style={[
          styles.tile,
          {
            backgroundColor: colors.surface.inset,
            borderColor: colors.border.default,
          },
        ]}
      >
        {/* `journey` (a stack of layers) is this app's word for a PROGRAM: it
            marks the "See inside" CTA on every card beside this one and the
            open CTA on the Programs screen. A stack of them over the words
            "More programs" therefore says the same noun the title does.

            Explicitly NOT `icons.explore`. That grid is the Explore tab's own
            glyph in the tab bar, and the "All" filter on both Programs and
            Library, so on a content tile it reads as a place to navigate to
            rather than as the thing being offered. */}
        <Icon
          name={icons.journey}
          size={size.icon}
          color={colors.text.tertiary}
        />

        <View style={styles.copy}>
          <Text variant="h3" color="primary" center>
            {copy.title}
          </Text>
          <Text variant="bodySm" color="secondary" center>
            {copy.subtitle}
          </Text>
        </View>

        {/* The standard slide's CTA recipe, to the point: same fill, same
            border, same pill. A different-looking button on the same rail would
            read as a different KIND of action. */}
        <View
          style={[
            styles.cta,
            {
              backgroundColor: colors.surface.control,
              borderColor: colors.border.strong,
            },
          ]}
        >
          <Text variant="title" color="primary">
            {copy.cta}
          </Text>
          <Icon
            name={icons.chevronRight}
            size={size.iconSm}
            color={colors.text.primary}
          />
        </View>
      </View>
    </PressableScale>
  );
};

export default MoreProgramsTile;

const styles = StyleSheet.create({
  // Same reasoning as InProgressSlide's `press`: `tile`'s own `flex: 1` has
  // nothing to grow into unless the Pressable around it stretches too.
  press: { flex: 1 },
  tile: {
    // Was a fixed height, which made this the one slide that could not stretch
    // with the rest of the row. Floor plus flex, same as OfferSlide.
    flex: 1,
    minHeight: SLIDE_CARD_HEIGHT,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
    alignItems: "center",
    justifyContent: "center",
    gap: space.rowGap,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing["2xl"],
  },
  copy: {
    gap: space.titleSub,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.hairline,
    marginTop: spacing.xs,
  },
});
