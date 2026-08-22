import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../components/PressableScale";
import {
  Text,
  haptics,
  primaryEdge,
  radius,
  space,
  spacing,
  useTheme,
} from "../../../design-system";
import { GoalReport, ProgramGoal } from "../../../api/programGoals/types";
import { REPORT_LABELS, REPORT_ORDER } from "./labels";

/**
 * One goal, and the three answers it can get.
 *
 * ── THE THREE ARE THE SAME SIZE ────────────────────────────────────────────
 * Equal width, equal weight, no primary among them. A bigger "Did it" would be
 * the app saying which answer it wants, and the whole value of this screen is
 * that "not yet" is as easy to press as the other two. Somebody who quietly
 * lies here has given us nothing and learned nothing.
 *
 * ── THE GREY LINE SITS UNDER THE MIDDLE ────────────────────────────────────
 * "Something smaller" means nothing on its own. Every program supplies its own
 * example ("like calling a shop instead"), and it goes under the button it
 * explains rather than under the row, so there is no guessing which one it is
 * about. That is why the second row exists with two empty cells.
 */
export function GoalRow({
  goal,
  smallerExample,
  selected,
  onSelect,
}: {
  goal: ProgramGoal;
  smallerExample: string;
  selected: GoalReport | null;
  onSelect: (report: GoalReport) => void;
}) {
  const { colors } = useTheme();
  const labels = REPORT_LABELS[goal.reportStyle];

  return (
    <View style={styles.root}>
      <Text variant="title" color="primary">
        {goal.text}
      </Text>

      <View style={styles.row}>
        {REPORT_ORDER.map((option) => {
          const picked = selected === option;
          return (
            <PressableScale
              key={option}
              style={styles.cell}
              onPress={() => {
                haptics.light();
                onSelect(option);
              }}
            >
              <View
                style={[
                  styles.button,
                  {
                    backgroundColor: picked
                      ? colors.action.primary
                      : colors.surface.control,
                  },
                  // Only the picked one is a bright fill. On paper it has
                  // almost no lightness gap to sit against.
                  picked ? primaryEdge(colors) : null,
                ]}
              >
                <Text
                  variant="label"
                  center
                  numberOfLines={2}
                  style={{
                    color: picked
                      ? colors.action.onPrimary
                      : colors.text.secondary,
                  }}
                >
                  {labels[option]}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.row}>
        <View style={styles.cell} />
        <View style={styles.cell}>
          <Text variant="caption" color="tertiary" center>
            {smallerExample}
          </Text>
        </View>
        <View style={styles.cell} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  cell: { flex: 1 },
  button: {
    minHeight: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: space.inlineGap,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
  },
});
