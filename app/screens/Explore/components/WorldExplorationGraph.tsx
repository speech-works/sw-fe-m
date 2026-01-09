import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useState, useMemo } from "react";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import { theme } from "../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../stores/user";
import { getDailyActivityStatsForTheWeek } from "../../../api/progressReport";
import { WeeklyStat } from "../../../api/progressReport/types";
import { LinearGradient } from "expo-linear-gradient";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

const WorldExplorationGraph = () => {
  const { user } = useUserStore();
  const [weeklyData, setWeeklyData] = useState<WeeklyStat[]>([]);
  const [percentChange, setPercentChange] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Configuration
  const DAILY_TARGET_MINUTES = 10;

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    getDailyActivityStatsForTheWeek(user.id)
      .then((response) => {
        setWeeklyData(response.days);
        setPercentChange(response.percentChange || 0);
      })
      .catch((err) => console.error("Stats error:", err))
      .finally(() => setLoading(false));
  }, [user]);

  // --- Metrics ---
  const totalWeeklyMinutes = Math.round(
    weeklyData.reduce((sum, d) => sum + d.totalTime, 0)
  );
  const daysActive = weeklyData.filter((d) => d.totalTime > 0).length;
  const streakText =
    daysActive > 0 ? `${daysActive} Day Streak` : "Start Streak";

  // Comparison Logic (Edge Case: Hide if no meaningful data)
  const hasComparison = weeklyData.length > 0 && Math.abs(percentChange) > 0;
  const isPositive = percentChange >= 0;
  const comparisonText = `${Math.abs(Math.round(percentChange))}%`;

  // Empty State Detection
  const hasAnyActivity = totalWeeklyMinutes > 0;

  // Rhythm Data
  const rhythmData = useMemo(() => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const dataMap = new Map();
    weeklyData.forEach((d) => {
      const dateStr = d.date.split("T")[0];
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
    DAILY_TARGET_MINUTES * 1.3
  );

  return (
    <View
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
          {/* Header Row */}
          <View style={styles.headerRow}>
            <Text style={styles.headerLabel}>WEEKLY UPDATE</Text>
            {hasComparison && (
              <View style={styles.comparisonBadge}>
                <Icon
                  name={isPositive ? "arrow-up" : "arrow-down"}
                  size={10}
                  color="#FFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.comparisonText}>{comparisonText}</Text>
              </View>
            )}
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
                Start today to build your streak!
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
                      (d.minutes / maxMinutes) * 100
                    );
                    const targetPercent = Math.min(
                      100,
                      (DAILY_TARGET_MINUTES / maxMinutes) * 100
                    );

                    const isTargetReached = d.minutes >= DAILY_TARGET_MINUTES;
                    // Improved Contrast: 0.85 opacity for better readability
                    const actualColor = isTargetReached
                      ? "#FFFFFF"
                      : "rgba(255,255,255,0.85)";
                    const targetColor = "rgba(255,255,255,0.15)";
                    const isSkipped = d.minutes === 0;

                    // Smart label: Show "99+" for large values
                    const minuteDisplay =
                      d.minutes >= 100 ? "99+" : `${Math.round(d.minutes)}m`;

                    // Label should be above the taller of actual or target bar
                    const topBarPercent = Math.max(
                      actualPercent,
                      targetPercent
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
            <View style={styles.statBadge}>
              <Icon name="fire" size={18} color="rgba(255,255,255,0.9)" />
              <View style={styles.statContent}>
                <View style={styles.statRow}>
                  <Text style={styles.statNumber}>{daysActive}</Text>
                  {hasComparison && (
                    <Text
                      style={[
                        styles.comparisonIndicator,
                        { color: isPositive ? "#4ADE80" : "#F87171" },
                      ]}
                    >
                      {isPositive ? "↑" : "↓"}
                      {Math.abs(Math.round(percentChange))}%
                    </Text>
                  )}
                </View>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
            </View>

            {/* Total Badge */}
            <View style={styles.statBadge}>
              <View style={styles.statContent}>
                <View style={styles.statRow}>
                  <Text style={styles.statNumber}>{totalWeeklyMinutes}m</Text>
                  {hasComparison && (
                    <Text
                      style={[
                        styles.comparisonIndicator,
                        { color: isPositive ? "#4ADE80" : "#F87171" },
                      ]}
                    >
                      {isPositive ? "↑" : "↓"}
                      {Math.abs(Math.round(percentChange))}%
                    </Text>
                  )}
                </View>
                <Text style={styles.statLabel}>Total</Text>
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: theme.colors.library.red[100],
    marginBottom: 24,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 24,
    paddingHorizontal: 20, // Refined spacing
    paddingVertical: 22,
    minHeight: 280,
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
    justifyContent: "space-between",
    zIndex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28, // Increased spacing
  },
  headerLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.9)",
    fontSize: 11, // Refined
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  comparisonBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  comparisonText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 12, // Increased from 11
    fontWeight: "700",
    color: "#FFF",
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    marginTop: 16,
    marginBottom: 8,
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
    marginBottom: 20, // Refined spacing
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
    paddingTop: 20,
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
    minWidth: 120,
  },
  statContent: {
    gap: 2,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  comparisonIndicator: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
});
