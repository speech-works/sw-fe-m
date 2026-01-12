import { StyleSheet, Text, TextStyle, View } from "react-native";
import React, { useEffect, useState } from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { getDetailedWeeklySummary } from "../../../../../api";
import { useUserStore } from "../../../../../stores/user";
import { DetailedWeeklySummaryResponse } from "../../../../../api/progressReport/types";
import Icon from "react-native-vector-icons/FontAwesome5";
import { format, addDays, startOfWeek } from "date-fns";
import * as Localization from "expo-localization";
import { LinearGradient } from "expo-linear-gradient";

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

const DetailedWeeklySummary = () => {
  const { user } = useUserStore();
  const [weeklyData, setWeeklyData] =
    useState<DetailedWeeklySummaryResponse | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchWeeklyStats = async () => {
      const stats = await getDetailedWeeklySummary(user.id);
      setWeeklyData(stats);
    };
    fetchWeeklyStats();
  }, [user]);

  const getWeekRangeLabel = () => {
    const now = new Date();
    const tz = Localization.getCalendars()[0].timeZone;
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
            <View>
              <Text style={styles.headerLabel}>WEEKLY SUMMARY</Text>
              <Text style={styles.dateRangeText}>{getWeekRangeLabel()}</Text>
            </View>
            <Icon name="chart-line" size={20} color="rgba(255,255,255,0.9)" />
          </View>

          {/* Stats Badges */}
          {weeklyData ? (
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
                            1
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
                      {weeklyData.totalSessions}
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
          ) : (
            <Text style={styles.loadingText}>Loading...</Text>
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
    alignItems: "flex-start",
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
});
