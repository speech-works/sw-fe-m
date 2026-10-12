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
 *
 * ── FOUR ANSWERS SIT TWO BY TWO ────────────────────────────────────────────
 * Art of Disclosure and Hard Conversations add "No need". Four across does not
 * fit "Something smaller" at phone width, so the four sit in two rows of two,
 * still all the same size, and the grey line sits under "Something smaller".
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
  const options = reportOptions(goal.reportStyle);
  const rows: GoalReport[][] =
    options.length > 3 ? [options.slice(0, 2), options.slice(2)] : [options];

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
                      {reportLabel(goal.reportStyle, option)}
                    </Text>
                  </View>
                </PressableScale>
              );
            })}
          </View>

          {row.includes("PARTIAL") ? (
            <View style={styles.row}>
              {row.map((option) => (
                <View key={option} style={styles.cell}>
                  {option === "PARTIAL" ? (
                    <Text variant="caption" color="tertiary" center>
                      {smallerExample}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm },
  cell: { flex: 1 },
  button: {
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
