import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { GoalsBlockContent, GoalsBlockGoal } from "../../../api/packs/types";
import {
  reorderProgramGoals,
  updateProgramGoal,
} from "../../../api/programGoals";
import { GoalReport } from "../../../api/programGoals/types";
import {
  Chip,
  IconButton,
  Text,
  icons,
  makeStyles,
  size,
  space,
  spacing,
} from "../../../design-system";
import {
  REPORT_LABELS,
  REPORT_ORDER,
} from "../../../screens/Programs/GoalsReport/labels";

/**
 * The list the user named at intake, shown inside a day.
 *
 * Plain rows: a rank number, the goal in their own words, and the answer they
 * have given so far, if any. Nothing here is scored or praised; the row shows
 * what they said and lets them change it. Reordering and reporting both write
 * to the server and update the list on the phone at once, reverting only if
 * the request fails.
 *
 * Counts as complete the moment it renders, the same as a TEXT block.
 */
interface GoalsBlockProps {
  content: GoalsBlockContent;
  packId?: string;
}

const EMPTY_COPY = "You did not name any when you started. That is fine.";

const byRank = (goals: GoalsBlockGoal[]) =>
  [...goals].sort((a, b) => a.rank - b.rank);

const isReport = (value: string | null): value is GoalReport =>
  value === "FULL" || value === "PARTIAL" || value === "NONE";

export const GoalsBlock: React.FC<GoalsBlockProps> = ({ content, packId }) => {
  const styles = useStyles();
  const [goals, setGoals] = useState<GoalsBlockGoal[]>(() =>
    byRank(content.goals ?? []),
  );
  const [busy, setBusy] = useState(false);

  // A re-hydrated block (the day reloaded) wins over whatever is held here.
  useEffect(() => {
    setGoals(byRank(content.goals ?? []));
  }, [content.goals]);

  const allowReorder = Boolean(content.allowReorder) && Boolean(packId);
  const allowReport = Boolean(content.allowReport);

  const move = async (index: number, direction: -1 | 1) => {
    if (!packId || busy) return;
    const target = index + direction;
    if (target < 0 || target >= goals.length) return;

    const previous = goals;
    const next = [...goals];
    [next[index], next[target]] = [next[target], next[index]];
    const reranked = next.map((g, i) => ({ ...g, rank: i + 1 }));

    setGoals(reranked);
    setBusy(true);
    try {
      await reorderProgramGoals(
        packId,
        reranked.map((g) => g.id),
      );
    } catch {
      setGoals(previous);
    } finally {
      setBusy(false);
    }
  };

  const report = async (goal: GoalsBlockGoal, answer: GoalReport) => {
    if (busy) return;
    // Tapping the answer already given clears it, as the daily log's chips do.
    // The server refuses the clear once the program has closed, and the revert
    // below puts the answer back in that case.
    const nextReport: GoalReport | null =
      goal.report === answer ? null : answer;
    const previous = goals;
    setGoals((current) =>
      current.map((g) => (g.id === goal.id ? { ...g, report: nextReport } : g)),
    );
    setBusy(true);
    try {
      await updateProgramGoal(goal.id, nextReport);
    } catch {
      setGoals(previous);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.block}>
      {content.prompt ? (
        <Text variant="body" color="primary">
          {content.prompt}
        </Text>
      ) : null}

      {goals.length === 0 ? (
        <Text variant="body" color="secondary">
          {EMPTY_COPY}
        </Text>
      ) : (
        <View style={styles.list}>
          {goals.map((goal, index) => {
            const labels = REPORT_LABELS[goal.reportStyle];
            const reportLabel =
              labels && isReport(goal.report) ? labels[goal.report] : null;

            return (
              <View key={goal.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text variant="title" color="tertiary" style={styles.rank}>
                    {index + 1}
                  </Text>
                  <View style={styles.rowText}>
                    <Text variant="body" color="primary">
                      {goal.text}
                    </Text>
                    {allowReport && labels ? (
                      <View style={styles.chips}>
                        {REPORT_ORDER.map((answer) => (
                          <Chip
                            key={answer}
                            label={labels[answer]}
                            selected={goal.report === answer}
                            onPress={() => report(goal, answer)}
                          />
                        ))}
                      </View>
                    ) : reportLabel ? (
                      <Text variant="bodySm" color="secondary">
                        {reportLabel}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {allowReorder ? (
                  <View style={styles.controls}>
                    {index > 0 ? (
                      <IconButton
                        name={icons.chevronUp}
                        variant="ghost"
                        size={size.iconLg}
                        onPress={() => move(index, -1)}
                        accessibilityLabel="Move up"
                      />
                    ) : (
                      <View style={styles.controlSpacer} />
                    )}
                    {index < goals.length - 1 ? (
                      <IconButton
                        name={icons.chevronDown}
                        variant="ghost"
                        size={size.iconLg}
                        onPress={() => move(index, 1)}
                        accessibilityLabel="Move down"
                      />
                    ) : (
                      <View style={styles.controlSpacer} />
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const useStyles = makeStyles((c) => ({
  // Sits on the canvas like a TEXT block, not in a card: it is reading
  // material with a couple of controls, not a step to start.
  block: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
    gap: space.groupGap,
  },
  list: {
    gap: space.rowGap,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.inlineGap,
    paddingBottom: space.rowGap,
    borderBottomWidth: 1,
    borderBottomColor: c.border.hairline,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.iconText,
  },
  rank: {
    width: size.icon,
    textAlign: "right",
  },
  rowText: {
    flex: 1,
    gap: space.inlineGap,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.inlineGap,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
  },
  controlSpacer: {
    width: size.iconLg,
    height: size.iconLg,
  },
}));
