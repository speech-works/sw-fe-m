import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Stop,
  LinearGradient as SvgGradient,
  Text as SvgText,
} from "react-native-svg";
import {
  ClinicalDomain,
  GrowthProfile,
} from "../../api/userBehaviorTrends/types";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import { theme } from "../../Theme/tokens";
import SkeletonLoader from "../SkeletonLoader";
import DimensionDetailModal from "./DimensionDetailModal";
import ErrorStateCard from "./ErrorStateCard";
import { TourGuideZone } from "rn-tourguide";

interface ClinicalStatsWidgetProps {
  onLayoutCapture?: (order: number, event: any) => void;
}

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

const ClinicalStatsWidget = ({ onLayoutCapture }: ClinicalStatsWidgetProps) => {
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

  // --- Refresh Handler ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rotationAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);

  const onRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    // Start continuous rotation animation
    rotationAnim.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1, // Infinite repeat
      false, // Don't reverse
    );

    // Subtle pulse on card
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(0.98, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    try {
      await fetchAllTrends();
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      // Stop animations
      rotationAnim.value = withTiming(0, { duration: 200 });
      pulseAnim.value = withTiming(1, { duration: 200 });
      setIsRefreshing(false);
    }
  };

  const refreshIconStyle = useAnimatedStyle(
    () => ({
      // Avoids template-literal allocation per frame — string concat is faster
      transform: [{ rotate: rotationAnim.value + "deg" }],
    }),
    [],
  );

  const cardPulseStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: pulseAnim.value }],
    }),
    [],
  );

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
  const RADIUS = SIZE / 2 - 45; // Slightly more padding for labels
  const angleStep = chartData ? 360 / chartData.allDomains.length : 72;

  // --- Memoized heavy SVG path computations (must be before early returns for hooks rules) ---
  const {
    currentPoints,
    gridPaths,
    currentPathD,
    historicalPathD,
    baselinePathD,
  } = useMemo(() => {
    if (!chartData) {
      return {
        currentPoints: [],
        gridPaths: [],
        currentPathD: "",
        historicalPathD: null as string | null,
        baselinePathD: "",
      };
    }

    const _getPoints = (data: number[], scale: number = 1) => {
      return data.map((value, i) => {
        const r = (value / 100) * RADIUS * scale;
        return POLAR_TO_CARTESIAN(CENTER, CENTER, r, i * angleStep);
      });
    };

    const _makeSmoothCurve = (
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
        dParts.push(
          `C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${next.x},${next.y}`,
        );
      }
      dParts.push("Z");
      return dParts.join(" ");
    };

    const _getGridPoints = (percentage: number) => {
      return _getPoints(
        new Array(chartData.allDomains.length).fill(percentage),
      );
    };

    const _currentPoints = _getPoints(chartData.currentData);

    const gridLevels = [25, 50, 75, 100];
    const _gridPaths = gridLevels.map((level) => {
      return _makeSmoothCurve(_getGridPoints(level), 0.3);
    });

    const _currentPathD = _makeSmoothCurve(_currentPoints, 0.45);

    let _historicalPathD: string | null = null;
    if (historicalProfile) {
      const historicalData = chartData.allDomains.map((domain) => {
        const key = METRIC_CONFIG[domain].profileKey;
        return historicalProfile[key] || 50;
      });
      const historicalPoints = _getPoints(historicalData);
      _historicalPathD = _makeSmoothCurve(historicalPoints, 0.45);
    }

    return {
      currentPoints: _currentPoints,
      gridPaths: _gridPaths,
      currentPathD: _currentPathD,
      historicalPathD: _historicalPathD,
      baselinePathD: _makeSmoothCurve(_getPoints(chartData.baselineData), 0.45),
    };
  }, [chartData, historicalProfile]);

  // Error State
  if (error) {
    return (
      <ErrorStateCard
        onRetry={fetchAllTrends}
        variant="dark"
        style={{ marginVertical: 16 }}
      />
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

  // Weekly Breakthroughs Domain List
  const domainBreakthroughs = Object.keys(
    weeklyBreakthroughs,
  ) as (keyof typeof weeklyBreakthroughs)[];

  return (
    <View>
      <View
        // Vibrant Purple/Violet Gradient for Growth/Insights
        style={styles.container}
      >
        {/* Decorative Bubbles */}
        <View style={styles.decorBubble1} />
        <View style={styles.decorBubble2} />
        <View style={styles.decorBubble3} />

        {/* Header */}
        {/* Header */}
        <View style={styles.header}>
          {/* Top Row: Chip + Refresh */}
          <View style={styles.headerTopRow}>
            <View style={styles.chip}>
              <MaterialCommunityIcons
                name="chart-donut"
                size={12}
                color={theme.colors.library.orange[500]}
              />
              <Text style={styles.chipText}>Tracking</Text>
            </View>

            <TouchableOpacity
              onPress={onRefresh}
              disabled={isRefreshing}
              activeOpacity={0.8}
              style={[
                styles.refreshBtn,
                isRefreshing && styles.refreshBtnActive,
              ]}
            >
              <Animated.View style={refreshIconStyle}>
                <MaterialCommunityIcons
                  name="sync"
                  size={14}
                  color={
                    isRefreshing
                      ? theme.colors.library.blue[500]
                      : theme.colors.text.default
                  }
                />
              </Animated.View>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {/* Title & Subtitle */}
          <View style={styles.textContainer}>
            <Text style={styles.bigTitle}>Growth Profile</Text>
            <Text style={styles.subtitle}>{getDynamicSubtitle()}</Text>
          </View>
        </View>

        {/* Main Content Panel (White) */}
        <View style={styles.contentPanel}>
          {/* Radar Chart Section - Step 7 */}
          <TourGuideZone
            zone={7}
            text="Growth Profile: This radar chart visualizes your progress across 5 key clinical domains. A larger, more balanced shape indicates holistic speech growth."
            shape="rectangle"
          >
            <View
              style={styles.chartContainer}
              onLayout={(e) => {
                onLayoutCapture?.(7, e);
              }}
            >
              <Svg
                height={SIZE}
                width={CHART_WIDTH}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
              >
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
                    stroke={theme.colors.library.gray[200]}
                    strokeWidth="0.5" // Thinner grid
                    strokeDasharray="4,2" // Tighter dash
                    fill="none"
                    opacity={0.6} // Subtler
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
                      stroke={theme.colors.library.gray[200]} // Lighter axis
                      strokeWidth="1"
                      strokeDasharray="2,2" // Tighter dash
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

                  {/* Average Baseline Chart (Grey) */}
                  <Path
                    d={baselinePathD}
                    fill="rgba(156, 163, 175, 0.1)" // Gray-400 with opacity
                    stroke={theme.colors.library.gray[400]}
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity={0.8}
                  />

                  {/* 1. GLOW Effect */}
                  <AnimatedPath
                    d={currentPathD}
                    fill="none"
                    stroke={theme.colors.library.orange[300]}
                    strokeWidth="12"
                    strokeOpacity={0.1} // Reduced glow opacity
                  />

                  {/* 2. FILL Path */}
                  <AnimatedPath
                    d={currentPathD}
                    fill="url(#radarGrad)"
                    stroke="none"
                    opacity={0.9}
                  />
                  {/* 3. STROKE Path */}
                  <Path
                    d={currentPathD}
                    fill="none"
                    stroke={theme.colors.library.orange[400]} // Darker orange stroke
                    strokeWidth="2.5" // Slightly thinner stroke
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
                        r="4" // Smaller dots
                        fill="white"
                        stroke={theme.colors.library.orange[400]}
                        strokeWidth="2" // Thinner dot stroke
                      />
                    );
                  })}
                </G>

                {/* Labels (Simplified) */}
                {chartData.allDomains.map((domain, i) => {
                  const pos = POLAR_TO_CARTESIAN(
                    CENTER,
                    CENTER,
                    RADIUS + 28, // More breathing room
                    i * angleStep,
                  );
                  const config = METRIC_CONFIG[domain];
                  const isSelected = selectedMetric === domain;

                  // Determine text anchor based on horizontal position
                  type TextAnchor = "start" | "middle" | "end";
                  let anchor: TextAnchor = "middle";
                  if (pos.x < CENTER - 10) anchor = "end";
                  if (pos.x > CENTER + 10) anchor = "start";

                  // Check if this is the SOCIAL domain (Particption Restriction)
                  const isSocial =
                    domain === ClinicalDomain.PARTICIPATION_RESTRICTION;

                  return (
                    <G
                      key={i}
                      onPress={() => {
                        setSelectedMetric(domain);
                        setModalVisible(true);
                      }}
                    >
                      {/* Hit Area */}
                      <Circle cx={pos.x} cy={pos.y} r="40" fill="transparent" />

                      {isSocial ? (
                        <TourGuideZone
                          zone={8}
                          text="Social Impact: This metric tracks your comfort and participation in social settings. Improving this score means you're reclaiming your voice in your community."
                          shape="rectangle"
                        >
                          {/* Inner wrapper View to capture the label layout precisely */}
                          <View
                            onLayout={(e) => {
                              // Report layout to parent Home/index.tsx
                              // Note: SVG positions are internal, but the TourGuideZone wrapper
                              // around a View inside foreignObject (or similar) is tricky.
                              // Since we're in Execution, let's use a cleaner approach:
                              // We'll wrap the Text in a TourGuideZone, but TourGuide usually wants Views.
                              // Actually, rn-tourguide works best with Views.
                              // We will place an absolute View overlay for the SOCIAL label.
                              onLayoutCapture?.(8, e);
                            }}
                            style={{
                              position: "absolute",
                              left: pos.x - 40, // Match anchor and width approx
                              top: pos.y - 15,
                              width: 80,
                              height: 30,
                              backgroundColor: "transparent",
                            }}
                          />
                        </TourGuideZone>
                      ) : null}

                      {/* Text Label */}
                      <SvgText
                        key={`text-${i}`}
                        x={pos.x}
                        y={pos.y}
                        fill={
                          isSelected ? config.color : theme.colors.text.default
                        }
                        fontSize={isSelected ? "11" : "10"}
                        fontWeight={isSelected ? "800" : "600"}
                        textAnchor={anchor}
                        alignmentBaseline="middle"
                      >
                        {config.label.toUpperCase()}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>
          </TourGuideZone>

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
                          borderWidth: 1,
                          borderColor: theme.colors.library.gray[100],
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
                      <Text style={styles.heroValue}>
                        {Math.round(heroItem.data.current)}
                      </Text>
                      <View style={styles.btChangeRow}>
                        {heroItem.data.change !== 0 && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                            }}
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

                  {/* Bottom Row: 2 Mini Cards Side-by-Side */}
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {secondaryKeys.map((key) => {
                      const { data, config } = getItem(key);
                      if (!data || !config) return null;
                      const isImp = data.trend === "IMPROVING";

                      return (
                        <View
                          key={key}
                          style={[
                            styles.miniCard,
                            {
                              // Override defaults for Grid layout
                              borderWidth: 1,
                              borderColor: theme.colors.library.gray[100],
                              flex: 1,
                              height: 100, // Fixed height for alignment
                              padding: 12,
                            },
                          ]}
                        >
                          <View
                            style={{
                              flexDirection: "column",
                              justifyContent: "space-between",
                              height: "100%",
                            }}
                          >
                            <View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  width: "100%",
                                }}
                              >
                                <Text
                                  style={[
                                    styles.cardTitle,
                                    { marginBottom: 0 },
                                  ]}
                                >
                                  {config.label}
                                </Text>
                                <MaterialCommunityIcons
                                  name={config.icon as any}
                                  size={16}
                                  color={config.color}
                                />
                              </View>

                              {/* Change Trend */}
                              {data.change !== 0 && (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginTop: 4,
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
                                    {data.change > 0 ? "+" : ""}
                                    {data.change.toFixed(1)}%
                                  </Text>
                                  <MaterialCommunityIcons
                                    name={
                                      isImp ? "trending-up" : "trending-down"
                                    }
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

                            {/* Score */}
                            <Text style={styles.miniValue}>
                              {Math.round(data.current)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })()}
          </View>
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    padding: 24,
    marginVertical: 12,
    backgroundColor: "white",
    overflow: "hidden", // Clip bubbles
    borderWidth: 1,
    borderColor: theme.colors.library.gray[200],
    // Soft SaaS Shadow
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  contentPanel: {
    // No background color needed (already on white)
    marginTop: 12,
    paddingHorizontal: 8, // Less padding, let chart breathe
  },

  btChangeRow: {
    marginTop: "auto",
    paddingTop: 12,
  },
  miniValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    marginVertical: 12,
    padding: 20,
  },
  // Decorative Elements (White transparent overlays)

  header: {
    marginBottom: 20,
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.library.orange[100], // Orange Theme
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.library.orange[200],
  },
  chipText: {
    color: theme.colors.library.orange[400],
    fontSize: 12,
    fontWeight: "700",
  },
  textContainer: {
    gap: 4,
  },
  bigTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text.title, // Dark
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.default, // Gray
    lineHeight: 20,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8, // More "tech" look than fully round pill
    borderWidth: 1,
    borderColor: "#E2E8F0", // Slate 200 - subtle border
    gap: 6,
    // Subtle shadow for lift
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  refreshBtnActive: {
    backgroundColor: "#F1F5F9", // Slate 100
    borderColor: "#CBD5E1", // Slate 300
    transform: [{ scale: 0.98 }], // Micro-interaction squeeze
  },
  refreshText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569", // Slate 600 - crisp text
    letterSpacing: 0.2,
    textTransform: "uppercase",
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
    color: theme.colors.text.title,
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

  btChange: {
    fontSize: 11,
    fontWeight: "700",
  },
  textSuccess: { color: theme.colors.library.green[400] },
  textError: { color: theme.colors.library.red[400] },
  textNeutral: { color: theme.colors.text.default },

  // Decorative Bubbles
  decorBubble1: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.library.purple[100],
    opacity: 0.5,
  },
  decorBubble2: {
    position: "absolute",
    top: 60,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.library.orange[100],
    opacity: 0.4,
  },
  decorBubble3: {
    position: "absolute",
    bottom: -20,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.library.blue[100],
    opacity: 0.3,
  },
});

export default React.memo(ClinicalStatsWidget);
