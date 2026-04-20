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
  GrowthProfileMetrics,
} from "../../api/userBehaviorTrends/types";
import { GrowthProfileAxisKey } from "../../api/overallState/types";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import { theme } from "../../Theme/tokens";
import SkeletonLoader from "../SkeletonLoader";
import DimensionDetailModal from "./DimensionDetailModal";
import ErrorStateCard from "./ErrorStateCard";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// --- 1. Translation Map ---
const METRIC_CONFIG: Record<
  ClinicalDomain,
  {
    label: string;
    color: string;
    icon: string;
    description: string;
    profileKey: keyof GrowthProfileMetrics;
  }
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    label: "Confidence",
    color: "#059669", // Emerald 600 - Highly visible green
    icon: "shield-check",
    description: "Belief in your ability to speak freely.",
    profileKey: "confidence",
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    color: "#E11D48", // Rose 600 - Warm and visible red/pink
    icon: "fire",
    description: "Facing situations without holding back.",
    profileKey: "courage",
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery", // Was Control
    color: "#0284C7", // Sky 600 - Deep cyan/blue
    icon: "target",
    description: "Managing speech techniques effectively.",
    profileKey: "mastery",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease", // Was Flow
    color: "#8B5CF6", // Violet 500 - Solid purple
    icon: "water",
    description: "Smoothness in daily communication.",
    profileKey: "ease",
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    color: "#EA580C", // Orange 600 - Vibrant, visible orange
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

type BreakthroughItem = {
  key: GrowthProfileAxisKey;
  domain: ClinicalDomain;
  config: (typeof METRIC_CONFIG)[ClinicalDomain];
  current: number;
  previous: number | null;
  absoluteDelta: number | null;
  percentDelta: number | null;
  hasComparison: boolean;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
};

const ClinicalStatsWidget = ({ style }: { style?: any }) => {
  const {
    overallState,
    historyBuckets,
    fetchAllTrends,
    loading,
    error,
  } = useUserBehaviorTrendsStore();
  const [selectedMetric, setSelectedMetric] = useState<ClinicalDomain | null>(
    null,
  );
  const [modalVisible, setModalVisible] = useState(false);
  const combinedProfile = overallState?.profile?.axes?.combined ?? null;
  const isMomentumSlipping =
    overallState?.profile?.meta?.momentumState === "SLIPPING";

  // --- Refresh Handler ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rotationAnim = useSharedValue(0);
  const pulseAnim = useSharedValue(1);
  const downfallAnim = useSharedValue(0);

  useEffect(() => {
    if (isMomentumSlipping) {
      downfallAnim.value = withRepeat(
        withSequence(
          withTiming(15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      downfallAnim.value = 0;
    }
  }, [isMomentumSlipping]);

  const downfallStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateY: downfallAnim.value }],
    }),
    [],
  );

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

  const topBreakthroughs = useMemo<BreakthroughItem[]>(() => {
    if (!overallState?.profile) {
      return [];
    }

    const combinedAxes = overallState.profile.axes.combined;
    const combinedDeltas = overallState.profile.comparison.deltas.combined;

    return (Object.keys(combinedDeltas) as GrowthProfileAxisKey[])
      .map((key) => {
        const domain = (Object.keys(METRIC_CONFIG) as ClinicalDomain[]).find(
          (candidate) => METRIC_CONFIG[candidate].profileKey === key,
        );

        if (!domain) {
          return null;
        }

        return {
          key,
          domain,
          config: METRIC_CONFIG[domain],
          current: combinedAxes[key],
          previous: combinedDeltas[key].previous,
          absoluteDelta: combinedDeltas[key].absoluteDelta,
          percentDelta: combinedDeltas[key].percentDelta,
          hasComparison: combinedDeltas[key].hasComparison,
          trend: combinedDeltas[key].trend,
        };
      })
      .filter((item): item is BreakthroughItem => Boolean(item))
      .filter(
        (item) => item.hasComparison && (item.percentDelta ?? 0) > 0,
      )
      .sort((a, b) => (b.percentDelta ?? 0) - (a.percentDelta ?? 0))
      .slice(0, 3);
  }, [overallState]);

  const dynamicSubtitle = useMemo(() => {
    if (topBreakthroughs.length === 0) {
      return "Building your foundation";
    }

    const best = topBreakthroughs[0];
    return `Your ${best.config.label} improved ${Math.abs(
      best.percentDelta ?? 0,
    ).toFixed(0)}%!`;
  }, [topBreakthroughs]);

  const previousCombinedProfile = useMemo(() => {
    const previousPeriodKey = overallState?.profile.comparison.previousPeriodKey;

    if (!previousPeriodKey) {
      return null;
    }

    const previousBucket = historyBuckets.find(
      (bucket) => bucket.periodKey === previousPeriodKey && bucket.hasData,
    );

    return previousBucket?.snapshot?.profile.axes.combined ?? null;
  }, [historyBuckets, overallState?.profile.comparison.previousPeriodKey]);

  // --- Data Logic ---
  const chartData = useMemo(() => {
    if (!combinedProfile || !overallState?.profile?.axes?.clinical) return null;
    const allDomains = Object.values(ClinicalDomain);

    const currentData = allDomains.map((domain) => {
      const metricKey = METRIC_CONFIG[domain].profileKey;
      return combinedProfile[metricKey] ?? 50;
    });

    const baselineData = allDomains.map((domain) => {
      const metricKey = METRIC_CONFIG[domain].profileKey;
      return overallState.profile.axes.clinical[metricKey] ?? 50;
    });

    return { allDomains, currentData, baselineData };
  }, [combinedProfile, overallState]);

  const width = Dimensions.get("window").width;
  const CHART_WIDTH = width - 48; // Padding 24 * 2
  const SIZE = 220;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 45; // Slightly more padding for labels
  const angleStep = chartData ? 360 / chartData.allDomains.length : 72;
  const svgScale = CHART_WIDTH / SIZE;

  const socialIndex = chartData?.allDomains.findIndex(
    (d) => d === ClinicalDomain.PARTICIPATION_RESTRICTION,
  );
  const socialPos =
    chartData && socialIndex !== undefined && socialIndex !== -1
      ? POLAR_TO_CARTESIAN(CENTER, CENTER, RADIUS + 32, socialIndex * angleStep)
      : null;

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
    if (previousCombinedProfile) {
      const historicalData = chartData.allDomains.map((domain) => {
        const key = METRIC_CONFIG[domain].profileKey;
        return previousCombinedProfile[key] ?? 50;
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
  }, [chartData, previousCombinedProfile]);

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
  if (loading || !chartData || !overallState?.profile || !combinedProfile) {
    return (
      <View style={[styles.container, style]}>
        {/* Header Skeleton */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <SkeletonLoader
              width={80}
              height={24}
              style={{ borderRadius: 20 }}
            />
          </View>
          <View style={styles.textContainer}>
            <SkeletonLoader
              width={180}
              height={34}
              style={{ borderRadius: 6 }}
            />
            <SkeletonLoader
              width={240}
              height={18}
              style={{ borderRadius: 4 }}
            />
          </View>
        </View>

        {/* Content Panel Skeleton */}
        <View style={styles.contentPanel}>
          <SkeletonLoader
            width="100%"
            height={SIZE}
            style={{ marginBottom: 8, borderRadius: 24 }}
          />
          <View style={styles.breakthroughContainer}>
            <SkeletonLoader
              width={120}
              height={16}
              style={{ marginBottom: 16 }}
            />
            <View style={styles.heroChartContainer}>
              <SkeletonLoader
                width="100%"
                height={140}
                style={{ borderRadius: 24 }}
              />
              <View style={{ flexDirection: "row", gap: 12 }}>
                <SkeletonLoader
                  width="48%"
                  height={100}
                  style={{ borderRadius: 20, flex: 1 }}
                />
                <SkeletonLoader
                  width="48%"
                  height={100}
                  style={{ borderRadius: 20, flex: 1 }}
                />
              </View>
              <SkeletonLoader
                width={140}
                height={20}
                style={{ marginTop: 16, alignSelf: "center", borderRadius: 10 }}
              />
            </View>
          </View>
        </View>
      </View>
    );
  }

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

        {/* Large Watermark Icon */}
        <View style={styles.mainWatermarkContainer}>
          {isMomentumSlipping ? (
            <Animated.View style={downfallStyle}>
              <MaterialCommunityIcons
                name="trending-down"
                size={120}
                color={theme.colors.library.gray[400]}
                style={{ opacity: 0.15 }}
              />
            </Animated.View>
          ) : (
            <MaterialCommunityIcons
              name="trending-up"
              size={120}
              color={theme.colors.library.orange[400]}
              style={{ opacity: 0.15 }}
            />
          )}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            {isRefreshing ? (
              <SkeletonLoader
                width={80}
                height={22}
                style={{ borderRadius: 20 }}
              />
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={styles.chip}>
                  <MaterialCommunityIcons
                    name="chart-donut"
                    size={12}
                    color={theme.colors.library.orange[500]}
                  />
                  <Text style={styles.chipText}>TRACKING</Text>
                </View>
                {isMomentumSlipping && (
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: theme.colors.library.gray[100],
                        borderRadius: 12,
                        paddingHorizontal: 8,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="alert-circle-outline"
                      size={12}
                      color={theme.colors.library.gray[500]}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: theme.colors.library.gray[600] },
                      ]}
                    >
                      SLIPPING MOMENTUM
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.textContainer}>
            {isRefreshing ? (
              <>
                <SkeletonLoader
                  width={180}
                  height={34}
                  style={{ borderRadius: 6 }}
                />
                <SkeletonLoader
                  width={240}
                  height={18}
                  style={{ borderRadius: 4 }}
                />
              </>
            ) : (
              <>
                <Text style={styles.bigTitle}>Growth Profile</Text>
                <Text style={styles.subtitle}>{dynamicSubtitle}</Text>
                <Text style={styles.comparisonCaption}>
                  {overallState.profile.comparison.comparisonLabel}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Main Content Panel (White) */}
        <View style={styles.contentPanel}>
          {/* Radar Chart Section - Step 7 */}
          <View style={[styles.chartContainer, { height: SIZE }]}>
            {isRefreshing ? (
              <SkeletonLoader width="100%" height={SIZE} />
            ) : (
              <Svg
                height={SIZE}
                width={CHART_WIDTH}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
              >
                <Defs>
                  <SvgGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop
                      offset="0"
                      stopColor={theme.colors.library.orange[300]}
                      stopOpacity="0.6"
                    />
                    <Stop
                      offset="1"
                      stopColor={theme.colors.library.orange[100]}
                      stopOpacity="0.2"
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

                <G>
                  {/* 1. Previous Week Ghost Layer */}
                  {historicalPathD ? (
                    <AnimatedPath
                      d={historicalPathD}
                      fill="none"
                      stroke={theme.colors.library.gray[300]}
                      strokeWidth={1.5}
                      strokeDasharray="5,5"
                      opacity={0.9}
                    />
                  ) : null}

                  {/* 2. Clinical Baseline Layer (Greenish) */}
                  <AnimatedPath
                    d={baselinePathD}
                    fill="#4CAF50"
                    fillOpacity={0.12}
                    stroke="#4CAF50"
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                  />

                  {/* 3. Current Combined Progress Layer (Orange) */}
                  {/* Glow Effect */}
                  <AnimatedPath
                    d={currentPathD}
                    fill="none"
                    stroke={theme.colors.library.orange[300]}
                    strokeWidth="12"
                    strokeOpacity={0.15}
                  />

                  {/* Main Fill and Stroke */}
                  <AnimatedPath
                    d={currentPathD}
                    fill="url(#radarGradient)"
                    fillOpacity={0.6}
                    stroke="#FF9800"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Dots (Only for current) */}
                  {currentPoints.map((coord, i) => (
                    <Circle
                      key={`dot-${i}`}
                      cx={coord.x}
                      cy={coord.y}
                      r="4"
                      fill="white"
                      stroke="#FF9800"
                      strokeWidth="2"
                    />
                  ))}
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

                      {/* Text Label */}
                      <SvgText
                        key={`text-${i}`}
                        x={pos.x}
                        y={pos.y}
                        fill={
                          isSelected
                            ? theme.colors.library.orange[500]
                            : "#666666"
                        }
                        fontSize={isSelected ? "11" : "10"}
                        fontWeight={isSelected ? "800" : "600"}
                        textAnchor={anchor}
                        alignmentBaseline="middle"
                        letterSpacing={1}
                      >
                        {config.label.toUpperCase()}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            )}
            {!isRefreshing && socialPos && (
              <View
                style={{
                  position: "absolute",
                  left: socialPos.x * svgScale - 45,
                  top: socialPos.y * svgScale - 12,
                  width: 90,
                  height: 24,
                  backgroundColor: "transparent",
                  zIndex: 999,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                pointerEvents="none"
              >
                <View style={{ flex: 1, padding: 2 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "800",
                      opacity: 0, // Invisible but physical
                    }}
                  >
                    SOCIAL
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Weekly Breakthroughs */}
          <View style={styles.breakthroughContainer}>
            {/* Breakthrough Watermark Icon */}
            <View style={styles.breakthroughWatermarkContainer}>
              <MaterialCommunityIcons
                name="trophy-variant"
                size={160}
                color={theme.colors.library.orange[500]}
                style={{ opacity: 0.08 }}
              />
            </View>
            {isRefreshing ? (
              <>
                <SkeletonLoader
                  width={120}
                  height={16}
                  style={{ marginBottom: 16 }}
                />
                <View style={styles.heroChartContainer}>
                  <SkeletonLoader
                    width="100%"
                    height={140}
                    style={{ borderRadius: 24 }}
                  />
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <SkeletonLoader
                      width="48%"
                      height={100}
                      style={{ borderRadius: 20, flex: 1 }}
                    />
                    <SkeletonLoader
                      width="48%"
                      height={100}
                      style={{ borderRadius: 20, flex: 1 }}
                    />
                  </View>
                  {/* Button skeleton MUST be inside heroChartContainer to match layout */}
                  <SkeletonLoader
                    width={140}
                    height={20}
                    style={{
                      marginTop: 16,
                      alignSelf: "center",
                      borderRadius: 10,
                    }}
                  />
                </View>
              </>
            ) : (
              <>
                {topBreakthroughs.length > 0 ? (
                  <>
                    <Text style={styles.sectionLabel}>TOP BREAKTHROUGHS</Text>
                    {(() => {
                      const [heroItem, ...secondaryItems] = topBreakthroughs;
                      const isCompactBreakthroughLayout =
                        topBreakthroughs.length <= 3;
                      const formatPointDelta = (delta: number | null) => {
                        if (delta === null) {
                          return null;
                        }

                        const rounded = Math.abs(delta).toFixed(1);
                        return `${delta > 0 ? "+" : ""}${rounded} pts`;
                      };

                      if (isCompactBreakthroughLayout) {
                        return (
                          <View style={styles.compactBreakthroughGrid}>
                            {topBreakthroughs.map((item) => {
                              const isImp = item.trend === "IMPROVING";

                              return (
                                <TouchableOpacity
                                  key={item.key}
                                  activeOpacity={0.7}
                                  onPress={() => {
                                    setSelectedMetric(item.domain);
                                    setModalVisible(true);
                                  }}
                                  style={[
                                    styles.miniCard,
                                    styles.compactBreakthroughCard,
                                    topBreakthroughs.length === 1
                                      ? styles.compactBreakthroughCardSingle
                                      : null,
                                    {
                                      borderWidth: 1,
                                      borderColor: theme.colors.library.gray[100],
                                    },
                                  ]}
                                >
                                  <View style={styles.compactBreakthroughHeader}>
                                    <Text
                                      style={[styles.cardTitle, { marginBottom: 0 }]}
                                      numberOfLines={1}
                                    >
                                      {item.config.label}
                                    </Text>
                                    <MaterialCommunityIcons
                                      name={item.config.icon as any}
                                      size={16}
                                      color={item.config.color}
                                    />
                                  </View>

                                  <View style={styles.compactBreakthroughValueRow}>
                                    <Text style={styles.compactBreakthroughValue}>
                                      {Math.round(item.current)}
                                    </Text>
                                    {item.hasComparison ? (
                                      <View
                                        style={
                                          styles.compactBreakthroughDeltaRow
                                        }
                                      >
                                        <Text
                                          style={[
                                            styles.btChange,
                                            isImp
                                              ? styles.textSuccess
                                              : styles.textNeutral,
                                          ]}
                                        >
                                          {item.percentDelta! > 0 ? "+" : ""}
                                          {item.percentDelta?.toFixed(1)}%
                                        </Text>
                                        <MaterialCommunityIcons
                                          name={
                                            isImp
                                              ? "trending-up"
                                              : "trending-down"
                                          }
                                          size={14}
                                          color={
                                            isImp
                                              ? theme.colors.library.green[400]
                                              : theme.colors.library.red[400]
                                          }
                                        />
                                      </View>
                                    ) : null}
                                  </View>

                                  {item.absoluteDelta !== null ? (
                                    <Text style={styles.btDeltaTextSmall}>
                                      {formatPointDelta(item.absoluteDelta)}
                                    </Text>
                                  ) : null}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        );
                      }

                      return (
                        <View style={styles.heroChartContainer}>
                          {/* Left Col: Hero Card */}
                          {heroItem ? (
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => {
                                setSelectedMetric(heroItem.domain);
                                setModalVisible(true);
                              }}
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
                                <Text
                                  style={[styles.cardTitle, { marginBottom: 0 }]}
                                >
                                  {heroItem.config.label}
                                </Text>
                                <MaterialCommunityIcons
                                  name={heroItem.config.icon as any}
                                  size={18}
                                  color={heroItem.config.color}
                                />
                              </View>
                              <Text style={styles.heroValue}>
                                {Math.round(heroItem.current)}
                              </Text>
                              <View style={styles.btChangeRow}>
                                {heroItem.hasComparison && (
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Text
                                      style={[
                                        {
                                          color:
                                            heroItem.trend === "IMPROVING"
                                              ? theme.colors.library.green[400]
                                              : theme.colors.library.red[400],
                                          fontWeight: "700",
                                        },
                                      ]}
                                    >
                                      {heroItem.percentDelta! > 0 ? "+" : ""}
                                      {heroItem.percentDelta?.toFixed(1)}%
                                    </Text>

                                    <MaterialCommunityIcons
                                      name={
                                        heroItem.trend === "IMPROVING"
                                          ? "trending-up"
                                          : "trending-down"
                                      }
                                      size={16}
                                      color={
                                        heroItem.trend === "IMPROVING"
                                          ? theme.colors.library.green[400]
                                          : theme.colors.library.red[400]
                                      }
                                      style={{ marginLeft: 4 }}
                                    />
                                  </View>
                                )}
                              </View>
                              {heroItem.absoluteDelta !== null ? (
                                <Text style={styles.btDeltaText}>
                                  {formatPointDelta(heroItem.absoluteDelta)}
                                </Text>
                              ) : null}
                            </TouchableOpacity>
                          ) : null}

                          {/* Bottom Row: 2 Mini Cards Side-by-Side */}
                          <View style={{ flexDirection: "row", gap: 12 }}>
                            {secondaryItems.map((item) => {
                              const isImp = item.trend === "IMPROVING";

                              return (
                                <TouchableOpacity
                                  key={item.key}
                                  activeOpacity={0.7}
                                  onPress={() => {
                                    setSelectedMetric(item.domain);
                                    setModalVisible(true);
                                  }}
                                  style={[
                                    styles.miniCard,
                                    {
                                      borderWidth: 1,
                                      borderColor:
                                        theme.colors.library.gray[100],
                                      flex: 1,
                                      height: 100,
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
                                            { marginBottom: 0, flex: 1 },
                                          ]}
                                          numberOfLines={1}
                                          adjustsFontSizeToFit
                                          minimumFontScale={0.8}
                                        >
                                          {item.config.label}
                                        </Text>
                                        <View style={{ marginLeft: 4 }}>
                                          <MaterialCommunityIcons
                                            name={item.config.icon as any}
                                            size={14}
                                            color={item.config.color}
                                          />
                                        </View>
                                      </View>

                                      {item.hasComparison && (
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
                                              {
                                                fontSize: 11,
                                                fontWeight: "700",
                                              },
                                            ]}
                                          >
                                            {item.percentDelta! > 0 ? "+" : ""}
                                            {item.percentDelta?.toFixed(1)}%
                                          </Text>
                                          <MaterialCommunityIcons
                                            name={
                                              isImp
                                                ? "trending-up"
                                                : "trending-down"
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

                                      {item.absoluteDelta !== null ? (
                                        <Text style={styles.btDeltaTextSmall}>
                                          {formatPointDelta(
                                            item.absoluteDelta,
                                          )}
                                        </Text>
                                      ) : null}
                                    </View>

                                    <Text style={styles.miniValue}>
                                      {Math.round(item.current)}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                        </View>
                      );
                    })()}
                  </>
                ) : null}
              </>
            )}
          </View>

          <TouchableOpacity
            onPress={onRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
            style={styles.syncLink}
          >
            <Animated.View style={isRefreshing ? refreshIconStyle : null}>
              <MaterialCommunityIcons
                name="sync"
                size={16}
                color={theme.colors.library.gray[400]}
              />
            </Animated.View>
            <Text style={styles.syncText}>
              {isRefreshing
                ? "Syncing data..."
                : `Last synced at ${new Date(
                    overallState.profile.meta.computedAt,
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dimension Detail Modal */}
        <DimensionDetailModal
          visible={modalVisible}
          domain={selectedMetric}
          comparisonLabel={overallState.profile.comparison.comparisonLabel}
          familyData={(() => {
            const profileKey = selectedMetric
              ? METRIC_CONFIG[selectedMetric].profileKey
              : "confidence";
            const buildFamilyData = (
              family: "combined" | "clinical" | "engagement",
            ) => {
              const familyAxes = overallState.profile.axes[family];
              const familyDelta = overallState.profile.comparison.deltas[family][
                profileKey
              ];

              return {
                currentScore: familyAxes[profileKey],
                previousScore: familyDelta.previous,
                percentDelta: familyDelta.percentDelta,
                absoluteDelta: familyDelta.absoluteDelta,
                trend: familyDelta.trend,
              };
            };

            return {
              combined: buildFamilyData("combined"),
              clinical: buildFamilyData("clinical"),
              engagement: buildFamilyData("engagement"),
            };
          })()}
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
    marginVertical: 0,
    backgroundColor: "white", // Restored White
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
  comparisonCaption: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.text.default,
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
    marginVertical: 0,
    padding: 20,
  },
  mainWatermarkContainer: {
    position: "absolute",
    top: 20,
    right: 25,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }],
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
    paddingVertical: 4,
    height: 24,
    justifyContent: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  chipText: {
    color: theme.colors.library.orange[500], // Orange for tracking
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  textContainer: {
    gap: 4,
  },
  bigTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.text.title, // Dark title
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.text.default, // Standard gray
    lineHeight: 18,
  },
  syncLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    gap: 6,
    paddingVertical: 8,
  },
  syncText: {
    fontSize: 12,
    color: theme.colors.library.gray[400],
    fontWeight: "500",
    width: "100%",
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    // Height updated dynamically in JSX to match CHART_WIDTH
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
  compactBreakthroughGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  compactBreakthroughCard: {
    width: "48%",
    height: 100,
    justifyContent: "space-between",
    padding: 14,
  },
  compactBreakthroughCardSingle: {
    width: "100%",
    height: 92,
  },
  compactBreakthroughHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  compactBreakthroughValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  compactBreakthroughValue: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.text.title,
    letterSpacing: -0.8,
    lineHeight: 30,
  },
  compactBreakthroughDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.2, // Reduced for tighter spaces
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
    backgroundColor: "#F8FAFC", // Light blue/gray tint
    padding: 16,
    borderRadius: 20, // Curved
    height: 110, // Fixed height for Mini cards
  },
  miniContent: {
    flexDirection: "column", // Stack content in mini card for vertical space
    justifyContent: "space-between",
    alignItems: "flex-start",
    height: "100%",
  },

  // --- Breakdown/List Section ---
  breakthroughContainer: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    position: "relative",
  },
  breakthroughWatermarkContainer: {
    position: "absolute",
    bottom: 100,
    left: -80,
    zIndex: 0,
    transform: [{ rotate: "15deg" }],
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.text.default,
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 2,
  },

  btChange: {
    fontSize: 11,
    fontWeight: "700",
  },
  btDeltaText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.text.default,
  },
  btDeltaTextSmall: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.text.default,
  },
  textSuccess: { color: theme.colors.library.green[400] },
  textError: { color: theme.colors.library.red[400] },
  textNeutral: { color: theme.colors.library.red[400] },

  // Decorative Bubbles
  decorBubble1: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: theme.colors.library.orange[500],
    opacity: 0.05,
  },
  decorBubble2: {
    position: "absolute",
    top: 60,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.library.orange[500],
    opacity: 0.03,
  },
  decorBubble3: {
    position: "absolute",
    bottom: -20,
    right: 40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.library.orange[500],
    opacity: 0.02,
  },
});

export default React.memo(ClinicalStatsWidget);
