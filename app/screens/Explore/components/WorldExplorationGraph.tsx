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

// Fixed ghost-bar heights for the loading skeleton (no Math.random — stable across renders).
const SKELETON_HEIGHTS = [56, 92, 44, 104, 72, 84, 52];
const BAR_WIDTH = 14;
// Shortest visible value fill (% of track) so a low-activity day reads as a real
// capsule rising from the bottom, never a flat dot.
const MIN_BAR_PERCENT = 22;

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

      {/* Chart — floats on the dark page: faint track capsules + bright orange fills. */}
      {!hasAnyActivity ? (
        <View style={styles.emptyState}>
          <Icon name={icons.weekly} size={36} color={colors.text.secondary} />
          <Text variant="bodySm" color="secondary" center style={styles.emptyText}>
            No practice yet this week — start today to build your rhythm.
          </Text>
        </View>
      ) : (
        <View style={styles.chartRow}>
          {loading ? (
            SKELETON_HEIGHTS.map((h, i) => (
              <Skeleton key={i} width={BAR_WIDTH} height={h} radius={radius.full} />
            ))
          ) : (
            rhythmData.map((d, index) => {
              const actualPercent = Math.min(100, (d.minutes / maxMinutes) * 100);
              const barHeight = Math.max(actualPercent, MIN_BAR_PERCENT);

              return (
                <View key={index} style={styles.barColumn}>
                  {/* Faint full-height track + a bright orange fill rising from the bottom. */}
                  <View style={[styles.track, { backgroundColor: colors.surface.control }]}>
                    <View
                      style={[
                        styles.fill,
                        { height: `${barHeight}%`, backgroundColor: colors.action.primary },
                      ]}
                    />
                  </View>
                  <View style={styles.dayLabelRow}>
                    <Text
                      variant="caption"
                      color={d.isToday ? colors.action.primary : colors.text.tertiary}
                      style={d.isToday ? styles.todayLabel : undefined}
                    >
                      {d.dayLabel}
                    </Text>
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
  // Chart — floats directly on the page (no container)
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-end",
    height: 160,
    width: "100%",
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  barColumn: {
    flex: 1,
    height: "100%", // definite height so the fills' % heights resolve consistently
    alignItems: "center",
    maxWidth: 44,
  },
  // Faint full-height track capsule (the "slot").
  track: {
    width: BAR_WIDTH,
    flex: 1,
    borderRadius: radius.full,
    justifyContent: "flex-end",
    marginBottom: spacing.sm,
  },
  // Bright value capsule rising from the bottom of the track.
  fill: {
    width: "100%",
    borderRadius: radius.full,
  },
  dayLabelRow: {
    height: 22,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  // Today is distinguished by weight + accent colour.
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
