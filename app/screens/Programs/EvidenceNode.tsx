import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../components/PressableScale";
import {
  Icon,
  icons,
  size,
  spacing,
  Text,
  useTheme,
} from "../../design-system";

/**
 * The one link out to a program's research, in the pre-purchase sales flow.
 *
 * WHY BEFORE THE PURCHASE AND NOT AFTER. A buyer weighing ₹999 is the only
 * reader who has a use for this. Somebody who already owns the program has the
 * honesty in front of them every day, inside the teaching. Sited after the
 * sale, the screen answers a question nobody is still asking.
 *
 * WHY IT IS HERE AND NOT INSIDE A DAY. The obvious place for a source is next
 * to the claim it supports, and that was the first design. Three of this
 * product's own rules say no: one thing per day, ten minutes a day, and under
 * 4% of people are still opening the app at day 15. Anything extra on a
 * teaching screen costs more than it gives. Most of these papers are also
 * paywalled, so a tap that lands on a payment page costs more trust than it
 * builds.
 *
 * The honesty is already in the teaching copy, where it is free and needs no
 * tap: "338 listeners rated ten things", "no trial with a comparison group
 * behind it", "measured on students rather than on daters". This is proof for
 * the minority who want to check, sited where nobody is mid-task.
 *
 * WHY A NODE AND NOT A CARD. It used to be a bordered card under the timeline:
 * an icon, a label, a chevron, a second box competing with the buy button.
 * Now it is the last stop on the arc's own rail, drawn by `PlanPage` with a
 * dashed marker in place of a day number. The question comes after day 7 the
 * way it comes to a reader: once they have seen the whole plan. This file is
 * only the row's text; the rail belongs to the page.
 *
 * THE WORDING IS DELIBERATE. It is the question the reader is already asking,
 * printed back at them, then what the program rests on, as a count.
 *
 * FOUNDER DECISION 2026-09-22: do not downplay the content. This line used to
 * add "including the shaky one" whenever any source was graded weak. That
 * named the weakest source before a buyer had read a word, and a grade on a
 * source read as a verdict on the program. The sheet now describes each
 * source in its own words; this node states the count and nothing else.
 */
export default function EvidenceNode({
  claimCount,
  onPress,
}: {
  /** From ProgramEvidenceSummary.claimCount. Never hardcode it: it differs per program. */
  claimCount: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  const studies = claimCount === 1 ? "one study" : `${claimCount} studies`;
  const body = `Rests on ${studies}.`;

  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Is this based on anything? ${body}`}
      accessibilityHint="Opens the research behind this program"
    >
      <Text variant="title" color="primary">
        Is this based on anything?
      </Text>
      <Text variant="bodySm" color="secondary" style={styles.body}>
        {body}
      </Text>
      <View style={styles.link}>
        <Text variant="label" color="link">
          Read them
        </Text>
        <Icon
          name={icons.chevronRight}
          size={size.iconSm}
          color={colors.text.link}
        />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: spacing.xs,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
});
