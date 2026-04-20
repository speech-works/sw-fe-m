import { addDays, format, startOfWeek } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
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
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import SkeletonLoader from "../../../../../components/SkeletonLoader";
import { getFlowBenchmarkCopy } from "../../../../../util/flowBenchmark";

export const WeeklySummarySkeleton = () => (
  <View style={styles.shadowContainer}>
    <LinearGradient
      colors={["#8B5CF6", "#6D28D9"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={styles.contentLayer}>
        <View style={styles.headerRow}>
          <View style={{ gap: 8 }}>
            <SkeletonLoader width={120} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
            <SkeletonLoader width={180} height={16} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
          </View>
          <View style={styles.headerRight}>
            <SkeletonLoader width={20} height={20} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBadgeSkeleton}>
             <SkeletonLoader width={"50%"} height={32} style={{ backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 4 }} />
             <SkeletonLoader width={"80%"} height={14} style={{ backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 12 }} />
             <SkeletonLoader width={"100%"} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 4 }} />
             <SkeletonLoader width={"60%"} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
          </View>
          <View style={styles.statBadgeSkeleton}>
             <SkeletonLoader width={"50%"} height={32} style={{ backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 4 }} />
             <SkeletonLoader width={"80%"} height={14} style={{ backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 12 }} />
             <SkeletonLoader width={"100%"} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 4 }} />
             <SkeletonLoader width={"60%"} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
          </View>
        </View>
      </View>
    </LinearGradient>
  </View>
);

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
          <Text style={styles.sparklineTitle}>4-week rhythm</Text>
          <Text style={styles.sparklineSubtitle}>Days active each week</Text>
        </View>
        {latestPoint ? (
          <View style={styles.currentWeekChip}>
            <Text style={styles.currentWeekChipEyebrow}>NOW</Text>
            <Text style={styles.currentWeekChipValue}>{latestPoint.daysLabel}</Text>
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
            <SvgLinearGradient
              id="days-active-area"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </SvgLinearGradient>
            <SvgLinearGradient
              id="days-active-column"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <Stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
              <Stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
            </SvgLinearGradient>
          </Defs>

          {chartData.gridLines.map((y, index) => (
            <Line
              key={`grid-${index}`}
              x1={TREND_PADDING_X}
              x2={TREND_VIEWBOX_WIDTH - TREND_PADDING_X}
              y1={y}
              y2={y}
              stroke="rgba(255,255,255,0.14)"
              strokeDasharray="4 8"
              strokeWidth={1}
            />
          ))}

          <Line
            x1={TREND_PADDING_X}
            x2={TREND_VIEWBOX_WIDTH - TREND_PADDING_X}
            y1={chartData.baselineY}
            y2={chartData.baselineY}
            stroke="rgba(255,255,255,0.22)"
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
                  opacity={isCurrent ? 0.9 : 0.55}
                />
                <Line
                  x1={point.x}
                  x2={point.x}
                  y1={chartData.baselineY}
                  y2={point.y}
                  stroke="rgba(255,255,255,0.18)"
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
              stroke="rgba(255,255,255,0.95)"
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
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    r={12}
                    fill="rgba(255,255,255,0.2)"
                  />
                ) : null}
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r={isCurrent ? 6.5 : 5}
                  fill="#FFFFFF"
                  stroke="rgba(109,40,217,0.35)"
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
                  isCurrent && styles.sparklineLabelPillCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.sparklineWeekLabel,
                    isCurrent && styles.sparklineWeekLabelCurrent,
                  ]}
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
              ? "rgba(255,255,255,0.7)"
              : isAhead
                ? "#6EE7B7"
                : "#FCA5A5"
          }
        />
        <Text
          style={[
            styles.sparklineTrendText,
            {
              color:
                benchmarkText === "Matched last week"
                  ? "rgba(255,255,255,0.7)"
                  : isAhead
                    ? "#6EE7B7"
                    : "#FCA5A5",
            },
          ]}
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
  const normalizedComparisonLabel = (
    weeklyData?.comparisonLabel || "This week so far • benchmarked against last week"
  ).replace("full last week", "last week");

  if (loading && !weeklyData) {
    return <WeeklySummarySkeleton />;
  }

  if (!weeklyData) {
    return null;
  }

  return (
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={["#8B5CF6", "#6D28D9"]} // Purple gradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Watermark Bubbles */}
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        {/* Calendar Icon Watermark */}
        <View style={styles.calendarWatermark}>
          <Icon
            name="calendar-week"
            size={140}
            color="rgba(255,255,255,0.08)"
          />
        </View>

        {/* Content Layer */}
        <View style={styles.contentLayer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLabel}>
                {levelStage?.title || "WEEKLY SUMMARY"}
              </Text>
              <Text style={styles.dateRangeText}>
                {getWeekRangeLabel()}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {hasError && (
                <Icon
                  name="exclamation-circle"
                  size={14}
                  color="rgba(255,255,255,0.6)"
                  style={{ marginRight: 8 }}
                />
              )}
              <Icon name="chart-line" size={20} color="rgba(255,255,255,0.9)" />
            </View>
          </View>

          {/* Stats Badges or Empty State */}
          {weeklyData && (weeklyData.totalPracticeMinutes > 0 || weeklyData.totalDaysActive > 0) ? (
            <>
            <View style={styles.statsRow}>
              {/* Practice Time Badge */}
              <View style={styles.statBadge}>
                <View style={styles.watermarkIconContainer}>
                  <Icon name="clock" size={80} color="#FFF" />
                </View>
                <View style={styles.statContent}>
                  <Text
                    style={styles.statNumber}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {weeklyData.totalPracticeMinutes < 60
                      ? `${weeklyData.totalPracticeMinutes}m`
                      : `${(weeklyData.totalPracticeMinutes / 60).toFixed(1)}h`}
                  </Text>
                  <Text style={styles.statLabel}>Practice Time</Text>
                  <Text style={styles.benchmarkCombinedText} numberOfLines={2}>
                    {practiceBenchmark.primary}
                    {practiceBenchmark.secondary ? ` • ${practiceBenchmark.secondary}` : ""}
                  </Text>
                </View>
              </View>

              {/* Days Active Badge */}
              <View style={styles.statBadge}>
                <View style={styles.watermarkIconContainer}>
                  <Icon name="fire" size={80} color="#FFF" />
                </View>
                <View style={styles.statContent}>
                  <Text
                    style={styles.statNumber}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {weeklyData.totalDaysActive}
                  </Text>
                  <Text style={styles.statLabel}>Days Active</Text>
                  <Text style={styles.benchmarkCombinedText} numberOfLines={2}>
                    {daysBenchmark.primary}
                    {daysBenchmark.secondary ? ` • ${daysBenchmark.secondary}` : ""}
                  </Text>
                </View>
              </View>
            </View>

              {/* Sparkline trend or welcome message */}
              {showSparkline ? (
                <DaysActiveSparkline
                  historicalActiveDays={historicalActiveDays}
                  benchmarkText={daysBenchmark.primary}
                  isAhead={daysBenchmark.isAhead}
                />
              ) : (
                <View style={styles.welcomeRow}>
                  <Text style={styles.welcomeEmoji}>🎉</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.welcomeTitle}>Welcome!</Text>
                    <Text style={styles.welcomeSubtitle}>
                      Keep practicing — your trend will appear after your first full week.
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyHeaderRow}>
                <Text style={styles.emptyTitle}>Build Your Streak</Text>
              </View>
              <Text style={styles.emptySubtitle}>
                Start practicing to track your stats.
              </Text>
              <View style={styles.tipPill}>
                <Icon name="lightbulb" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.tipText}>
                  Tip: Consistency is king.
                </Text>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default DetailedWeeklySummary;

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: "#DDD6FE",
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    minHeight: 180,
    position: "relative",
  },
  // Watermark Bubbles
  bubbleTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  calendarWatermark: {
    position: "absolute",
    right: -40,
    top: -20,
    opacity: 0.6,
  },
  contentLayer: {
    flex: 1,
    justifyContent: "space-between",
    zIndex: 1,
    gap: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  dateRangeText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  statBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 24,
    padding: 18,
    flex: 1,
    overflow: "hidden",
    position: "relative",
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -16,
    bottom: -18,
    opacity: 0.08,
    transform: [{ rotate: "-15deg" }],
  },
  statBadgeSkeleton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 24,
    padding: 18,
    flex: 1,
  },
  statContent: {
    flex: 1,
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  benchmarkCombinedText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: -0.1,
    lineHeight: 16,
  },
  loadingText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  // ── Sparkline ──────────────────────────────────────────────────────────
  sparklineContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  sparklineHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sparklineTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  sparklineSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.68)",
    marginTop: 2,
  },
  currentWeekChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    minWidth: 96,
  },
  currentWeekChipEyebrow: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.64)",
    letterSpacing: 1,
    marginBottom: 2,
  },
  currentWeekChipValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFF",
  },
  sparklineChartCard: {
    backgroundColor: "rgba(49, 17, 118, 0.18)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  sparklineLabelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  sparklineLabelPill: {
    minWidth: 56,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  sparklineLabelPillCurrent: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  sparklineWeekLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.62)",
    letterSpacing: 0.2,
  },
  sparklineWeekLabelCurrent: {
    color: "#FFF",
  },
  sparklineTrendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 2,
  },
  sparklineTrendText: {
    fontSize: 11,
    fontWeight: "600",
  },
  // ── Welcome (new user) ─────────────────────────────────────────────────
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  welcomeEmoji: {
    fontSize: 22,
  },
  welcomeTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 2,
  },
  welcomeSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.75)",
    lineHeight: 15,
  },
  emptyContainer: {
    gap: 8,
  },
  emptyHeaderRow: {
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  tipPill: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tipText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
  },
});
