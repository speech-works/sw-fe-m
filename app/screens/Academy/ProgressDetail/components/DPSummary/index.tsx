import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { PieChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/FontAwesome5";
import { getUserStats } from "../../../../../api";
import { useUserStore } from "../../../../../stores/user";
import { theme } from "../../../../../Theme/tokens";
import {
    parseTextStyle,
} from "../../../../../util/functions/parseStyles";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_PADDING = 20; // inner padding of the outer card
const GRID_GAP = 10;
const BENTO_CARD_WIDTH =
  (SCREEN_WIDTH - 16 * 2 - CARD_PADDING * 2 - GRID_GAP) / 2; // 16px page padding, 20px card padding both sides

type ContentTypeKey =
  | "COGNITIVE_PRACTICE"
  | "EXPOSURE_PRACTICE"
  | "FUN_PRACTICE"
  | "READING_PRACTICE";

interface PracticeStatSummary {
  contentType: string;
  itemsCompleted: number;
  totalTime: number;
}

const DPSummary = () => {
  const { user } = useUserStore();
  const [chartData, setChartData] = useState<
    Array<{
      name: string;
      totalTime: number;
      color: string;
      legendFontColor: string;
      legendFontSize: number;
    }>
  >([]);
  const [totalPracticeTime, setTotalPracticeTime] = useState(0);

  const chartColors: Record<ContentTypeKey, string> = {
    READING_PRACTICE: "#FCD34D",
    COGNITIVE_PRACTICE: "#FB923C",
    FUN_PRACTICE: "#60A5FA",
    EXPOSURE_PRACTICE: "#34D399",
  };

  const gradients: Record<
    ContentTypeKey,
    readonly [string, string, ...string[]]
  > = {
    READING_PRACTICE: ["#FBBF24", "#F59E0B"],
    COGNITIVE_PRACTICE: ["#FB923C", "#F97316"],
    FUN_PRACTICE: ["#60A5FA", "#3B82F6"],
    EXPOSURE_PRACTICE: ["#34D399", "#10B981"],
  };

  const contentTypeLabels: Record<ContentTypeKey, string> = {
    COGNITIVE_PRACTICE: "Cognitive",
    EXPOSURE_PRACTICE: "Exposure",
    FUN_PRACTICE: "Fun",
    READING_PRACTICE: "Reading",
  };

  const icons: Record<ContentTypeKey, string> = {
    COGNITIVE_PRACTICE: "brain",
    EXPOSURE_PRACTICE: "users",
    FUN_PRACTICE: "smile",
    READING_PRACTICE: "book-open",
  };

  useEffect(() => {
    if (!user) return;
    const fetchSummary = async () => {
      const stats: PracticeStatSummary[] = await getUserStats(user.id);

      const overallTotalTime = stats.reduce(
        (sum, item) => sum + item.totalTime,
        0
      );

      const dataForChart = stats.map((item) => {
        const contentType = item.contentType as ContentTypeKey;
        const label = contentTypeLabels[contentType] || item.contentType;
        const color = chartColors[contentType] || "#CCCCCC";

        return {
          name: label,
          totalTime: item.totalTime,
          color: color,
          legendFontColor: theme.colors.text.default,
          legendFontSize: 12,
        };
      });

      setChartData(dataForChart);
      setTotalPracticeTime(overallTotalTime);
    };
    fetchSummary();
  }, [user]);

  const formatTime = (timeInMinutes: number) => {
    if (timeInMinutes < 60) {
      return `${Math.round(timeInMinutes)}m`;
    } else {
      const hours = timeInMinutes / 60;
      return `${hours.toFixed(1)}h`;
    }
  };

  // Pie chart width that fits inside the outer card
  const chartWidth = SCREEN_WIDTH - 16 * 2 - CARD_PADDING * 2;

  return (
    <View style={styles.outerCard}>
      {/* Watermark Bubbles (matching other cards) */}
      <View style={styles.bubbleTopRight} />
      <View style={styles.bubbleBottomLeft} />

      {/* Header Row (matching other cards) */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>PRACTICE DISTRIBUTION</Text>
          <Text style={styles.headerSubtitle}>Time spent by category</Text>
        </View>
        <Icon name="chart-pie" size={20} color="rgba(255,255,255,0.9)" />
      </View>

      {chartData.length > 0 && totalPracticeTime > 0 ? (
        <View style={styles.contentContainer}>
          {/* Legend */}
          <View style={styles.chartLegend}>
            {chartData.map((item) => (
              <View key={item.name} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: item.color },
                  ]}
                />
                <Text style={styles.legendText}>{item.name}</Text>
              </View>
            ))}
          </View>

          {/* Pie Chart */}
          <View style={styles.chartWrapper}>
            <View style={styles.chartArea}>
              <PieChart
                data={chartData.map((item) => ({
                  name: item.name,
                  population: item.totalTime,
                  color: item.color,
                  legendFontColor: "#FFFFFF",
                  legendFontSize: 16,
                }))}
                width={chartWidth}
                height={240}
                chartConfig={{
                  backgroundColor: "transparent",
                  backgroundGradientFrom: "transparent",
                  backgroundGradientTo: "transparent",
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                  labelColor: (opacity = 1) =>
                    `rgba(255, 255, 255, ${opacity})`,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"50"}
                hasLegend={false}
                center={[0, 0]}
                absolute
              />

              {/* Percentage labels on slices */}
              {chartData.map((item, index) => {
                const percentage = Math.round(
                  (item.totalTime / totalPracticeTime) * 100
                );
                if (percentage < 5) return null;

                let startAngle = 0;
                for (let i = 0; i < index; i++) {
                  startAngle +=
                    (chartData[i].totalTime / totalPracticeTime) * 360;
                }
                const sliceAngle =
                  (item.totalTime / totalPracticeTime) * 360;
                const midAngle = startAngle + sliceAngle / 2;
                const angleRad = ((midAngle - 90) * Math.PI) / 180;

                const chartSize = 240;
                const centerX = chartSize / 2;
                const centerY = chartSize / 2;
                const labelRadius = chartSize / 3.2;

                const x = centerX + labelRadius * Math.cos(angleRad);
                const y = centerY + labelRadius * Math.sin(angleRad);

                return (
                  <View
                    key={`label-${index}`}
                    style={[styles.percentageBadge, { left: x, top: y }]}
                  >
                    <Text style={styles.percentageBadgeText}>
                      {percentage}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Bento Grid — Gradient Cards (same look as original) */}
          <View style={styles.bentoGrid}>
            {chartData.map((item, idx) => {
              const contentType = Object.keys(contentTypeLabels).find(
                (key) => contentTypeLabels[key as ContentTypeKey] === item.name
              ) as ContentTypeKey;
              const gradient = contentType
                ? gradients[contentType]
                : (["#E5E7EB", "#D1D5DB"] as const);
              const icon = contentType ? icons[contentType] : "circle";

              // If odd number of cards make the first one full width
              const isOddFirst =
                chartData.length % 2 !== 0 && idx === 0;

              return (
                <View
                  key={item.name}
                  style={[
                    styles.practiceCard,
                    isOddFirst
                      ? { width: "100%" }
                      : { width: BENTO_CARD_WIDTH },
                  ]}
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.practiceGradient,
                      isOddFirst && styles.practiceGradientWide,
                    ]}
                  >
                    {/* Watermark Icon */}
                    <View style={styles.practiceWatermark}>
                      <Icon
                        name={icon}
                        size={52}
                        color="rgba(255,255,255,0.15)"
                      />
                    </View>

                    {/* Content */}
                    <View style={styles.practiceContent}>
                      <View style={styles.practiceHeader}>
                        <View style={styles.practiceIconBadge}>
                          <Icon name={icon} size={14} color="#FFF" />
                        </View>
                        <Text style={styles.practiceName}>{item.name}</Text>
                      </View>

                      <Text style={styles.practiceTime}>
                        {formatTime(item.totalTime)}
                      </Text>
                      <Text style={styles.practicePercentage}>
                        {((item.totalTime / totalPracticeTime) * 100).toFixed(0)}% of total
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="chart-pie" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={styles.emptyText}>No practice data available</Text>
          <Text style={styles.emptySubtext}>
            Complete some practices to see your distribution
          </Text>
        </View>
      )}
    </View>
  );
};

export default DPSummary;

const styles = StyleSheet.create({
  // Outer card — same shape as DetailedWeeklySummary & MoodSummary
  outerCard: {
    borderRadius: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: "#3B82F6",
    overflow: "hidden",
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 22,
    position: "relative",
  },
  // Matching watermark bubbles
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
  // Header — same pattern as other cards
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    zIndex: 1,
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
  headerSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },
  contentContainer: {
    gap: 16,
    zIndex: 1,
  },
  // Legend
  chartLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  legendText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  // Pie Chart
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  chartArea: {
    position: "relative",
    width: "100%",
    height: 240,
  },
  percentageBadge: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ translateX: -18 }, { translateY: -12 }],
    zIndex: 10,
  },
  percentageBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  // Bento Grid — no gap between rows or columns except GRID_GAP
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  practiceCard: {
    borderRadius: 18,
    overflow: "hidden",
  },
  practiceGradient: {
    padding: 16,
    minHeight: 120,
    position: "relative",
    justifyContent: "space-between",
  },
  practiceGradientWide: {
    minHeight: 100,
  },
  practiceWatermark: {
    position: "absolute",
    right: -8,
    bottom: -8,
    opacity: 0.8,
  },
  practiceContent: {
    gap: 6,
    zIndex: 1,
  },
  practiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  practiceIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  practiceName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  practiceTime: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  practicePercentage: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
    zIndex: 1,
  },
  emptyText: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  emptySubtext: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
});
