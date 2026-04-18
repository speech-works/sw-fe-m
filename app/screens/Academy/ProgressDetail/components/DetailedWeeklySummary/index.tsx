import { addDays, format, startOfWeek } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TextStyle, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../../../stores/user";
import { useProgressReportStore } from "../../../../../stores/progressReport";
import { getLevelStage, LevelStage } from "../../../../../api/users";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import SkeletonLoader from "../../../../../components/SkeletonLoader";

export const formatDelta = (delta: number, unit: string) => {
  const value = delta.toFixed(1);
  const sign = delta >= 0 ? "+" : "-";
  const color: TextStyle["color"] = delta >= 0 ? "green" : "red";

  return (
    <Text
      style={{
        color,
        marginTop: 2,
        ...parseTextStyle(theme.typography.BodySmall),
      }}
    >
      {`${sign}${Math.abs(parseFloat(value))}${unit}`}
    </Text>
  );
};

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
             <SkeletonLoader width={40} height={40} style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 }} />
             <View style={{ gap: 6, flex: 1 }}>
                <SkeletonLoader width={"60%"} height={24} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                <SkeletonLoader width={"40%"} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
             </View>
          </View>
          <View style={styles.statBadgeSkeleton}>
             <SkeletonLoader width={40} height={40} style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 }} />
             <View style={{ gap: 6, flex: 1 }}>
                <SkeletonLoader width={"60%"} height={24} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                <SkeletonLoader width={"40%"} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
             </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  </View>
);

// ── Sparkline ──────────────────────────────────────────────────────────────
const SPARKLINE_BAR_MAX_HEIGHT = 28;

const DaysActiveSparkline: React.FC<{
  historicalActiveDays: { weekStart: string; daysActive: number }[];
  daysActiveChange: number;
}> = ({ historicalActiveDays, daysActiveChange }) => {
  const maxDays = Math.max(...historicalActiveDays.map((w) => w.daysActive), 1);
  const changeAbs = Math.abs(daysActiveChange);
  const isPositive = daysActiveChange >= 0;
  const changeText =
    daysActiveChange === 0
      ? "Same as last week"
      : `${isPositive ? "+" : "-"}${changeAbs} day${changeAbs !== 1 ? "s" : ""} vs last week`;

  return (
    <View style={styles.sparklineContainer}>
      <View style={styles.sparklineBars}>
        {historicalActiveDays.map((week, i) => {
          const isLast = i === historicalActiveDays.length - 1;
          const heightPct = week.daysActive / maxDays;
          return (
            <View key={week.weekStart} style={styles.sparklineBarCol}>
              <View style={styles.sparklineBarBg}>
                <View
                  style={[
                    styles.sparklineBarFill,
                    {
                      height: Math.max(3, heightPct * SPARKLINE_BAR_MAX_HEIGHT),
                      backgroundColor: isLast
                        ? "rgba(255,255,255,0.95)"
                        : "rgba(255,255,255,0.35)",
                    },
                  ]}
                />
              </View>
              <Text style={styles.sparklineWeekLabel}>
                {isLast ? "Now" : `W${i + 1}`}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.sparklineTrendPill}>
        <Icon
          name={daysActiveChange === 0 ? "minus" : isPositive ? "arrow-up" : "arrow-down"}
          size={9}
          color={isPositive ? "#6EE7B7" : "#FCA5A5"}
        />
        <Text
          style={[
            styles.sparklineTrendText,
            { color: daysActiveChange === 0 ? "rgba(255,255,255,0.7)" : isPositive ? "#6EE7B7" : "#FCA5A5" },
          ]}
        >
          {changeText}
        </Text>
      </View>
    </View>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────
const DetailedWeeklySummary = () => {
  const { user } = useUserStore();
  const {
    detailedSummary: weeklyData,
    loading,
    fetchErrors,
  } = useProgressReportStore();
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

  // Format comparison stats
  const formatChange = (change: number) => {
    if (change === 0) return null;
    let displayed = Math.abs(Math.round(change));
    if (change < 0 && displayed >= 100) displayed = 99;

    return {
      text: `${displayed}%`,
      isPositive: change >= 0,
    };
  };

  const minutesStats = weeklyData
    ? formatChange(weeklyData.percentagePracticeMinutesChange)
    : null;
  const sessionsStats = weeklyData
    ? formatChange(weeklyData.percentageSessionsChange)
    : null;

  // Sparkline / trend state
  const dataWeeksAvailable = weeklyData?.dataWeeksAvailable ?? 0;
  const historicalActiveDays = weeklyData?.historicalActiveDays ?? [];
  const daysActiveChange = weeklyData?.daysActiveChange ?? 0;
  const showSparkline = dataWeeksAvailable >= 1 && historicalActiveDays.length > 0;

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
                {levelStage?.fullTitle || "WEEKLY SUMMARY"}
              </Text>
              <Text style={styles.dateRangeText}>
                {levelStage?.progressReportCopy || getWeekRangeLabel()}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {fetchErrors.detailedSummary && (
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
                <Icon name="clock" size={18} color="rgba(255,255,255,0.9)" />
                <View style={styles.statContent}>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statNumber}>
                      {weeklyData.totalPracticeMinutes < 60
                        ? `${weeklyData.totalPracticeMinutes}m`
                        : `${(weeklyData.totalPracticeMinutes / 60).toFixed(
                            1,
                          )}h`}
                    </Text>
                    {minutesStats && (
                      <View
                        style={[
                          styles.comparisonPill,
                          {
                            backgroundColor: "rgba(255, 255, 255, 0.35)",
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.2)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.comparisonText,
                            {
                              color: minutesStats.isPositive
                                ? "#047857"
                                : "#991B1B",
                            },
                          ]}
                        >
                          {minutesStats.isPositive ? "↑" : "↓"}{" "}
                          {minutesStats.text}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.statLabel}>Practice Time</Text>
                </View>
              </View>

              {/* Sessions Badge */}
              <View style={styles.statBadge}>
                <Icon name="fire" size={18} color="rgba(255,255,255,0.9)" />
                <View style={styles.statContent}>
                  <View style={styles.statValueRow}>
                    <Text style={styles.statNumber}>
                      {weeklyData.totalDaysActive}
                    </Text>
                    {sessionsStats && (
                      <View
                        style={[
                          styles.comparisonPill,
                          {
                            backgroundColor: "rgba(255, 255, 255, 0.35)",
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.2)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.comparisonText,
                            {
                              color: sessionsStats.isPositive
                                ? "#047857"
                                : "#991B1B",
                            },
                          ]}
                        >
                          {sessionsStats.isPositive ? "↑" : "↓"}{" "}
                          {sessionsStats.text}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.statLabel}>Days Active</Text>
                </View>
              </View>
            </View>

              {/* Sparkline trend or welcome message */}
              {showSparkline ? (
                <DaysActiveSparkline
                  historicalActiveDays={historicalActiveDays}
                  daysActiveChange={daysActiveChange}
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
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  dateRangeText: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  statBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statBadgeSkeleton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  statContent: {
    gap: 2,
    flex: 1,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  comparisonPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
  loadingText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
  },
  // ── Sparkline ──────────────────────────────────────────────────────────
  sparklineContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  sparklineBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 36,
  },
  sparklineBarCol: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  sparklineBarBg: {
    flex: 1,
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  sparklineBarFill: {
    width: 10,
    borderRadius: 4,
  },
  sparklineWeekLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.3,
  },
  sparklineTrendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
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
