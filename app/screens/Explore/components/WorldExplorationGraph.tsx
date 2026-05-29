import { useFocusEffect } from "@react-navigation/native";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
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
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import { getFlowBenchmarkCopy } from "../../../util/flowBenchmark";

interface WorldExplorationGraphProps {
  onLayoutCapture?: (event: any) => void;
}

const WorldExplorationGraph: React.FC<WorldExplorationGraphProps> = ({
  onLayoutCapture,
}) => {
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
      style={styles.shadowContainer}
      shouldRasterizeIOS={true}
      accessible={true}
      accessibilityLabel={`Weekly progress: ${totalWeeklyMinutes} minutes practiced across ${daysActive} days this week`}
    >
      <LinearGradient
        colors={[
          theme.colors.library.red[300],
          theme.colors.library.orange[400],
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Watermark Bubbles */}
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        {/* World Icon Watermark */}
        <View style={styles.worldWatermark}>
          <Icon name="globe" size={140} color="rgba(255,255,255,0.08)" />
        </View>

        {/* Content Layer */}
        <View style={styles.contentLayer}>
          <View style={styles.headerRow}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.headerLabel}>WEEKLY UPDATE</Text>
              <Text
                style={styles.comparisonBasisText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {comparisonSubtitle}
              </Text>
            </View>
          </View>

          {/* Hero: Chart or Empty State */}
          {!hasAnyActivity ? (
            // Empty State
            <View style={styles.emptyState}>
              <Icon
                name="calendar-check"
                size={40}
                color="rgba(255,255,255,0.3)"
              />
              <Text style={styles.emptyText}>No practice this week yet</Text>
              <Text style={styles.emptySubtext}>
                Start today to build your rhythm.
              </Text>
            </View>
          ) : (
            // Regular Chart
            <View style={styles.chartContainer}>
              <View style={styles.chartRow}>
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  rhythmData.map((d, index) => {
                    const actualPercent = Math.min(
                      100,
                      (d.minutes / maxMinutes) * 100,
                    );
                    const targetPercent = Math.min(
                      100,
                      (DAILY_TARGET_MINUTES / maxMinutes) * 100,
                    );

                    const isTargetReached = d.minutes >= DAILY_TARGET_MINUTES;
                    // Improved Contrast: 0.85 opacity for better readability
                    const actualColor = isTargetReached
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.85)";
                    const targetColor = "rgba(255,255,255,0.15)";
                    const isSkipped = d.minutes === 0;

                    // Smart label: "99+" for large, "<1m" for sub-minute, otherwise rounded
                    const minuteDisplay =
                      d.minutes >= 100
                        ? "99+"
                        : d.minutes > 0 && d.minutes < 1
                          ? "<1m"
                          : `${Math.round(d.minutes)}m`;

                    // Label should be above the taller of actual or target bar
                    const topBarPercent = Math.max(
                      actualPercent,
                      targetPercent,
                    );

                    return (
                      <View key={index} style={styles.barColumn}>
                        {/* Bar and Label Container */}
                        <View style={styles.barWrapper}>
                          {/* Minute Label (2px above whichever bar is taller) */}
                          {!isSkipped && (
                            <Text
                              style={[
                                styles.minuteLabel,
                                {
                                  position: "absolute",
                                  bottom: `${topBarPercent}%`,
                                  left: 0,
                                  right: 0,
                                  marginBottom: 2, // 2px gap above bar
                                },
                              ]}
                            >
                              {minuteDisplay}
                            </Text>
                          )}

                          {/* Bar Stack Container */}
                          <View style={styles.barStackArea}>
                            {/* Target Bar */}
                            <View
                              style={[
                                styles.targetBar,
                                {
                                  height: `${targetPercent}%`,
                                  backgroundColor: targetColor,
                                },
                              ]}
                            />

                            {/* Actual Bar */}
                            {isSkipped ? (
                              <View
                                style={[
                                  styles.dotSkipped,
                                  { bottom: 0, position: "absolute" },
                                ]}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.actualBar,
                                  {
                                    height: `${actualPercent}%`,
                                    backgroundColor: actualColor,
                                    zIndex: 2,
                                  },
                                ]}
                              />
                            )}
                          </View>
                        </View>

                        {/* Day Label */}
                        <View style={d.isToday ? styles.todayContainer : null}>
                          <Text
                            style={[
                              styles.dayLabel,
                              d.isToday && styles.todayLabel,
                            ]}
                          >
                            {d.dayLabel}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          )}

          {/* Footer: Stats Badges */}
          <View style={styles.footerStats}>
            {/* Streak Badge */}
            <View style={[styles.statBadge, styles.activityBadge]}>
              <View style={styles.watermarkIconContainer}>
                <Icon name="fire" size={72} color="#FFF" />
              </View>
              <View style={styles.badgeContentCol}>
                <Text
                  style={styles.badgeMainValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {daysActive}
                </Text>
                <Text style={styles.badgeSubValue} numberOfLines={1}>
                  {daysActive === 1 ? "active day" : "active days"}
                </Text>
              </View>
            </View>

            {/* Total Badge */}
            <View style={[styles.statBadge, styles.minutesBadge]}>
              <View style={styles.watermarkIconContainer}>
                <Icon name="stopwatch" size={72} color="#FFF" />
              </View>
              <View style={styles.badgeContentCol}>
                <Text
                  style={styles.badgeMainValue}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {totalPracticeSummary}
                </Text>
                <Text style={styles.badgeSubValue} numberOfLines={2}>
                  {minutesBenchmarkSummary}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

export default React.memo(WorldExplorationGraph);

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    backgroundColor: theme.colors.library.red[100],
    marginBottom: 24,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
    minHeight: 320,
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
  worldWatermark: {
    position: "absolute",
    right: -40,
    top: -40,
    opacity: 0.6,
  },
  contentLayer: {
    flex: 1,
    gap: 20,
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextBlock: {
    gap: 6,
    paddingRight: 56,
  },
  headerLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  comparisonBasisText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    minHeight: 160,
  },
  emptyText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 17,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtext: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  // Chart
  chartContainer: {
    flex: 1,
    justifyContent: "center",
    minHeight: 180,
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-end",
    height: 140, // Slightly reduced for better balance
    width: "100%",
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    maxWidth: 40,
  },
  barWrapper: {
    flex: 1,
    width: "100%",
    position: "relative",
    marginBottom: 6,
  },
  minuteLabel: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "700",
    textAlign: "center",
  },
  barStackArea: {
    height: "100%",
    width: 18,
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
    marginLeft: "auto",
    marginRight: "auto",
  },
  targetBar: {
    width: 18,
    position: "absolute",
    bottom: 0,
    borderRadius: 6,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  actualBar: {
    width: 18,
    position: "absolute",
    bottom: 0,
    borderRadius: 6,
  },
  dotSkipped: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginBottom: 4,
  },
  dayLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.7)",
    fontSize: 11, // Increased from 10px
    fontWeight: "600",
  },
  todayContainer: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  todayLabel: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 11,
    textShadowColor: "rgba(255,255,255,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  // Footer
  // Footer
  footerStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: "auto",
    paddingTop: 12,
  },
  statBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    overflow: "hidden",
    position: "relative",
  },
  activityBadge: {
    flex: 3.5,
  },
  minutesBadge: {
    flex: 6.5,
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -14,
    bottom: -16,
    opacity: 0.1,
    transform: [{ rotate: "-15deg" }],
  },
  badgeContentCol: {
    flex: 1,
    justifyContent: "center",
  },
  badgeMainValue: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.4,
  },
  badgeSubValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: -0.1,
    lineHeight: 18,
    marginTop: 4,
  },
});
