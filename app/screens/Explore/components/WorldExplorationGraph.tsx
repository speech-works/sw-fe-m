import { useFocusEffect } from "@react-navigation/native";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  getDailyActivityStatsForTheWeek,
  getWeeklyReport,
} from "../../../api/progressReport";
import {
  FlowComparisonSummary,
  WeeklyReportResponse,
  WeeklyStat,
} from "../../../api/progressReport/types";
import { useUserStore } from "../../../stores/user";
import { getFlowBenchmarkCopy } from "../../../util/flowBenchmark";
import {
  useTheme,
  spacing,
  radius,
  fonts,
  Text,
  Icon,
  icons,
  AnimatedNumber,
  Skeleton,
} from "../../../design-system";

interface WorldExplorationGraphProps {
  onLayoutCapture?: (event: any) => void;
}

// Fixed square size for each day cell in the week-rhythm row.
const CELL_SIZE = 40;

const WorldExplorationGraph: React.FC<WorldExplorationGraphProps> = ({
  onLayoutCapture,
}) => {
  const { colors } = useTheme();

  const { user } = useUserStore();
  const [weeklyData, setWeeklyData] = useState<WeeklyStat[]>([]);
  const [weeklySummary, setWeeklySummary] =
    useState<WeeklyReportResponse["summary"] | null>(null);
  const [minutesComparison, setMinutesComparison] =
    useState<FlowComparisonSummary | null>(null);
  const [comparisonLabel, setComparisonLabel] = useState(
    "This week so far • benchmarked against last week",
  );
  const [loading, setLoading] = useState<boolean>(true);

  // Configuration
  const DAILY_TARGET_MINUTES = 10;

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const loadWeeklySnapshot = async () => {
        if (!user?.id) {
          if (!isActive) return;
          setWeeklyData([]);
          setWeeklySummary(null);
          setMinutesComparison(null);
          setComparisonLabel("This week so far • benchmarked against last week");
          setLoading(false);
          return;
        }

        if (!isActive) return;
        setLoading(true);

        const [dailyResult, weeklyResult] = await Promise.allSettled([
          getDailyActivityStatsForTheWeek(user.id),
          getWeeklyReport(user.id),
        ]);

        if (!isActive) {
          return;
        }

        if (dailyResult.status === "fulfilled") {
          setWeeklyData(dailyResult.value.days);
        } else {
          console.error("Explore daily stats error:", dailyResult.reason);
        }

        if (weeklyResult.status === "fulfilled") {
          setWeeklySummary(weeklyResult.value.summary);
          setMinutesComparison(weeklyResult.value.summary.practiceTimeComparison);
          setComparisonLabel(weeklyResult.value.comparisonLabel);
        } else {
          console.error("Explore weekly report error:", weeklyResult.reason);
        }

        setLoading(false);
      };

      void loadWeeklySnapshot();

      return () => {
        isActive = false;
      };
    }, [user?.id]),
  );

  // --- Metrics ---
  const fallbackWeeklyMinutes =
    Math.round(weeklyData.reduce((sum, d) => sum + d.totalTime, 0) * 10) / 10;
  const totalWeeklyMinutes =
    weeklySummary?.totalPracticeMinutes ?? fallbackWeeklyMinutes;
  const daysActive =
    weeklySummary?.totalDaysActive ??
    weeklyData.filter((d) => d.totalTime > 0).length;

  const minutesBenchmark = getFlowBenchmarkCopy(
    minutesComparison,
    "minutes",
    { compact: true },
  );
  const minutesBenchmarkSummary = useMemo(() => {
    if (!minutesBenchmark.secondary) {
      return minutesBenchmark.primary;
    }

    const compactSecondary = minutesBenchmark.secondary
      .replace(" of last week", "")
      .replace(" of last week's total", "");

    return `${minutesBenchmark.primary} • ${compactSecondary}`;
  }, [minutesBenchmark.primary, minutesBenchmark.secondary]);

  const totalPracticeSummary =
    totalWeeklyMinutes < 60
      ? Number.isInteger(totalWeeklyMinutes)
        ? `${totalWeeklyMinutes}m`
        : `${totalWeeklyMinutes.toFixed(1)}m`
      : `${(totalWeeklyMinutes / 60).toFixed(1)}h`;
  const comparisonSubtitle = useMemo(() => {
    const fallbackLabel = "Benchmarked against last week";

    if (!comparisonLabel) {
      return fallbackLabel;
    }

    const trimmedParts = comparisonLabel
      .split("•")
      .map((part) => part.trim())
      .filter(Boolean);

    const mostRelevantPart = trimmedParts[trimmedParts.length - 1];

    if (!mostRelevantPart) {
      return fallbackLabel;
    }

    return mostRelevantPart.charAt(0).toUpperCase() + mostRelevantPart.slice(1);
  }, [comparisonLabel]);
  // Empty State Detection
  const hasAnyActivity = totalWeeklyMinutes > 0;

  // Rhythm Data
  const rhythmData = useMemo(() => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const dataMap = new Map();
    weeklyData.forEach((d) => {
      // Keep revived Date objects in local-calendar space so midnight dates
      // don't slide back to the previous UTC day.
      const dateStr =
        typeof d.date === "string" ? d.date.split("T")[0] : format(d.date, "yyyy-MM-dd");
      dataMap.set(dateStr, d.totalTime);
    });

    return Array.from({ length: 7 }).map((_, index) => {
      const dayDate = addDays(startOfCurrentWeek, index);
      const dateKey = format(dayDate, "yyyy-MM-dd");
      return {
        dayLabel: format(dayDate, "EEEEE"),
        minutes: dataMap.get(dateKey) || 0,
        isToday: isSameDay(dayDate, today),
      };
    });
  }, [weeklyData]);

  const maxMinutes = Math.max(
    ...rhythmData.map((d) => d.minutes),
    DAILY_TARGET_MINUTES * 1.3,
  );

  return (
    <View
      onLayout={(event) => {
        if (onLayoutCapture) onLayoutCapture(event);
      }}
      accessible={true}
      accessibilityLabel={`Weekly progress: ${totalWeeklyMinutes} minutes practiced across ${daysActive} days this week`}
    >
      {/* Header — sits directly on the page (no card container) */}
      <View style={styles.header}>
        <Text variant="h3" color="primary">This Week</Text>
        <Text variant="caption" color="secondary" numberOfLines={1} ellipsizeMode="tail">
          {comparisonSubtitle}
        </Text>
      </View>

      {/* Week rhythm — a compact strip of day cells, lit for days you practiced. */}
      {!hasAnyActivity ? (
        <View style={styles.emptyState}>
          <Icon name={icons.weekly} size={36} color={colors.text.secondary} />
          <Text variant="bodySm" color="secondary" center style={styles.emptyText}>
            No practice yet this week — start today to build your rhythm.
          </Text>
        </View>
      ) : (
        <View style={styles.rhythmRow}>
          {loading ? (
            Array.from({ length: 7 }).map((_, i) => (
              <View key={i} style={styles.dayCol}>
                <Skeleton width={CELL_SIZE} height={CELL_SIZE} radius={radius.md} />
              </View>
            ))
          ) : (
            rhythmData.map((d, index) => {
              const hasData = d.minutes > 0;
              // Busier days glow brighter; the floor keeps even a light day clearly lit.
              const intensity = 0.6 + 0.4 * Math.min(1, d.minutes / maxMinutes);

              return (
                <View key={index} style={styles.dayCol}>
                  {/* One cell per day — lit orange for days you practiced, quiet grey for rest days. */}
                  <View
                    style={[
                      styles.cell,
                      hasData
                        ? { backgroundColor: colors.gamification.streak, opacity: intensity }
                        : { backgroundColor: colors.surface.control },
                    ]}
                  />
                  {/* Day label — today sits inside a small rounded accent chip. */}
                  <View style={styles.dayLabelRow}>
                    {d.isToday ? (
                      <View style={[styles.todayChip, { backgroundColor: colors.action.primary }]}>
                        <Text variant="caption" color={colors.action.onPrimary} style={styles.todayLabel}>
                          {d.dayLabel}
                        </Text>
                      </View>
                    ) : (
                      <Text variant="caption" color={colors.text.tertiary}>{d.dayLabel}</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* Summary stat cards below the chart */}
      <View style={styles.statRow}>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <AnimatedNumber value={daysActive} variant="h2" color="primary" />
          <View style={styles.statLabelRow}>
            <View style={[styles.statDot, { backgroundColor: colors.action.primary }]} />
            <Text variant="caption" color="secondary">
              {`active ${daysActive === 1 ? "day" : "days"}`}
            </Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface.default }]}>
          <Text variant="h2" color="primary">{totalPracticeSummary}</Text>
          <View style={styles.statLabelRow}>
            <View style={[styles.statDot, { backgroundColor: colors.action.primary }]} />
            <Text variant="caption" color="secondary" numberOfLines={1} style={styles.statLabel}>
              {minutesBenchmarkSummary}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default React.memo(WorldExplorationGraph);

const styles = StyleSheet.create({
  header: {
    gap: spacing.xxs,
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["3xl"],
    gap: spacing.sm,
  },
  emptyText: {
    paddingHorizontal: spacing.xl,
  },
  // Week-rhythm row — one cell per day, floats directly on the page (no container)
  rhythmRow: {
    flexDirection: "row",
    width: "100%",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  // One day cell — lit for a practiced day, quiet grey for a rest day.
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radius.md,
  },
  dayLabelRow: {
    height: 28,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  // Today's letter sits inside a small rounded accent chip.
  todayChip: {
    minWidth: 26,
    height: 24,
    paddingHorizontal: spacing.xxs,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  todayLabel: {
    fontFamily: fonts.bold,
  },
  // Stat cards below the chart
  statRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  statLabel: {
    flex: 1,
  },
});
