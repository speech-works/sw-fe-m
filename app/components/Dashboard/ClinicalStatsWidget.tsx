import React, { useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Share,
} from "react-native";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import { theme } from "../../Theme/tokens";
import { ClinicalDomain } from "../../api/userBehaviorTrends/types";
import SkeletonLoader from "../SkeletonLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, {
  Polygon,
  Line,
  Circle,
  Text as SvgText,
  G,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  withDelay,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedG = Animated.createAnimatedComponent(G); // Defined outside to avoid remounts

// --- 1. Translation Map ---
const METRIC_CONFIG: Record<
  ClinicalDomain,
  { label: string; color: string; icon: string; description: string }
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    label: "Confidence",
    color: "#4ADE80", // Modern Green
    icon: "shield-check",
    description: "Belief in your ability to speak freely.",
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    color: "#F472B6", // Modern Pink/Orange
    icon: "fire",
    description: "Facing situations without holding back.",
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Control",
    color: "#60A5FA", // Modern Blue
    icon: "target",
    description: "Managing speech techniques effectively.",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Flow",
    color: "#A78BFA", // Modern Purple
    icon: "water",
    description: "Smoothness in daily communication.",
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    color: "#F87171", // Modern Red
    icon: "account-group",
    description: "Active participation in social life.",
  },
};

// --- Helper: Polar to Cartesian ---
const POLAR_TO_CARTESIAN = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const ClinicalStatsWidget = () => {
  const { trends, fetchAllTrends, loading } = useUserBehaviorTrendsStore();
  const [selectedMetric, setSelectedMetric] = useState<ClinicalDomain | null>(
    null
  );

  // Animation Shared Value
  const progress = useSharedValue(0);

  useEffect(() => {
    fetchAllTrends();
  }, []);

  useEffect(() => {
    if (!loading && trends) {
      progress.value = withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.exp),
      });
    }
  }, [loading, trends]);

  const onShare = async () => {
    try {
      await Share.share({
        message: "Check out my growth profile on SpeechWorks! 🚀",
      });
    } catch (error) {}
  };

  // --- Data Logic ---
  const chartData = useMemo(() => {
    if (!trends) return null;
    const allDomains = Object.values(ClinicalDomain);

    const currentData = allDomains.map((domain) => {
      const trend = trends[domain];
      const latest = trend?.history[trend.history.length - 1]?.score ?? 50;
      return 100 - latest;
    });

    const baselineData = allDomains.map((domain) => {
      const trend = trends[domain];
      const first = trend?.history[0]?.score ?? 50;
      return 100 - first;
    });

    return { allDomains, currentData, baselineData };
  }, [trends]);

  // --- Momentum Logic ---
  const momentumWins = useMemo(() => {
    if (!trends || !chartData) return [];

    return chartData.allDomains
      .map((domain, i) => {
        const trend = trends[domain];
        const historyReverse = trend?.history.slice().reverse() || [];

        const thisWeekData = historyReverse
          .slice(0, 7)
          .map((h) => 100 - h.score);
        const lastWeekData = historyReverse
          .slice(7, 14)
          .map((h) => 100 - h.score);

        const thisWeekAvg = thisWeekData.length
          ? thisWeekData.reduce((a, b) => a + b, 0) / thisWeekData.length
          : 0;
        const lastWeekAvg = lastWeekData.length
          ? lastWeekData.reduce((a, b) => a + b, 0) / lastWeekData.length
          : thisWeekAvg;

        let percentChange = 0;
        if (lastWeekAvg > 0)
          percentChange = ((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100;

        const isNew = historyReverse.length < 3;
        const sparkHistory = (trend?.history || [])
          .slice(-10)
          .map((h) => 100 - h.score);

        return {
          domain,
          percentChange,
          isNew,
          sparkHistory,
          config: METRIC_CONFIG[domain],
        };
      })
      .sort((a, b) => b.percentChange - a.percentChange)
      .slice(0, 2);
  }, [chartData, trends]);

  // Fill opacity delayed (starts at 75% progress, after scale completes)
  const animatedProps = useAnimatedProps(() => ({
    opacity: interpolate(
      progress.value,
      [0.75, 1],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  // --- Render Logic ---
  if (loading || !trends || !chartData) {
    return (
      <View style={styles.card}>
        <SkeletonLoader width={"100%"} height={300} />
      </View>
    );
  }

  const width = Dimensions.get("window").width;
  const CHART_WIDTH = width - 48; // Padding 24 * 2
  const SIZE = 220;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 30;
  const angleStep = 360 / chartData.allDomains.length;

  // Build Static Paths
  const buildPath = (data: number[], scale: number = 1) => {
    return data
      .map((value, i) => {
        const r = (value / 100) * RADIUS * scale;
        const coord = POLAR_TO_CARTESIAN(CENTER, CENTER, r, i * angleStep);
        return `${coord.x},${coord.y}`;
      })
      .join(" ");
  };

  // We will render the polygon assuming full size, and scale it via <G>
  const currentPolygonPoints = buildPath(chartData.currentData);
  const baselinePolygonPoints = buildPath(chartData.baselineData);

  return (
    <LinearGradient
      colors={["white", "white"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>GROWTH PROFILE</Text>
          <Text style={styles.subtitle}>Your potential is expanding</Text>
        </View>
        <TouchableOpacity onPress={onShare} style={styles.iconBtn}>
          <MaterialCommunityIcons
            name="share-variant-outline"
            size={20}
            color={theme.colors.text.default}
          />
        </TouchableOpacity>
      </View>

      {/* Radar Chart */}
      <View style={styles.chartContainer}>
        {/* 
                    Use viewBox to define the internal coordinate system (0,0 to SIZE,SIZE).
                    'width="100%"' allows it to fill the container.
                    Default preserveAspectRatio "xMidYMid meet" will center the content.
                */}
        <Svg height={SIZE} width={CHART_WIDTH} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Defs>
            <SvgGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor={theme.colors.library.orange[400]}
                stopOpacity="0.6"
              />
              <Stop
                offset="1"
                stopColor={theme.colors.library.orange[200]}
                stopOpacity="0.2"
              />
            </SvgGradient>
          </Defs>

          {/* Circular Grid Steps */}
          {[25, 50, 75, 100].map((p, i) => (
            <Circle
              key={p}
              cx={CENTER}
              cy={CENTER}
              r={(p / 100) * RADIUS}
              stroke={theme.colors.library.red[200]}
              strokeWidth="1"
              strokeDasharray={i === 3 ? "0" : "4,4"} // Solid outer ring
              fill="none"
              opacity={0.5}
            />
          ))}

          {/* Axes */}
          {chartData.allDomains.map((_, i) => {
            const end = POLAR_TO_CARTESIAN(
              CENTER,
              CENTER,
              RADIUS,
              i * angleStep
            );
            return (
              <Line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                stroke={theme.colors.surface.disabled}
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Baseline (Static) */}
          <Polygon
            points={baselinePolygonPoints}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeDasharray="4,4"
            opacity={0.5}
          />

          {/* Animated Current Layer: Static Group Now */}
          <G>
            {/* 1. FILL Polygon: Delayed Opacity */}
            <AnimatedPolygon
              points={currentPolygonPoints}
              fill="url(#radarGrad)"
              stroke="none"
              animatedProps={animatedProps}
            />
            {/* 2. STROKE Polygon: Static */}
            <Polygon
              points={currentPolygonPoints}
              fill="none"
              stroke={theme.colors.library.red[300]}
              strokeWidth="2.5"
            />

            {/* Dots (Static) */}
            {chartData.currentData.map((val, i) => {
              const r = (val / 100) * RADIUS;
              const coord = POLAR_TO_CARTESIAN(
                CENTER,
                CENTER,
                r,
                i * angleStep
              );
              return (
                <Circle
                  key={`dot-${i}`}
                  cx={coord.x}
                  cy={coord.y}
                  r="4"
                  fill="white"
                  stroke={theme.colors.library.red[300]}
                  strokeWidth="2"
                />
              );
            })}
          </G>

          {/* Labels */}
          {chartData.allDomains.map((domain, i) => {
            // Position with slightly more padding
            const pos = POLAR_TO_CARTESIAN(
              CENTER,
              CENTER,
              RADIUS + 24,
              i * angleStep
            );
            const config = METRIC_CONFIG[domain];
            const isSelected = selectedMetric === domain;

            // Determine text anchor based on horizontal position
            type TextAnchor = "start" | "middle" | "end";
            let anchor: TextAnchor = "middle";
            if (pos.x < CENTER - 10) anchor = "end";
            if (pos.x > CENTER + 10) anchor = "start";

            // Determine vertical baseline adjustment
            // react-native-svg expects proper AlignmentBaseline type
            type AlignmentBaseLine =
              | "middle"
              | "baseline"
              | "text-bottom"
              | "alphabetic"
              | "ideographic"
              | "central"
              | "mathematical"
              | "text-top"
              | "bottom"
              | "center"
              | "top"
              | "text-before-edge"
              | "text-after-edge"
              | "before-edge"
              | "after-edge"
              | "hanging";
            let baseline: AlignmentBaseLine = "middle";

            return (
              <G key={i} onPress={() => setSelectedMetric(domain)}>
                {/* Large Touchable Area (Quasi-transparent for hit testing) */}
                <Circle cx={pos.x} cy={pos.y} r="45" fill="rgba(0,0,0,0.01)" />

                {/* Text Label */}
                <SvgText
                  key={`text-${i}`}
                  x={pos.x}
                  y={pos.y}
                  fill={
                    isSelected ? config.color : theme.colors.library.red[300]
                  }
                  fontSize={isSelected ? "11" : "10"}
                  fontWeight={isSelected ? "800" : "600"}
                  textAnchor={anchor}
                  alignmentBaseline={baseline}
                >
                  {config.label.toUpperCase()}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Tooltip */}
      <AnimatedView
        style={[styles.tooltipWrapper, { opacity: selectedMetric ? 1 : 0 }]}
      >
        {selectedMetric ? (
          <View style={styles.tooltipSubtleCard}>
            <MaterialCommunityIcons
              name="information-variant"
              size={16}
              color={theme.colors.library.orange[400]}
              style={{ marginTop: 1 }}
            />
            <Text style={styles.tooltipSubtleText}>
              {METRIC_CONFIG[selectedMetric].description}
            </Text>
          </View>
        ) : (
          // Placeholder height
          <View style={styles.tooltipPlaceholder} />
        )}
      </AnimatedView>

      {/* Momentum Cards */}
      <Text style={styles.sectionLabel}>MOMENTUM & WINS</Text>
      <View style={styles.momentumRow}>
        {momentumWins.map((win, index) => {
          const isPositive = win.percentChange > 0;
          const showGreen = isPositive && !win.isNew;

          // Helper for sparkline
          const getSparklinePath = (data: number[]) => {
            if (data.length < 2) return "";
            const max = Math.max(...data, 100);
            const min = Math.min(...data, 0);
            const width = 60;
            const height = 30;
            const ranges = max - min || 1;
            return data
              .map((val, i) => {
                const x = i * (width / (data.length - 1));
                const y = height - ((val - min) / ranges) * height;
                return `${i === 0 ? "M" : "L"} ${x},${y}`;
              })
              .join(" ");
          };
          const path = getSparklinePath(win.sparkHistory);

          return (
            <LinearGradient
              key={index}
              colors={["#FFFFFF", "#F8FAFC"]}
              style={styles.momentumCard}
            >
              <View style={styles.momentumHeader}>
                <LinearGradient
                  colors={[win.config.color, "#fff"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconBox}
                >
                  <MaterialCommunityIcons
                    name={win.config.icon as any}
                    size={14}
                    color="white"
                  />
                </LinearGradient>
                <Text style={styles.momentumLabel}>{win.config.label}</Text>
              </View>

              <View style={styles.momentumContent}>
                <View>
                  {win.isNew ? (
                    <Text style={styles.momentumSub}>Establishing...</Text>
                  ) : (
                    <View
                      style={{ flexDirection: "row", alignItems: "baseline" }}
                    >
                      <Text
                        style={[
                          styles.momentumValue,
                          {
                            color: showGreen
                              ? "#10B981"
                              : theme.colors.text.disabled,
                          },
                        ]}
                      >
                        {isPositive ? "+" : ""}
                        {Math.round(win.percentChange)}%
                      </Text>
                    </View>
                  )}
                  <Text style={styles.momentumSub}>vs last week</Text>
                </View>
                <Svg width={60} height={30}>
                  <Path
                    d={path}
                    fill="none"
                    stroke={win.config.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            </LinearGradient>
          );
        })}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 24,
    marginVertical: 12,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    marginVertical: 12,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: 1,
  },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  iconBtn: {
    padding: 8,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    height: 220,
    marginBottom: 8,
  },
  tooltipWrapper: {
    marginBottom: 20,
    minHeight: 50,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: 16,
  },
  tooltipSubtleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC", // Very subtle gray/blue
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)", // Almost invisible border
  },
  tooltipSubtleText: {
    fontSize: 13,
    color: "#475569", // Softer text color
    fontWeight: "500",
    lineHeight: 18,
    flex: 1,
  },
  tooltipPlaceholder: {
    height: 50,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    marginBottom: 12,
  },
  momentumRow: { flexDirection: "row", gap: 12 },
  momentumCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  momentumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  momentumLabel: { fontSize: 13, fontWeight: "700", color: "#334155" },
  momentumContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  momentumValue: { fontSize: 18, fontWeight: "800" },
  momentumSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
});

export default ClinicalStatsWidget;
