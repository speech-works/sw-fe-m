import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { PieChart } from "react-native-chart-kit";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useUserStore } from "../../../../../stores/user";
import { useProgressReportStore } from "../../../../../stores/progressReport";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import ErrorStateCard from "../../../../../components/Dashboard/ErrorStateCard";
import SkeletonLoader from "../../../../../components/SkeletonLoader";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_PADDING = 20;
const GRID_GAP = 12;
const BENTO_WIDTH = (SCREEN_WIDTH - 16 * 2 - CARD_PADDING * 2 - GRID_GAP) / 2;

type ContentTypeKey =
  | "COGNITIVE_PRACTICE"
  | "EXPOSURE_PRACTICE"
  | "FUN_PRACTICE"
  | "READING_PRACTICE";

const DPSummarySkeleton = () => {
    const chartSize = SCREEN_WIDTH - 16 * 2 - CARD_PADDING * 2;
    return (
      <View style={styles.shadowContainer}>
        <LinearGradient
          colors={["#60A5FA", "#3B82F6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.contentLayer}>
            <View style={styles.headerRow}>
              <View style={{ gap: 6 }}>
                <SkeletonLoader width={140} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                <SkeletonLoader width={180} height={14} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
              </View>
              <View style={styles.headerIconWrapper}>
                <SkeletonLoader width={16} height={16} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
              </View>
            </View>

            <View style={styles.dataArea}>
              <View style={styles.legendContainer}>
                 {[1,2].map(i => (
                    <SkeletonLoader key={i} width={70} height={24} style={{ backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20 }} />
                 ))}
              </View>

              <View style={styles.chartWrapper}>
                  <View style={[styles.chartInner, { opacity: 0.3, width: 180, height: 180 }]}>
                      <SkeletonLoader width={160} height={160} style={{ borderRadius: 80, backgroundColor: "rgba(255,255,255,0.2)" }} />
                      <View style={[styles.donutHole, { backgroundColor: "rgba(255,255,255,0.4)", width: 80, height: 80, borderRadius: 40 }]} />
                  </View>
              </View>

              <View style={styles.grid}>
                 {[1,2].map(i => (
                    <View key={i} style={[styles.gridBox, { width: BENTO_WIDTH, backgroundColor: "rgba(255,255,255,0.1)" }]}>
                       <SkeletonLoader width={60} height={12} style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                       <SkeletonLoader width={40} height={20} style={{ backgroundColor: "rgba(255,255,255,0.2)", marginTop: 4 }} />
                       <SkeletonLoader width={"100%"} height={5} style={{ backgroundColor: "rgba(255,255,255,0.1)", marginTop: 8 }} />
                    </View>
                 ))}
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
};

const DPSummary = () => {
  const { user } = useUserStore();
  const { 
    practiceStats: stats, 
    loading, 
    fetchErrors, 
    fetchAllData 
  } = useProgressReportStore();

  const chartColors: Record<ContentTypeKey, string> = {
    READING_PRACTICE: "#FCD34D",
    COGNITIVE_PRACTICE: "#FB923C",
    FUN_PRACTICE: "#60A5FA",
    EXPOSURE_PRACTICE: "#34D399",
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

  const { chartData, totalPracticeTime } = useMemo(() => {
    if (!stats || stats.length === 0) return { chartData: [], totalPracticeTime: 0 };
    
    const overallTotalTime = stats.reduce(
      (sum, item) => sum + item.totalTime,
      0,
    );

    const dataForChart = stats.map((item) => {
      const contentType = item.contentType as ContentTypeKey;
      return {
        name: contentTypeLabels[contentType] || item.contentType,
        totalTime: item.totalTime,
        color: chartColors[contentType] || "#CCCCCC",
        legendFontColor: "rgba(255,255,255,0.9)",
        legendFontSize: 12,
      };
    });

    return { chartData: dataForChart, totalPracticeTime: overallTotalTime };
  }, [stats]);

  const handleRetry = () => {
    if (user?.id) {
       fetchAllData(user.id, true);
    }
  };

  const formatTime = (timeInMinutes: number) => {
    if (timeInMinutes < 60) return `${Math.round(timeInMinutes)}m`;
    return `${(timeInMinutes / 60).toFixed(1)}h`;
  };

  const chartSize = SCREEN_WIDTH - 16 * 2 - CARD_PADDING * 2;

  // Show error if we have no data and it's not refreshing
  if (!stats?.length && fetchErrors.practiceStats && !loading) {
    return (
      <ErrorStateCard 
        onRetry={handleRetry}
        variant="light"
        title="Practice breakdown unavailable"
        message="We're having trouble showing your activity mix for this week."
        style={{ marginVertical: 0 }}
      />
    );
  }

  if (loading && (!stats || stats.length === 0)) {
    return <DPSummarySkeleton />;
  }

  return (
    <View style={styles.shadowContainer}>
      <LinearGradient
        colors={["#60A5FA", "#3B82F6"]} // Medium Blue Gradient - lighter than before but still vibrant
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Background Watermark Bubbles (Inspired by profile card) */}
        <View style={styles.bubbleTopRight} />
        <View style={styles.bubbleBottomLeft} />

        <View style={styles.contentLayer}>
          {/* Header Pattern — matches Weekly/Mood summaries */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerLabel}>PRACTICE DISTRIBUTION</Text>
              <Text style={styles.headerSubtitle}>
                Category breakdown this week
              </Text>
            </View>
            <View style={styles.headerIconWrapper}>
              <Icon name="chart-pie" size={16} color="#FFFFFF" />
            </View>
          </View>

          {chartData.length > 0 && totalPracticeTime > 0 ? (
            <View style={styles.dataArea}>
              {/* Modern Legends Capsules (Glassmorphic) */}
              <View style={styles.legendContainer}>
                {chartData.map((item) => (
                  <View key={item.name} style={styles.legendCapsule}>
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

              {/* Donut Chart with Center Label */}
              <View style={styles.chartWrapper}>
                <View style={styles.chartInner}>
                  <PieChart
                    data={chartData.map((item) => ({
                      name: item.name,
                      population: item.totalTime,
                      color: item.color,
                      legendFontColor: "rgba(255,255,255,0.95)",
                      legendFontSize: 12,
                    }))}
                    width={chartSize}
                    height={240}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                    }}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={(chartSize / 4).toString()} // Center alignment
                    hasLegend={false}
                    center={[0, 0]}
                    absolute
                  />
                  {/* The Donut "Hole" */}
                  <View style={styles.donutHole}>
                    <Text style={styles.totalLabel}>TOTAL</Text>
                    <Text style={styles.totalValue}>
                      {formatTime(totalPracticeTime)}
                    </Text>
                  </View>

                  {/* Percentage Badges (Pop out effect) */}
                  {chartData.map((item, index) => {
                    const percentage = Math.round(
                      (item.totalTime / totalPracticeTime) * 100,
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
                    const labelRadius = 80; // Distance from center

                    return (
                      <View
                        key={`badge-${index}`}
                        style={[
                          styles.percentageBadge,
                          {
                            left: 110 + labelRadius * Math.cos(angleRad), // offset to align with chart area
                            top: 120 + labelRadius * Math.sin(angleRad),
                          },
                        ]}
                      >
                        <Text style={styles.percentageText}>{percentage}%</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Tight Bento Grid */}
              <View style={styles.grid}>
                {chartData.map((item, idx) => {
                  const contentType = Object.keys(contentTypeLabels).find(
                    (key) =>
                      contentTypeLabels[key as ContentTypeKey] === item.name,
                  ) as ContentTypeKey;
                  const color = chartColors[contentType] || "#EEE";
                  const icon = icons[contentType] || "circle";
                  const isLarge = chartData.length % 2 !== 0 && idx === 0;

                  return (
                    <View
                      key={item.name}
                      style={[
                        styles.gridBox,
                        { width: isLarge ? "100%" : BENTO_WIDTH },
                      ]}
                    >
                      {/* Icon Watermark in background of the box */}
                      <View style={styles.boxWatermark}>
                        <Icon name={icon} size={60} color="rgba(255,255,255,0.08)" />
                      </View>

                      <View style={styles.boxHeader}>
                        <View style={styles.boxInfo}>
                          <Text style={styles.boxLabel}>{item.name}</Text>
                          <Text style={styles.boxTime}>
                            {formatTime(item.totalTime)}
                          </Text>
                        </View>
                      </View>
                      {/* Category track bar */}
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              backgroundColor: color,
                              width: `${(item.totalTime / totalPracticeTime) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="chart-pie" size={48} color="rgba(255,255,255,0.4)" />
              <Text style={styles.emptyText}>No practice data found</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

export default DPSummary;

const styles = StyleSheet.create({
  shadowContainer: {
    borderRadius: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: "#EFF6FF",
    overflow: "hidden",
  },
  gradient: {
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 22,
    minHeight: 280,
    position: "relative",
  },
  bubbleTopRight: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  contentLayer: {
    flex: 1,
    zIndex: 1,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  headerSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
  },
  headerIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  dataArea: {
    gap: 24,
  },
  legendContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  legendCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  chartInner: {
    position: "relative",
    width: 220,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
  },
  donutHole: {
    position: "absolute",
    backgroundColor: "#FFF",
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E293B",
  },
  percentageBadge: {
    position: "absolute",
    backgroundColor: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    transform: [{ translateX: -15 }, { translateY: -10 }],
  },
  percentageText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1E293B",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  gridBox: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    overflow: "hidden", // Crucial for watermark
    position: "relative",
  },
  boxWatermark: {
    position: "absolute",
    bottom: -15,
    right: -10,
    opacity: 0.8,
  },
  boxHeader: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  boxInfo: {
    gap: 2,
  },
  boxLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  boxTime: {
    fontSize: 20,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  progressBarBg: {
    height: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.7)",
  },
});


