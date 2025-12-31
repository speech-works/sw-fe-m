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
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedView = Animated.createAnimatedComponent(View);
const AnimatedG = Animated.createAnimatedComponent(G);

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
    label: "Mastery", // Was Control
    color: "#60A5FA", // Modern Blue
    icon: "target",
    description: "Managing speech techniques effectively.",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease", // Was Flow
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
      .slice(0, 3);
  }, [chartData, trends]);

  // Fill opacity delayed (starts at 75% progress, after scale completes)
  const animatedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.75, 1],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  // Helper for sparkline area
  const renderSparkline = (
    data: number[],
    width: number,
    height: number,
    color: string
  ) => {
    if (data.length < 2) return null;
    const max = Math.max(...data, 100);
    const min = Math.min(...data, 0);
    const ranges = max - min || 1;

    const points = data.map((val, i) => {
      const x = i * (width / (data.length - 1));
      const y = height - ((val - min) / ranges) * height;
      return { x, y };
    });

    const lineCmd = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`)
      .join(" ");
    const areaCmd = `${lineCmd} L ${width},${height} L 0,${height} Z`;

    return (
      <Svg
        width={width}
        height={height}
        style={{ position: "absolute", bottom: 0, right: 0 }}
      >
        <Path d={areaCmd} fill={color} fillOpacity={0.15} stroke="none" />
        <Path
          d={lineCmd}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
    );
  };

  const orangeDark = "#EA580C";

  // --- Render Logic ---
  if (loading || !trends || !chartData) {
    return (
      <View style={styles.card}>
        <SkeletonLoader width={"100%"} height={300} />
      </View>
    );
  }

  // ... (Lines 207-494) ...
  // Wait, I can't replace the middle. I have to target the specific block at the bottom.
  // The 'replacementContent' above includes the renderSparkline function which needs to be in the component scope.
  // I will insert the helper at line 187 (after hooks), and then replace the bottom render block.

  const width = Dimensions.get("window").width;
  const CHART_WIDTH = width - 48; // Padding 24 * 2
  const SIZE = 220;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 30;
  const angleStep = 360 / chartData.allDomains.length;

  // Build Static Paths (Changed to return Array of Points for Spline processing)
  const getPoints = (data: number[], scale: number = 1) => {
    return data.map((value, i) => {
      const r = (value / 100) * RADIUS * scale;
      return POLAR_TO_CARTESIAN(CENTER, CENTER, r, i * angleStep);
    });
  };

  // --- Spline / Curve Calculation ---
  const makeSmoothCurve = (
    points: { x: number; y: number }[],
    tension: number = 0.45
  ) => {
    if (points.length < 2) return "";
    const len = points.length;

    const getControlPoint = (
      current: { x: number; y: number },
      previous: { x: number; y: number },
      next: { x: number; y: number },
      reverse?: boolean
    ) => {
      const smoothing = tension;
      const oX = next.x - previous.x;
      const oY = next.y - previous.y;
      return {
        x: current.x + (reverse ? -1 : 1) * (oX * smoothing),
        y: current.y + (reverse ? -1 : 1) * (oY * smoothing),
      };
    };

    const dParts: string[] = [];
    dParts.push(`M ${points[0].x},${points[0].y}`);
    for (let i = 0; i < len; i++) {
      const current = points[i];
      const next = points[(i + 1) % len];
      const nextNext = points[(i + 2) % len];
      const prev = points[i === 0 ? len - 1 : i - 1];
      const cp1 = getControlPoint(current, prev, next);
      const cp2 = getControlPoint(next, current, nextNext, true);
      dParts.push(`C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${next.x},${next.y}`);
    }
    dParts.push("Z");
    return dParts.join(" ");
  };

  // Generate Point Objects for Data
  const currentPoints = getPoints(chartData.currentData);
  const baselinePoints = getPoints(chartData.baselineData);

  // Helper to generate a "perfect" regular polygon for the grid background
  const getGridPoints = (percentage: number) => {
    return getPoints(new Array(chartData.allDomains.length).fill(percentage));
  };

  // Generate Organic Grid Paths (Concentric Blobs)
  const gridLevels = [25, 50, 75, 100];
  const gridPaths = gridLevels.map((level) => {
    // Use slightly lower tension for grid to keep it distinguishable but soft
    return makeSmoothCurve(getGridPoints(level), 0.3);
  });

  // Generate Data Paths (High Tension = Blobby/Splatter look)
  // 0.45 tension creates that "amoeba" look from the reference
  const currentPathD = makeSmoothCurve(currentPoints, 0.45);
  const baselinePathD = makeSmoothCurve(baselinePoints, 0.3);

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
        <Svg height={SIZE} width={CHART_WIDTH} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Defs>
            <SvgGradient id="radarGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor={theme.colors.library.orange[300]}
                stopOpacity="0.7"
              />
              <Stop
                offset="1"
                stopColor={theme.colors.library.red[200]}
                stopOpacity="0.4"
              />
            </SvgGradient>
          </Defs>

          {/* Organic Grid (Concentric Blobs) */}
          {gridPaths.map((pathD, i) => (
            <Path
              key={`grid-${i}`}
              d={pathD}
              stroke={theme.colors.library.orange[200]}
              strokeWidth="1.5"
              strokeOpacity={0.4}
              fill="none"
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
                strokeDasharray="3,3"
                opacity={0.3}
              />
            );
          })}

          {/* Baseline (Static & Organic) */}
          <Path
            d={baselinePathD}
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity={0.4}
          />

          {/* Main Chart Layer */}
          <G>
            {/* 1. GLOW Effect */}
            <AnimatedPath
              d={currentPathD}
              fill="none"
              stroke={theme.colors.library.orange[300]}
              strokeWidth="12"
              strokeOpacity={0.15}
            />

            {/* 2. FILL Path */}
            <AnimatedPath
              d={currentPathD}
              fill="url(#radarGrad)"
              stroke="none"
            />
            {/* 3. STROKE Path */}
            <Path
              d={currentPathD}
              fill="none"
              stroke={theme.colors.library.orange[400]} // Darker orange stroke
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots */}
            {currentPoints.map((coord, i) => {
              return (
                <Circle
                  key={`dot-${i}`}
                  cx={coord.x}
                  cy={coord.y}
                  r="5"
                  fill="white"
                  stroke={theme.colors.library.orange[400]}
                  strokeWidth="2.5"
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

      {/* Weekly Breakthroughs (Bento Grid) */}
      <View style={styles.breakthroughContainer}>
        <Text style={styles.sectionLabel}>WEEKLY BREAKTHROUGHS</Text>

        <View style={styles.bentoGrid}>
          {/* LEFT COLUMN: HERO (Rank #1) */}
          {momentumWins[0] && (
            <View style={[styles.bentoCard, styles.heroCard]}>
              <View style={styles.heroHeader}>
                <View>
                  <Text style={styles.cardTitle}>
                    {momentumWins[0].config.label}
                  </Text>
                  <Text style={styles.heroValue}>
                    +{Math.round(momentumWins[0].percentChange)}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.iconCircle,
                    { width: 32, height: 32, backgroundColor: "#FFF7ED" },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={momentumWins[0].config.icon as any}
                    size={18}
                    color={theme.colors.library.orange[400]}
                  />
                </View>
              </View>

              {/* Big Chart at bottom */}
              <View style={styles.heroChartContainer}>
                {renderSparkline(
                  momentumWins[0].sparkHistory,
                  130,
                  60,
                  theme.colors.library.orange[400]
                )}
              </View>
            </View>
          )}

          {/* RIGHT COLUMN: STACK (Rank #2 & #3) */}
          <View style={styles.bentoRightCol}>
            {momentumWins.slice(1, 3).map((win, i) => (
              <View key={i} style={[styles.bentoCard, styles.miniCard]}>
                <View style={styles.miniContent}>
                  <View>
                    <Text style={styles.cardTitle}>{win.config.label}</Text>
                    <Text style={styles.miniValue}>
                      +{Math.round(win.percentChange)}%
                    </Text>
                  </View>
                  {/* Mini Chart on right */}
                  <View style={{ width: 60, height: 30 }}>
                    {renderSparkline(
                      win.sparkHistory,
                      60,
                      30,
                      theme.colors.library.orange[400]
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
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

  // --- Breakdown/List Section ---
  breakthroughContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakthroughRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20, // Circle
    justifyContent: "center",
    alignItems: "center",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  rowSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  rowValue: {
    fontSize: 18,
    fontWeight: "800",
    // Color set inline
  },
  separator: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginLeft: 52, // Indent to match text
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
    flexDirection: "column", // Vertical stack for narrower cards
    gap: 12,
  },
  momentumValue: { fontSize: 20, fontWeight: "800" },
  momentumSub: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },

  // --- Bento Grid Styles ---
  bentoGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  bentoCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
  },
  heroCard: {
    flex: 1.4, // Takes up more width (approx 60% vs 40%)
    justifyContent: "space-between",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 28,
    fontWeight: "800", // Heavy bold
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  iconCircle: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  heroChartContainer: {
    height: 60,
    marginTop: 12,
    justifyContent: "flex-end",
  },

  // Right Column
  bentoRightCol: {
    flex: 1,
    gap: 12,
    flexDirection: "column",
  },
  miniCard: {
    flex: 1, // fill half height each
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
  },
  miniContent: {
    flexDirection: "row", // Horizontal layout for mini cards
    justifyContent: "space-between",
    alignItems: "center",
  },
  miniValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1E293B",
  },
});

export default ClinicalStatsWidget;
