import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PieChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/FontAwesome5";
import { getUserStats } from "../../../../../api";
import { useUserStore } from "../../../../../stores/user";
import { theme } from "../../../../../Theme/tokens";
import {
    parseShadowStyle,
    parseTextStyle,
} from "../../../../../util/functions/parseStyles";

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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>Practice Distribution</Text>
          <Text style={styles.headerSubtitle}>Time spent by category</Text>
        </View>
      </View>

      {chartData.length > 0 && totalPracticeTime > 0 ? (
        <View style={styles.bentoGrid}>
          {/* Large Chart Card - 3D Style */}
          <View style={styles.chartCard}>
            <View style={styles.chartContainer}>
              {/* Legend at top */}
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

              {/* Chart with 3D effect */}
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
                    width={280}
                    height={280}
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
                    paddingLeft={"70"}
                    hasLegend={false}
                    center={[0, 0]}
                    absolute
                  />

                  {/* Custom percentage labels */}
                  {chartData.map((item, index) => {
                    const percentage = Math.round(
                      (item.totalTime / totalPracticeTime) * 100
                    );
                    if (percentage < 4) return null;

                    let startAngle = 0;
                    for (let i = 0; i < index; i++) {
                      startAngle +=
                        (chartData[i].totalTime / totalPracticeTime) * 360;
                    }
                    const sliceAngle =
                      (item.totalTime / totalPracticeTime) * 360;
                    const midAngle = startAngle + sliceAngle / 2;

                    // Convert to radians
                    // -90 degrees because chart starts at 12 o'clock, but 0 degrees in trig is 3 o'clock
                    const angleRad = ((midAngle - 90) * Math.PI) / 180;

                    // Chart dimensions
                    const chartSize = 280;
                    const centerX = chartSize / 2;
                    const centerY = chartSize / 2;

                    // Radius for label placement
                    const labelRadius = chartSize / 3.5;

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
            </View>
          </View>

          {/* Practice Type Cards - Bento Grid */}
          {chartData.map((item, index) => {
            const contentType = Object.keys(contentTypeLabels).find(
              (key) => contentTypeLabels[key as ContentTypeKey] === item.name
            ) as ContentTypeKey;
            const gradient = contentType
              ? gradients[contentType]
              : (["#E5E7EB", "#D1D5DB"] as const);
            const icon = contentType ? icons[contentType] : "circle";

            return (
              <View
                key={item.name}
                style={[
                  styles.practiceCard,
                  index === 0 && styles.practiceCardLarge, // First card is larger
                ]}
              >
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.practiceGradient}
                >
                  {/* Watermark Icon */}
                  <View style={styles.practiceWatermark}>
                    <Icon
                      name={icon}
                      size={60}
                      color="rgba(255,255,255,0.15)"
                    />
                  </View>

                  {/* Content */}
                  <View style={styles.practiceContent}>
                    <View style={styles.practiceHeader}>
                      <View style={styles.practiceIconBadge}>
                        <Icon name={icon} size={16} color="#FFF" />
                      </View>
                      <Text style={styles.practiceName}>{item.name}</Text>
                    </View>

                    <Text style={styles.practiceTime}>
                      {formatTime(item.totalTime)}
                    </Text>
                    <Text style={styles.practicePercentage}>
                      {((item.totalTime / totalPracticeTime) * 100).toFixed(0)}%
                      of total
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Icon name="chart-pie" size={48} color={theme.colors.text.default} />
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
  container: {
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLabel: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontSize: 13,
  },
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  // 3D Style Chart Card
  chartCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartContainer: {
    gap: 20,
  },
  chartLegend: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "flex-start",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text.default,
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 30,
  },
  chartArea: {
    position: "relative",
    width: 280,
    height: 280,
    alignSelf: "center",
  },
  percentageBadge: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ translateX: -20 }, { translateY: -15 }],
    zIndex: 10,
  },
  percentageBadgeText: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  // Practice Cards
  practiceCard: {
    width: "48%", // Approximately half width with gap
    borderRadius: 20,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  practiceCardLarge: {
    // First card gets more height
    height: 200, // Example fixed height for larger card
  },
  practiceGradient: {
    padding: 20,
    minHeight: 140,
    flex: 1, // Ensure gradient fills the card
    position: "relative",
  },
  practiceWatermark: {
    position: "absolute",
    right: -10,
    bottom: -10,
    opacity: 0.8,
  },
  practiceContent: {
    gap: 8,
    zIndex: 1,
  },
  practiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  practiceIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  practiceName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  practiceTime: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: -1,
    textShadowColor: "rgba(0,0,0,0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  practicePercentage: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  emptySubtext: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
  },
});
