import React from "react";
import { StyleSheet, View } from "react-native";
import { ChoiceList, Text, spacing } from "../../../design-system";
import { GoalReport, ProgramGoal } from "../../../api/programGoals/types";
import { reportLabel, reportOptions } from "./labels";
import { PlannedDayPicker } from "./PlannedDayPicker";

/**
 * One goal, and the answers it can get.
 *
 * ── A LIST OF ROUND BUTTONS (founder, 2026-11-05) ──────────────────────────
 * The answers were three buttons side by side, and "Partly, like it happened,
 * but smaller" was cut off mid-word. One answer per goal, so each answer is a
 * full-width row with a round button (ChoiceList). All rows are the same
 * size, so no answer looks like the one the app wants, and "not yet" is as
 * easy to pick as the others.
 *
 * "Something smaller" means nothing on its own, so the program's own example
 * ("like calling a shop instead") is that row's second line.
 *
 * Picking "Planned" (Art of Disclosure) opens the day picker under the list.
 */
export function GoalRow({
  goal,
  smallerExample,
  selected,
  onSelect,
  plannedFor,
  onPlannedFor,
}: {
  goal: ProgramGoal;
  smallerExample: string;
  selected: GoalReport | null;
  onSelect: (report: GoalReport) => void;
  /** The day under "Planned". Only read when "Planned" is selected. */
  plannedFor?: string;
  onPlannedFor?: (day: string) => void;
}) {
  const options = reportOptions(goal.reportStyle).map((option) => ({
    key: option,
    label: reportLabel(goal.reportStyle, option),
    hint: option === "PARTIAL" ? smallerExample : undefined,
  }));

  return (
    <View style={styles.root}>
      {/* Their own words, and the thing the answers below are about. */}
      <Text variant="h3" color="primary">
        {goal.text}
      </Text>

      <ChoiceList
        options={options}
        selected={selected ? [selected] : []}
        onToggle={(key) => onSelect(key as GoalReport)}
        accessibilityPrefix={goal.text}
      />

      {selected === "PLANNED" && plannedFor && onPlannedFor ? (
        <PlannedDayPicker value={plannedFor} onChange={onPlannedFor} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
});
