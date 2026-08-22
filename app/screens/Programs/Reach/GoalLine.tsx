import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Icon,
  IconName,
  Text,
  icons,
  space,
  spacing,
  useTheme,
} from "../../../design-system";
import { ProgramGoal } from "../../../api/programGoals/types";
import { REPORT_LABELS } from "../GoalsReport/labels";

/** The date a goal closed, in the shortest form that is still unambiguous. */
const when = (iso: string | null): string | null => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/**
 * One goal, as it reads months later.
 *
 * ── THE MARK IS NOT A SCORE ────────────────────────────────────────────────
 * Three states, and only one of them is a tick: done, waiting, or answered and
 * finished for a reason that is not doing (a prediction). Nothing here adds up
 * to a percentage, and nothing is red. A goal they have not reached is not a
 * failed goal, it is a goal.
 */
export function GoalLine({ goal }: { goal: ProgramGoal }) {
  const { colors } = useTheme();

  const done = goal.answerType === "deed" && goal.report === "FULL";
  const closed = !!goal.closedAt;
  const date = when(goal.closedAt);

  const mark: { icon: IconName; color: string } = done
    ? { icon: icons.success, color: colors.accent.success }
    : closed
      ? { icon: icons.seen, color: colors.text.tertiary }
      : { icon: icons.waiting, color: colors.text.tertiary };

  return (
    <View style={styles.root}>
      <Icon name={mark.icon} size={18} color={mark.color} />
      <View style={styles.body}>
        <Text
          variant="body"
          color={done ? "primary" : "secondary"}
          style={styles.text}
        >
          {goal.text}
        </Text>
        {goal.report && (
          <Text variant="caption" color="tertiary">
            {REPORT_LABELS[goal.reportStyle][goal.report]}
            {date ? ` · ${date}` : ""}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.iconText,
    paddingVertical: spacing.sm,
  },
  body: { flex: 1, gap: 2 },
  text: { flex: 1 },
});

