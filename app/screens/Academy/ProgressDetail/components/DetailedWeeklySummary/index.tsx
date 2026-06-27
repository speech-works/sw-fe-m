import { addDays, format, startOfWeek } from "date-fns";
import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { getLevelStage, LevelStage } from "../../../../../api/users";
import { WeeklyReportResponse } from "../../../../../api/progressReport/types";
import {
  useTheme,
  spacing,
  radius,
  size,
  fonts,
  Text,
  Skeleton,
} from "../../../../../design-system";
import { getFlowBenchmarkCopy } from "../../../../../util/flowBenchmark";

const MAX_ACTIVE_DAYS_PER_WEEK = 7;
const BAR_TRACK_HEIGHT = 72;

const toLocalChartDate = (value: string | Date) => {
  if (value instanceof Date) return value;
  const normalized = value.includes("T") ? value.split("T")[0] : value;
  return new Date(`${normalized}T00:00:00`);
};

export const WeeklySummarySkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      <View style={styles.skeletonBody}>
        <View style={styles.headerRow}>
          <View style={styles.skeletonHeaderText}>
            <Skeleton width={120} height={12} />
            <Skeleton width={180} height={16} />
          </View>
          <Skeleton width={20} height={20} />
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statBadge, { backgroundColor: colors.surface.default }]}>
            <Skeleton width={"50%"} height={32} />
            <Skeleton width={"80%"} height={14} />
            <Skeleton width={"100%"} height={12} />
          </View>
          <View style={[styles.statBadge, { backgroundColor: colors.surface.default }]}>
            <Skeleton width={"50%"} height={32} />
            <Skeleton width={"80%"} height={14} />
            <Skeleton width={"100%"} height={12} />
          </View>
        </View>
      </View>
    </View>
  );
};

type DetailedWeeklySummaryProps = {
  summary: WeeklyReportResponse["summary"] | null;
  loading?: boolean;
  hasError?: boolean;
};

const DetailedWeeklySummary = ({
  summary: weeklyData,
  loading = false,
  hasError = false,
}: DetailedWeeklySummaryProps) => {
  const { colors } = useTheme();
  const accent = colors.gamification.streak; // brand orange = activity/streak
  const [levelStage, setLevelStage] = React.useState<LevelStage | null>(null);

  React.useEffect(() => {
    const fetchStage = async () => {
      try {
        setLevelStage(await getLevelStage());
      } catch (err) {
        console.error("Failed to fetch level stage:", err);
      }
    };
    fetchStage();
  }, []);

  const getWeekRangeLabel = () => {
    if (weeklyData?.weekStartDate && weeklyData?.weekEndDate) {
      return `${format(toLocalChartDate(weeklyData.weekStartDate), "MMM d")} – ${format(
        toLocalChartDate(weeklyData.weekEndDate),
        "MMM d",
      )}`;
    }
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return `${format(start, "MMM d")} – ${format(addDays(start, 6), "MMM d")}`;
  };

  const practiceBenchmark = getFlowBenchmarkCopy(
    weeklyData?.practiceTimeComparison,
    "minutes",
    { compact: true },
  );
  const daysBenchmark = getFlowBenchmarkCopy(
    weeklyData?.daysActiveComparison,
    "days",
    { compact: true },
  );

  const dataWeeksAvailable = weeklyData?.dataWeeksAvailable ?? 0;
  const historicalActiveDays = weeklyData?.historicalActiveDays ?? [];
  const showRhythm = dataWeeksAvailable >= 1 && historicalActiveDays.length > 0;
  const latest = historicalActiveDays[historicalActiveDays.length - 1];
  const latestDays = latest
    ? Math.max(0, Math.min(MAX_ACTIVE_DAYS_PER_WEEK, latest.daysActive))
    : 0;

  if (loading && !weeklyData) {
    return <WeeklySummarySkeleton />;
  }
  if (!weeklyData) {
    return null;
  }

  const hasStats =
    weeklyData.totalPracticeMinutes > 0 || weeklyData.totalDaysActive > 0;

  const trendColor =
    daysBenchmark.primary === "Matched last week"
      ? colors.text.tertiary
      : daysBenchmark.isAhead
        ? colors.feedback.successText
        : colors.feedback.dangerText;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text variant="label" color="tertiary" style={styles.eyebrow}>
            {levelStage?.title || "WEEKLY SUMMARY"}
          </Text>
          <Text variant="h3">{getWeekRangeLabel()}</Text>
        </View>
        <View style={styles.headerRight}>
          {hasError && (
            <Icon name="exclamation-circle" size={14} color={colors.feedback.dangerText} style={styles.headerErrorIcon} />
          )}
          <Icon name="chart-line" size={size.icon} color={colors.text.tertiary} />
        </View>
      </View>

      {hasStats ? (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statBadge, { backgroundColor: colors.surface.default }]}>
              <Text variant="h1" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {weeklyData.totalPracticeMinutes < 60
                  ? `${weeklyData.totalPracticeMinutes}m`
                  : `${(weeklyData.totalPracticeMinutes / 60).toFixed(1)}h`}
              </Text>
              <Text variant="bodySm" color="secondary" style={styles.bold}>Practice Time</Text>
              <Text variant="caption" color="tertiary" numberOfLines={2} style={styles.benchmark}>
                {practiceBenchmark.primary}
                {practiceBenchmark.secondary ? ` • ${practiceBenchmark.secondary}` : ""}
              </Text>
            </View>

            <View style={[styles.statBadge, { backgroundColor: colors.surface.default }]}>
              <Text variant="h1" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {weeklyData.totalDaysActive}
              </Text>
              <Text variant="bodySm" color="secondary" style={styles.bold}>Days Active</Text>
              <Text variant="caption" color="tertiary" numberOfLines={2} style={styles.benchmark}>
                {daysBenchmark.primary}
                {daysBenchmark.secondary ? ` • ${daysBenchmark.secondary}` : ""}
              </Text>
            </View>
          </View>

          {showRhythm ? (
            <View style={styles.rhythm}>
              <View style={styles.rhythmHeader}>
                <View>
                  <Text variant="bodySm" style={styles.bold}>4-week rhythm</Text>
                  <Text variant="caption" color="tertiary">Days active each week</Text>
                </View>
                <View style={styles.rhythmNow}>
                  <Text variant="caption" color="tertiary" style={styles.eyebrow}>NOW</Text>
                  <Text variant="bodySm" style={styles.bold}>
                    {latestDays === 1 ? "1 active day" : `${latestDays} active days`}
                  </Text>
                </View>
              </View>

              {/* Clean bar chart — one bar per week, current highlighted */}
              <View style={styles.bars}>
                {historicalActiveDays.map((week, index) => {
                  const isCurrent = index === historicalActiveDays.length - 1;
                  const days = Math.max(0, Math.min(MAX_ACTIVE_DAYS_PER_WEEK, week.daysActive));
                  const pct = Math.max(6, (days / MAX_ACTIVE_DAYS_PER_WEEK) * 100);
                  return (
                    <View key={week.weekStart} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${pct}%`,
                              backgroundColor: isCurrent ? accent : colors.surface.control,
                            },
                          ]}
                        />
                      </View>
                      <Text variant="caption" color={isCurrent ? accent : "tertiary"}>
                        {isCurrent ? "Now" : format(toLocalChartDate(week.weekStart), "MMM d")}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.trendRow}>
                <Icon
                  name={
                    daysBenchmark.primary === "Matched last week"
                      ? "minus"
                      : daysBenchmark.isAhead
                        ? "arrow-up"
                        : "arrow-down"
                  }
                  size={9}
                  color={trendColor}
                />
                <Text variant="caption" color={trendColor}>{daysBenchmark.primary}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.welcomeRow, { backgroundColor: colors.surface.default }]}>
              <Text variant="h2">🎉</Text>
              <View style={styles.flex1}>
                <Text variant="bodySm" style={styles.bold}>Welcome!</Text>
                <Text variant="caption" color="secondary">
                  Keep practicing — your trend will appear after your first full week.
                </Text>
              </View>
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Text variant="h2">Build Your Streak</Text>
          <Text variant="bodySm" color="secondary">
            Start practicing to track your stats.
          </Text>
          <View style={[styles.tipPill, { backgroundColor: colors.surface.default }]}>
            <Icon name="lightbulb" size={12} color={colors.accent.warning} />
            <Text variant="caption" color="secondary">Tip: Consistency is king.</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default DetailedWeeklySummary;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.xl,
  },
  flex1: { flex: 1 },
  bold: { fontFamily: fonts.bold },
  eyebrow: { letterSpacing: 1, textTransform: "uppercase", marginBottom: spacing.xxs },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerErrorIcon: { marginRight: spacing.sm },
  statsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  statBadge: {
    borderRadius: radius.card,
    padding: spacing.lg,
    flex: 1,
  },
  benchmark: { marginTop: spacing.sm },
  // ── Rhythm (bar chart) ──────────────────────────────────────────────────
  rhythm: { gap: spacing.lg },
  rhythmHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rhythmNow: { alignItems: "flex-end" },
  bars: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
  },
  barTrack: {
    width: 24,
    height: BAR_TRACK_HEIGHT,
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: radius.sm,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  // ── Welcome / empty ─────────────────────────────────────────────────────
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.input,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyContainer: { gap: spacing.sm },
  tipPill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
  },
  skeletonBody: { gap: spacing.xl },
  skeletonHeaderText: { gap: spacing.sm },
});
