import { addDays, format, startOfWeek } from "date-fns";
import React from "react";
import { StyleSheet, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { getLevelStage, LevelStage } from "../../../../../api/users";
import { WeeklyReportResponse } from "../../../../../api/progressReport/types";
import {
  useTheme,
  spacing,
  radius,
  borderWidth,
  size,
  fonts,
  Text,
  Skeleton,
} from "../../../../../design-system";
import { getFlowBenchmarkCopy } from "../../../../../util/flowBenchmark";

export const WeeklySummarySkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.default }]}>
      <View style={styles.skeletonBody}>
        <View style={styles.headerRow}>
          <View style={styles.skeletonHeaderText}>
            <Skeleton width={120} height={12} />
            <Skeleton width={180} height={16} />
          </View>
          <Skeleton width={20} height={20} />
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statBadgeSkeleton, { backgroundColor: colors.surface.default }]}>
            <Skeleton width={"50%"} height={32} />
            <Skeleton width={"80%"} height={14} />
            <Skeleton width={"100%"} height={12} />
          </View>
          <View style={[styles.statBadgeSkeleton, { backgroundColor: colors.surface.default }]}>
            <Skeleton width={"50%"} height={32} />
            <Skeleton width={"80%"} height={14} />
            <Skeleton width={"100%"} height={12} />
          </View>
        </View>
      </View>
    </View>
  );
};

// ── Sparkline ──────────────────────────────────────────────────────────────
const TREND_VIEWBOX_WIDTH = 320;
const TREND_VIEWBOX_HEIGHT = 110;
const TREND_PADDING_X = 20;
const TREND_PADDING_TOP = 12;
const TREND_PADDING_BOTTOM = 28;
const MAX_ACTIVE_DAYS_PER_WEEK = 7;

const toLocalChartDate = (value: string | Date) => {
  if (value instanceof Date) {
    return value;
  }

  const normalized = value.includes("T") ? value.split("T")[0] : value;
  return new Date(`${normalized}T00:00:00`);
};

const buildLinePath = (points: Array<{ x: number; y: number }>) => {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  return points.reduce(
    (path, point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `${path} L ${point.x} ${point.y}`,
    "",
  );
};

const buildAreaPath = (
  points: Array<{ x: number; y: number }>,
  baselineY: number,
) => {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const { x, y } = points[0];
    return `M ${x} ${baselineY} L ${x} ${y} L ${x} ${baselineY} Z`;
  }

  const linePath = buildLinePath(points);
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return `${linePath} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;
};

const DaysActiveSparkline: React.FC<{
  historicalActiveDays: { weekStart: string; daysActive: number }[];
  benchmarkText: string;
  isAhead: boolean;
}> = ({ historicalActiveDays, benchmarkText, isAhead }) => {
  const { colors } = useTheme();
  const accent = colors.accent.purple;

  const chartData = React.useMemo(() => {
    const innerWidth = TREND_VIEWBOX_WIDTH - TREND_PADDING_X * 2;
    const innerHeight =
      TREND_VIEWBOX_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM;
    const baselineY = TREND_PADDING_TOP + innerHeight;
    const step =
      historicalActiveDays.length > 1
        ? innerWidth / (historicalActiveDays.length - 1)
        : 0;

    const points = historicalActiveDays.map((week, index) => {
      const normalizedDays = Math.max(
        0,
        Math.min(MAX_ACTIVE_DAYS_PER_WEEK, week.daysActive),
      );

      return {
        ...week,
        x:
          historicalActiveDays.length > 1
            ? TREND_PADDING_X + step * index
            : TREND_VIEWBOX_WIDTH / 2,
        y:
          baselineY -
          (normalizedDays / MAX_ACTIVE_DAYS_PER_WEEK) * innerHeight,
        daysLabel:
          normalizedDays === 1 ? "1 active day" : `${normalizedDays} active days`,
      };
    });

    return {
      points,
      baselineY,
      linePath: buildLinePath(points),
      areaPath: buildAreaPath(points, baselineY),
      gridLines: [0.25, 0.5, 0.75].map(
        (level) => TREND_PADDING_TOP + innerHeight * level,
      ),
    };
  }, [historicalActiveDays]);

  const latestPoint = chartData.points[chartData.points.length - 1];

  return (
    <View style={styles.sparklineContainer}>
      <View style={styles.sparklineHeaderRow}>
        <View>
          <Text variant="bodySm" style={styles.bold}>4-week rhythm</Text>
          <Text variant="caption" color="tertiary">Days active each week</Text>
        </View>
        {latestPoint ? (
          <View style={styles.currentWeekChip}>
            <Text variant="caption" color="tertiary" style={styles.eyebrow}>NOW</Text>
            <Text variant="bodySm" style={styles.bold}>{latestPoint.daysLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.sparklineChartCard}>
        <Svg
          width="100%"
          height={TREND_VIEWBOX_HEIGHT}
          viewBox={`0 0 ${TREND_VIEWBOX_WIDTH} ${TREND_VIEWBOX_HEIGHT}`}
        >
          <Defs>
            <SvgLinearGradient id="days-active-area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accent} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={accent} stopOpacity={0.02} />
            </SvgLinearGradient>
            <SvgLinearGradient id="days-active-column" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={accent} stopOpacity={0.4} />
              <Stop offset="100%" stopColor={accent} stopOpacity={0.06} />
            </SvgLinearGradient>
          </Defs>

          {chartData.gridLines.map((y, index) => (
            <Line
              key={`grid-${index}`}
              x1={TREND_PADDING_X}
              x2={TREND_VIEWBOX_WIDTH - TREND_PADDING_X}
              y1={y}
              y2={y}
              stroke={colors.text.primary}
              strokeOpacity={0.08}
              strokeDasharray="4 8"
              strokeWidth={1}
            />
          ))}

          <Line
            x1={TREND_PADDING_X}
            x2={TREND_VIEWBOX_WIDTH - TREND_PADDING_X}
            y1={chartData.baselineY}
            y2={chartData.baselineY}
            stroke={colors.text.primary}
            strokeOpacity={0.14}
            strokeWidth={1.5}
          />

          {chartData.points.map((point, index) => {
            const isCurrent = index === chartData.points.length - 1;
            return (
              <React.Fragment key={point.weekStart}>
                <Rect
                  x={point.x - (isCurrent ? 12 : 10)}
                  y={point.y}
                  width={isCurrent ? 24 : 20}
                  height={Math.max(10, chartData.baselineY - point.y)}
                  rx={isCurrent ? 12 : 10}
                  fill="url(#days-active-column)"
                  opacity={isCurrent ? 0.95 : 0.6}
                />
                <Line
                  x1={point.x}
                  x2={point.x}
                  y1={chartData.baselineY}
                  y2={point.y}
                  stroke={accent}
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              </React.Fragment>
            );
          })}

          {chartData.areaPath ? (
            <Path d={chartData.areaPath} fill="url(#days-active-area)" />
          ) : null}

          {chartData.linePath ? (
            <Path
              d={chartData.linePath}
              fill="none"
              stroke={accent}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}

          {chartData.points.map((point, index) => {
            const isCurrent = index === chartData.points.length - 1;
            return (
              <React.Fragment key={`${point.weekStart}-marker`}>
                {isCurrent ? (
                  <Circle cx={point.x} cy={point.y} r={12} fill={accent} opacity={0.25} />
                ) : null}
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={isCurrent ? 6.5 : 5}
                  fill={colors.text.primary}
                  stroke={accent}
                  strokeWidth={isCurrent ? 3 : 2}
                />
              </React.Fragment>
            );
          })}
        </Svg>

        <View style={styles.sparklineLabelsRow}>
          {historicalActiveDays.map((week, index) => {
            const isCurrent = index === historicalActiveDays.length - 1;
            return (
              <View
                key={`${week.weekStart}-label`}
                style={[
                  styles.sparklineLabelPill,
                  { backgroundColor: colors.surface.control },
                  isCurrent && { backgroundColor: colors.action.primary },
                ]}
              >
                <Text
                  variant="caption"
                  color={isCurrent ? colors.action.onPrimary : "tertiary"}
                >
                  {isCurrent
                    ? "Now"
                    : format(toLocalChartDate(week.weekStart), "MMM d")}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.sparklineTrendPill}>
        <Icon
          name={
            benchmarkText === "Matched last week"
              ? "minus"
              : isAhead
                ? "arrow-up"
                : "arrow-down"
          }
          size={9}
          color={
            benchmarkText === "Matched last week"
              ? colors.text.tertiary
              : isAhead
                ? colors.feedback.successText
                : colors.feedback.dangerText
          }
        />
        <Text
          variant="caption"
          color={
            benchmarkText === "Matched last week"
              ? colors.text.tertiary
              : isAhead
                ? colors.feedback.successText
                : colors.feedback.dangerText
          }
        >
          {benchmarkText}
        </Text>
      </View>
    </View>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
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
  const [levelStage, setLevelStage] = React.useState<LevelStage | null>(null);

  React.useEffect(() => {
    const fetchStage = async () => {
      try {
        const stage = await getLevelStage();
        setLevelStage(stage);
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

    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
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

  // Sparkline / trend state
  const dataWeeksAvailable = weeklyData?.dataWeeksAvailable ?? 0;
  const historicalActiveDays = weeklyData?.historicalActiveDays ?? [];
  const showSparkline = dataWeeksAvailable >= 1 && historicalActiveDays.length > 0;

  if (loading && !weeklyData) {
    return <WeeklySummarySkeleton />;
  }

  if (!weeklyData) {
    return null;
  }

  const hasStats =
    weeklyData.totalPracticeMinutes > 0 || weeklyData.totalDaysActive > 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.default }]}>
      {/* Purple identity glow */}
      <View style={[styles.glow, { backgroundColor: colors.accentTint.purple }]} />

      <View style={styles.contentLayer}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text variant="label" color={colors.accent.purple} style={styles.eyebrow}>
              {levelStage?.title || "WEEKLY SUMMARY"}
            </Text>
            <Text variant="h3">{getWeekRangeLabel()}</Text>
          </View>
          <View style={styles.headerRight}>
            {hasError && (
              <Icon name="exclamation-circle" size={14} color={colors.feedback.dangerText} style={styles.headerErrorIcon} />
            )}
            <Icon name="chart-line" size={size.icon} color={colors.accent.purple} />
          </View>
        </View>

        {hasStats ? (
          <>
            <View style={styles.statsRow}>
              {/* Practice Time */}
              <View style={[styles.statBadge, { backgroundColor: colors.surface.default }]}>
                <View style={styles.watermarkIconContainer}>
                  <Icon name="clock" size={80} color={colors.text.primary} />
                </View>
                <View style={styles.statContent}>
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
              </View>

              {/* Days Active */}
              <View style={[styles.statBadge, { backgroundColor: colors.surface.default }]}>
                <View style={styles.watermarkIconContainer}>
                  <Icon name="fire" size={80} color={colors.text.primary} />
                </View>
                <View style={styles.statContent}>
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
            </View>

            {showSparkline ? (
              <DaysActiveSparkline
                historicalActiveDays={historicalActiveDays}
                benchmarkText={daysBenchmark.primary}
                isAhead={daysBenchmark.isAhead}
              />
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
    </View>
  );
};

export default DetailedWeeklySummary;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    minHeight: 180,
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  contentLayer: {
    flex: 1,
    justifyContent: "space-between",
    zIndex: 1,
    gap: spacing["2xl"],
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
    justifyContent: "center",
  },
  statBadge: {
    borderRadius: radius.card,
    padding: spacing.lg,
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -16,
    bottom: -18,
    opacity: 0.05,
    transform: [{ rotate: "-15deg" }],
  },
  statContent: {
    flex: 1,
    justifyContent: "center",
  },
  benchmark: {
    marginTop: spacing.sm,
  },
  statBadgeSkeleton: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.card,
  },
  skeletonBody: {
    gap: spacing.xl,
  },
  skeletonHeaderText: {
    gap: spacing.sm,
  },
  // ── Sparkline ──────────────────────────────────────────────────────────
  sparklineContainer: {
    gap: spacing.md,
  },
  sparklineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  currentWeekChip: {
    borderRadius: radius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 96,
  },
  sparklineChartCard: {
    borderRadius: radius.input,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    overflow: "hidden",
  },
  sparklineLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  sparklineLabelPill: {
    minWidth: 56,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  sparklineTrendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  // ── Welcome / empty ────────────────────────────────────────────────────
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.input,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  emptyContainer: {
    gap: spacing.sm,
  },
  tipPill: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
  },
});
