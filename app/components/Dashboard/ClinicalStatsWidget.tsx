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
import {
  ClinicalDomain,
  GrowthProfile,
} from "../../api/userBehaviorTrends/types";
import SkeletonLoader from "../SkeletonLoader";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, {
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
  withTiming,
  Easing,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import DimensionDetailModal from "./DimensionDetailModal";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedView = Animated.createAnimatedComponent(View);

// --- 1. Translation Map ---
const METRIC_CONFIG: Record<
  ClinicalDomain,
  {
    label: string;
    color: string;
    icon: string;
    description: string;
    profileKey: Exclude<keyof GrowthProfile, "lastUpdated">;
  }
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    label: "Confidence",
    color: "#4ADE80", // Modern Green
    icon: "shield-check",
    description: "Belief in your ability to speak freely.",
    profileKey: "confidence",
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    color: "#F472B6", // Modern Pink/Orange
    icon: "fire",
    description: "Facing situations without holding back.",
    profileKey: "courage",
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery", // Was Control
    color: "#60A5FA", // Modern Blue
    icon: "target",
    description: "Managing speech techniques effectively.",
    profileKey: "mastery",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease", // Was Flow
    color: "#A78BFA", // Modern Purple
    icon: "water",
    description: "Smoothness in daily communication.",
    profileKey: "ease",
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    color: "#F87171", // Modern Red
    icon: "account-group",
    description: "Active participation in social life.",
    profileKey: "social",
  },
};

// --- Helper: Polar to Cartesian ---
const POLAR_TO_CARTESIAN = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const ClinicalStatsWidget = () => {
  const {
    growthProfile,
    weeklyBreakthroughs,
    historicalProfile,
    fetchAllTrends,
    loading,
    error,
  } = useUserBehaviorTrendsStore();
  const [selectedMetric, setSelectedMetric] = useState<ClinicalDomain | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);

  // Animation Shared Value
  const progress = useSharedValue(0);

  useEffect(() => {
    // If not loaded, or stale logic (optional), fetch
    if (!growthProfile) {
      fetchAllTrends();
    }
  }, []);

  useEffect(() => {
    if (!loading && growthProfile) {
      progress.value = withTiming(1, {
        duration: 1200,
        easing: Easing.out(Easing.exp),
      });
    }
  }, [loading, growthProfile]);

  const onShare = async () => {
    try {
      await Share.share({
        message: "Check out my growth profile on SpeechWorks! 🚀",
      });
    } catch (error) {}
  };

  // --- Dynamic Subtitle Logic ---
  const getDynamicSubtitle = (): string => {
    if (!weeklyBreakthroughs) return "Loading your progress...";

    // Find the dimension with the biggest improvement
    const improvements = (
      Object.keys(weeklyBreakthroughs) as (keyof typeof weeklyBreakthroughs)[]
    )
      .filter((key) => weeklyBreakthroughs[key]?.trend === "IMPROVING")
      .map((key) => {
        const domain = (Object.keys(METRIC_CONFIG) as ClinicalDomain[]).find(
          (d) => METRIC_CONFIG[d].profileKey === key,
        );
        return {
          key,
          label: domain ? METRIC_CONFIG[domain].label : key,
          change: weeklyBreakthroughs[key]?.change || 0,
        };
      })
      .sort((a, b) => b.change - a.change);

    if (improvements.length === 0) {
      return "Building your foundation";
    }

    const best = improvements[0];
    return `Your ${best.label} improved ${Math.abs(best.change).toFixed(0)}% this week!`;
  };

  // --- Data Logic ---
  const chartData = useMemo(() => {
    if (!growthProfile) return null;
    const allDomains = Object.values(ClinicalDomain);

    const currentData = allDomains.map((domain) => {
      const key = METRIC_CONFIG[domain].profileKey;
      // The API returns values 0-100 directly where 100 is GOOD.
      // Radar chart usually plots higher val = further out.
      return growthProfile[key] || 50;
    });

    const baselineData = allDomains.map(() => 50); // Default middle if no baseline

    return { allDomains, currentData, baselineData };
  }, [growthProfile]);

  const width = Dimensions.get("window").width;
  const CHART_WIDTH = width - 48; // Padding 24 * 2
  const SIZE = 220;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 30;

  // Error State
  if (error) {
    return (
      <View style={[styles.card, styles.centerContent]}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={48}
          color={theme.colors.library.red[400]}
        />
        <Text style={styles.errorText}>Unable to load usage data</Text>
        <TouchableOpacity onPress={fetchAllTrends} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Safe guard for early render
  if (loading || !growthProfile || !chartData || !weeklyBreakthroughs) {
    return (
      <View style={styles.card}>
        <SkeletonLoader width={"100%"} height={300} />
      </View>
    );
  }

  const angleStep = 360 / chartData.allDomains.length;

  // Build Static Paths (Changed to return Array of Points for Spline processing)
  const getPoints = (data: number[], scale: number = 1) => {
    return data.map((value, i) => {
      // Normalize value 0-100 to radius
      const r = (value / 100) * RADIUS * scale;
      return POLAR_TO_CARTESIAN(CENTER, CENTER, r, i * angleStep);
    });
  };

  // --- Spline / Curve Calculation ---
  const makeSmoothCurve = (
    points: { x: number; y: number }[],
    tension: number = 0.45,
  ) => {
    if (points.length < 2) return "";
    const len = points.length;

    const getControlPoint = (
      current: { x: number; y: number },
      previous: { x: number; y: number },
      next: { x: number; y: number },
      reverse?: boolean,
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
  // const baselinePoints = getPoints(chartData.baselineData);

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

  // Generate Ghost Overlay Path (Historical Comparison)
  let historicalPathD: string | null = null;
  if (historicalProfile) {
    const historicalData = chartData.allDomains.map((domain) => {
      const key = METRIC_CONFIG[domain].profileKey;
      return historicalProfile[key] || 50;
    });
    const historicalPoints = getPoints(historicalData);
    historicalPathD = makeSmoothCurve(historicalPoints, 0.45);
  }

  // Weekly Breakthroughs Domain List
  const domainBreakthroughs = Object.keys(
    weeklyBreakthroughs,
  ) as (keyof typeof weeklyBreakthroughs)[];

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
          <Text style={styles.subtitle}>{getDynamicSubtitle()}</Text>
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
              i * angleStep,
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

          {/* Main Chart Layer */}
          <G>
            {/* Ghost Overlay (4 Weeks Ago) - Rendered First (Behind) */}
            {historicalPathD && (
              <>
                <Path
                  d={historicalPathD}
                  fill="rgba(200, 200, 200, 0.15)"
                  stroke="none"
                />
                <Path
                  d={historicalPathD}
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2"
                  strokeDasharray="6,4"
                  strokeLinecap="round"
                  opacity={0.6}
                />
              </>
            )}

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
              i * angleStep,
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
            type AlignmentBaseLine = "middle"; // Simplified
            let baseline: AlignmentBaseLine = "middle";

            return (
              <G
                key={i}
                onPress={() => {
                  setSelectedMetric(domain);
                  setModalVisible(true);
                }}
              >
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

      {/* Weekly Breakthroughs */}
      <View style={styles.breakthroughContainer}>
        <Text style={styles.sectionLabel}>WEEKLY BREAKTHROUGHS</Text>

        {(() => {
          // 1. Sort & Top 3
          const sortedKeys = domainBreakthroughs
            .sort((a, b) => {
              const scoreA = weeklyBreakthroughs[a]?.current || 0;
              const scoreB = weeklyBreakthroughs[b]?.current || 0;
              return scoreB - scoreA;
            })
            .slice(0, 3);

          if (sortedKeys.length === 0) return null;

          const topKey = sortedKeys[0];
          const secondaryKeys = sortedKeys.slice(1);

          // Helper to get config & data
          const getItem = (key: keyof typeof weeklyBreakthroughs) => {
            const data = weeklyBreakthroughs[key];
            const domain = (
              Object.keys(METRIC_CONFIG) as ClinicalDomain[]
            ).find((d) => METRIC_CONFIG[d].profileKey === key);
            const config = domain ? METRIC_CONFIG[domain] : null;
            return { data, config };
          };

          const heroItem = getItem(topKey);

          return (
            <View style={styles.heroChartContainer}>
              {/* Left Col: Hero Card */}
              {heroItem.data && heroItem.config && (
                <View
                  style={[
                    styles.miniCard,
                    styles.heroCard,
                    {
                      backgroundColor: `${heroItem.config.color}08`,
                      borderColor: `${heroItem.config.color}20`,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <View style={styles.heroHeader}>
                    <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                      {heroItem.config.label}
                    </Text>
                    <MaterialCommunityIcons
                      name={heroItem.config.icon as any}
                      size={18}
                      color={heroItem.config.color}
                    />
                  </View>
                  <Text style={styles.heroValue}>{heroItem.data.current}</Text>
                  <View style={styles.btChangeRow}>
                    {heroItem.data.change !== 0 && (
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        <Text
                          style={[
                            styles.btChange,
                            heroItem.data.trend === "IMPROVING"
                              ? styles.textSuccess
                              : styles.textNeutral,
                          ]}
                        >
                          {heroItem.data.change > 0 ? "+" : ""}
                          {heroItem.data.change.toFixed(1)}%
                        </Text>

                        <MaterialCommunityIcons
                          name={
                            heroItem.data.trend === "IMPROVING"
                              ? "trending-up"
                              : "trending-down"
                          }
                          size={16}
                          color={
                            heroItem.data.trend === "IMPROVING"
                              ? theme.colors.library.green[400]
                              : theme.colors.library.red[400]
                          }
                          style={{ marginLeft: 4 }}
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Right Col: Stacked Mini Cards */}
              <View style={styles.bentoBottomRow}>
                {secondaryKeys.map((key) => {
                  const { data, config } = getItem(key);
                  if (!data || !config) return null;
                  const isImp = data.trend === "IMPROVING";
                  const isWorsening = data.trend === "WORSENING";

                  return (
                    <View
                      key={key}
                      style={[
                        styles.miniCard,
                        {
                          backgroundColor: `${config.color}08`,
                          borderColor: `${config.color}20`,
                          borderWidth: 1,
                        },
                      ]}
                    >
                      <View style={styles.miniContent}>
                        {/* Header Row: Title Left, Icon Right */}
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            // marginBottom: 4, // Removed to fix alignment
                          }}
                        >
                          <Text style={[styles.cardTitle, { marginBottom: 0 }]}>
                            {config.label}
                          </Text>
                          <MaterialCommunityIcons
                            name={config.icon as any}
                            size={14}
                            color={config.color}
                          />
                        </View>

                        {/* Middle: Score */}
                        <Text style={styles.miniValue}>{data.current}</Text>

                        {/* Bottom: Change & Icon */}
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                            marginTop: "auto",
                          }}
                        >
                          {/* Change & Icon (Only if non-zero) */}
                          {data.change !== 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                              }}
                            >
                              <Text
                                style={[
                                  styles.btChange,
                                  isImp
                                    ? styles.textSuccess
                                    : styles.textNeutral,
                                  { fontSize: 11, fontWeight: "700" },
                                ]}
                              >
                                {data.change.toFixed(1)}%
                              </Text>

                              <MaterialCommunityIcons
                                name={isImp ? "trending-up" : "trending-down"}
                                size={14}
                                color={
                                  isImp
                                    ? theme.colors.library.green[400]
                                    : theme.colors.library.red[400]
                                }
                                style={{ marginLeft: 2 }}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}
      </View>

      {/* Dimension Detail Modal */}
      <DimensionDetailModal
        visible={modalVisible}
        domain={selectedMetric}
        currentScore={
          selectedMetric && weeklyBreakthroughs
            ? weeklyBreakthroughs[METRIC_CONFIG[selectedMetric].profileKey]
                ?.current || 0
            : 0
        }
        change={
          selectedMetric && weeklyBreakthroughs
            ? weeklyBreakthroughs[METRIC_CONFIG[selectedMetric].profileKey]
                ?.change || 0
            : 0
        }
        trend={
          selectedMetric && weeklyBreakthroughs
            ? weeklyBreakthroughs[METRIC_CONFIG[selectedMetric].profileKey]
                ?.trend || "STABLE"
            : "STABLE"
        }
        onClose={() => {
          setModalVisible(false);
          setSelectedMetric(null);
        }}
      />
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
  iconCircle: {
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    minHeight: 300,
  },
  errorText: {
    color: theme.colors.text.default,
    marginTop: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.library.orange[400],
    borderRadius: 20,
  },
  retryText: {
    color: theme.colors.text.onDark,
    fontWeight: "600",
    fontSize: 13,
  },
  heroChartContainer: {
    marginTop: 12,
    flexDirection: "column", // Vertical Stack
    gap: 12,
  },
  heroCard: {
    height: 140, // Fixed height for Hero
    justifyContent: "space-between",
    width: "100%", // Full Width
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
    fontSize: 36, // Larger for Hero
    fontWeight: "800",
    color: "#1E293B",
    letterSpacing: -1,
    marginTop: 8,
  },
  bentoBottomRow: {
    flexDirection: "row", // Horizontal Row for bottom cards
    gap: 12,
  },
  miniCard: {
    flex: 1, // Equal width
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 20,
    height: 110, // Fixed height for Mini cards
  },
  miniContent: {
    flexDirection: "column", // Stack content in mini card for vertical space
    justifyContent: "space-between",
    alignItems: "flex-start",
    height: "100%",
  },
  miniValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginTop: 4,
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
  btChangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  btChange: {
    fontSize: 11,
    fontWeight: "700",
  },
  textSuccess: { color: theme.colors.library.green[400] },
  textError: { color: theme.colors.library.red[400] },
  textNeutral: { color: theme.colors.text.default },
});

export default ClinicalStatsWidget;
