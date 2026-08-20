import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Text,
  radius,
  spacing,
  useTheme,
  useMotion,
  duration,
  easing,
  withAlpha,
} from "../../design-system";

/**
 * ===========================================================================
 * MONTHLY OR YEARLY, SIDE BY SIDE
 * ---------------------------------------------------------------------------
 * Replaces two full-width radio cards stacked vertically.
 *
 * ── WHY SIDE BY SIDE ───────────────────────────────────────────────────────
 * A price choice is a COMPARISON, and stacked cards are not compared, they are
 * read in order. Putting them shoulder to shoulder is what makes the yearly
 * per-month figure do its job: it only means anything next to the monthly one.
 * The old layout also pushed the CTA a full screen down, so a reader had to
 * scroll past both cards before finding out they could buy.
 *
 * ── THE PER-MONTH FIGURE IS THE HEADLINE, THE REAL CHARGE IS UNDER IT ──────
 * Yearly leads with its per-month equivalent because that is the number people
 * compare. That framing is only honest if the amount actually charged is right
 * there too, in the same currency, which is what the third line is. One
 * without the other is the trick; both together is the comparison.
 *
 * ── THE MOTION ─────────────────────────────────────────────────────────────
 * Selection animates COLOUR ONLY, 200ms. Not size, not layout. A pill that
 * grows when picked shoves its neighbour, and the reader's eye chases the
 * movement instead of reading the price they just chose. Press feedback is a
 * scale on the pressed pill, which is the one place motion belongs here.
 * ===========================================================================
 */

export interface PlanPillProps {
  /** e.g. "Monthly" */
  title: string;
  /** The big figure, e.g. "₹199" or "₹125". */
  price: string;
  /** Small suffix on the figure, e.g. "/mo". Omit for none. */
  priceSuffix?: string;
  /** The line under it, e.g. "₹1,499 billed once". Omit for none. */
  footnote?: string;
  /** e.g. "SAVE 37%". Rendered as a tag on the pill. Omit for none. */
  tag?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  /**
   * The unselected fill. Defaults to the app's warm elevated surface, which is
   * right on the ink canvas and wrong anywhere else: on the paywall's slate
   * page the default read as a brown card sitting on navy. A caller whose
   * ground is not the canvas passes its own family here.
   */
  surface?: string;
}

const PlanPill: React.FC<PlanPillProps> = ({
  title,
  price,
  priceSuffix,
  footnote,
  tag,
  selected,
  onPress,
  disabled,
  surface,
}) => {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  const gold = colors.premium.gold;

  // Driven from the `selected` prop rather than from the press, so a tap on the
  // OTHER pill deselects this one with the same transition it selected with.
  const progress = useDerivedValue(() =>
    reduced ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, {
      duration: duration.base,
      easing: easing.out,
    }),
  );

  // Resolved on the JS thread, ON PURPOSE. `withAlpha` is a plain function, so
  // calling it inside the worklet below throws "tried to synchronously call a
  // non-worklet function on the UI thread" the moment the pill mounts. The
  // interpolation itself is the only thing that belongs on the UI thread.
  const restBorder = colors.border.hairline;
  const restFill = surface ?? colors.surface.elevated;
  const onBorder = withAlpha(gold, 0.55);
  const onFill = withAlpha(gold, 0.1);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(progress.value, [0, 1], [restBorder, onBorder]),
    backgroundColor: interpolateColor(progress.value, [0, 1], [restFill, onFill]),
  }));

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      accessibilityLabel={`${title}, ${price}${priceSuffix ?? ""}${footnote ? `, ${footnote}` : ""}`}
      style={styles.pressable}
    >
      {({ pressed }) => (
        <Animated.View
          style={[
            styles.pill,
            animatedStyle,
            // Press feedback goes on the pill itself rather than through
            // PressableScale, because the pill has to own its border colour
            // animation and nesting two animated wrappers to get both is worse
            // than the two lines it costs.
            pressed && !reduced && { transform: [{ scale: 0.97 }] },
          ]}
        >
          <View style={styles.pillHead}>
            <Text variant="label" color={selected ? gold : colors.text.tertiary}>
              {title}
            </Text>
            {tag ? (
              <View style={[styles.tag, { backgroundColor: withAlpha(gold, 0.16) }]}>
                <Text variant="caption" color={gold} style={styles.tagText}>
                  {tag}
                </Text>
              </View>
            ) : null}
          </View>

          <Text variant="h3" color="primary">
            {price}
            {priceSuffix ? (
              <Text variant="caption" color="tertiary">
                {priceSuffix}
              </Text>
            ) : null}
          </Text>

          {/* Always rendered, even when empty, so the two pills stay the same
              height. A pill that is shorter than its neighbour reads as the
              lesser option before a word of it has been read. */}
          <Text variant="caption" color="tertiary" numberOfLines={1}>
            {footnote ?? " "}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
};

export interface PlanPillsProps {
  children: React.ReactNode;
}

/** The row. Two pills, equal width. */
export const PlanPills: React.FC<PlanPillsProps> & { Pill: typeof PlanPill } = ({
  children,
}) => <View style={styles.row} accessibilityRole="radiogroup">{children}</View>;

PlanPills.Pill = PlanPill;

export default PlanPills;

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  pressable: { flex: 1 },
  pill: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  pillHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tag: {
    borderRadius: radius.xs,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, letterSpacing: 0.4 },
});
