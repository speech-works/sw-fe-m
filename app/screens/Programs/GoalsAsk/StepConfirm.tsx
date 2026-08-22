import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Icon,
  Text,
  icons,
  primaryEdge,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../design-system";
import { GoalHarness } from "../../../api/programGoals/types";
import { ASK_COPY, countWord } from "./copy";

/**
 * STEP 3: what they just committed to, and what we will do with it.
 *
 * ── THE VERB APPEARS HERE FOR THE FIRST TIME ───────────────────────────────
 * Step 1 collected "the landlord". This screen shows "Call the landlord",
 * because naming three people and telling three people are different things and
 * the user should see which one they have signed up for before day 1 starts.
 *
 * A PREDICTION has no verb wrapper: "they will finish my word" is already a
 * whole sentence, and "Do they will finish my word" is not English.
 */
export function StepConfirm({
  harness,
  goals,
}: {
  harness: GoalHarness;
  /** Nouns in the user's chosen order. */
  goals: string[];
}) {
  const { colors } = useTheme();
  const compose = (noun: string) => harness.verb.replace("{}", noun);

  return (
    <View style={styles.root}>
      <Text variant="h2" color="primary">
        Your {countWord(goals.length)}
      </Text>

      <View style={styles.list}>
        {goals.map((noun, i) => (
          <View
            key={i}
            style={[styles.row, { backgroundColor: colors.surface.control }]}
          >
            <View
              style={[
                styles.number,
                { backgroundColor: colors.action.primary },
                // An orange disc on the neutral ground. On paper it has almost
                // no lightness gap to sit against, so it needs the edge.
                primaryEdge(colors),
              ]}
            >
              <Text
                variant="label"
                style={{ color: colors.action.onPrimary }}
              >
                {i + 1}
              </Text>
            </View>
            <Text variant="body" color="primary" style={styles.text}>
              {compose(noun)}
            </Text>
          </View>
        ))}
      </View>

      <View style={[styles.note, { backgroundColor: colors.surface.control }]}>
        <Icon name={icons.reminder} size={18} color={colors.text.secondary} />
        <Text variant="bodySm" color="secondary" style={styles.text}>
          {ASK_COPY.confirm.promise(harness.answerType)}
        </Text>
      </View>

      <View style={styles.privacy}>
        <Icon name={icons.locked} size={14} color={colors.text.tertiary} />
        <Text variant="caption" color="tertiary">
          {ASK_COPY.confirm.privacy}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  list: { gap: space.rowGap },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    padding: space.cardPad,
    borderRadius: radius.input,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.inlineGap,
    padding: space.cardPad,
    borderRadius: radius.input,
    marginTop: spacing.sm,
  },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    justifyContent: "center",
  },
});
