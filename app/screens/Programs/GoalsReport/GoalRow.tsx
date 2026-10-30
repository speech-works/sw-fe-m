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
import { reportLabel, reportOptions } from "./labels";
import { PlannedDayPicker } from "./PlannedDayPicker";

/**
 * One goal, and the three answers it can get.
 *
 * ── THE THREE ARE THE SAME SIZE ────────────────────────────────────────────
 * Equal width, equal weight, no primary among them. A bigger "Did it" would be
 * the app saying which answer it wants, and the whole value of this screen is
 * that "not yet" is as easy to press as the other two. Somebody who quietly
 * lies here has given us nothing and learned nothing.
 *
 * ── THE EXAMPLE SITS INSIDE ITS BUTTON ─────────────────────────────────────
 * "Something smaller" means nothing on its own. Every program supplies its own
 * example ("like calling a shop instead"), and it is the button's second line.
 * It used to hang in a row of its own under the button, which read as a label
 * for the row below (founder, 2026-10-30). Inside, it can only belong to one
 * answer, and every button in a row grows to the same height.
 *
 * ── FOUR ANSWERS SIT TWO BY TWO ────────────────────────────────────────────
 * Art of Disclosure and Hard Conversations add "No need". Four across does not
 * fit "Something smaller" at phone width, so the four sit in two rows of two,
 * still all the same size.
 *
 * ── FIVE ANSWERS, AND A DAY ────────────────────────────────────────────────
 * The Art of Disclosure adds "Planned" (2026-10-29). Five sit two by two with
 * the last one alone at the same width. Picking "Planned" opens the day picker
 * under the buttons; the other answers stay one tap.
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
  const { colors } = useTheme();
  const options = reportOptions(goal.reportStyle);
  const rows: GoalReport[][] = [];
  if (options.length > 3) {
    for (let i = 0; i < options.length; i += 2) rows.push(options.slice(i, i + 2));
  } else {
    rows.push(options);
  }

  return (
    <View style={styles.root}>
      {/* Their own words, and the thing the three buttons below are about.
          `h3` is the app's section heading, which is what this is. */}
      <Text variant="h3" color="primary">
        {goal.text}
      </Text>

      {rows.map((row) => (
        <React.Fragment key={row.join("-")}>
          <View style={styles.row}>
            {row.map((option) => {
              const picked = selected === option;
              const label = reportLabel(goal.reportStyle, option);
              const example = option === "PARTIAL" ? smallerExample : "";
              return (
                <PressableScale
                  key={option}
                  style={styles.cell}
                  accessibilityRole="button"
                  accessibilityLabel={example ? `${label}, ${example}` : label}
                  accessibilityState={{ selected: picked }}
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
                    {/*
                      `bodySm`, not `label`. These three are the single most
                      important choice in the feature — the whole program waits on
                      them — and they were set at 13pt, smaller than the caption
                      under them. `title` is too heavy for a three-across row that
                      has to hold "Something smaller" on two lines, so this is the
                      step up that fits.
                    */}
                    <Text
                      variant="bodySm"
                      center
                      numberOfLines={2}
                      style={{
                        color: picked
                          ? colors.action.onPrimary
                          : colors.text.primary,
                      }}
                    >
                      {label}
                    </Text>
                    {example ? (
                      <Text
                        variant="caption"
                        center
                        numberOfLines={2}
                        style={{
                          color: picked
                            ? colors.action.onPrimary
                            : colors.text.secondary,
                        }}
                      >
                        {example}
                      </Text>
                    ) : null}
                  </View>
                </PressableScale>
              );
            })}
            {/* A lone last answer keeps the width of the others. */}
            {options.length > 3 && row.length === 1 ? <View style={styles.cell} /> : null}
          </View>

        </React.Fragment>
      ))}

      {selected === "PLANNED" && plannedFor && onPlannedFor ? (
        <PlannedDayPicker value={plannedFor} onChange={onPlannedFor} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  cell: { flex: 1 },
  button: {
    // Fills the cell, so a button beside the one with an example is as tall.
    flexGrow: 1,
    gap: spacing.xxs,
    // 64, not 56. The labels wrap to two lines at this width and the taller
    // text was crowding the padding.
    minHeight: 64,
    paddingHorizontal: spacing.sm,
    paddingVertical: space.inlineGap,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
  },
});
