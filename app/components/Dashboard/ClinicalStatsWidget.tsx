import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
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
import {
  Icon,
  Text,
  icons,
  makeStyles,
  spacing,
  space,
  radius,
  useTheme,
} from "../../design-system";
import type { IconName } from "../../design-system/components/Icon";
import SkeletonLoader from "../SkeletonLoader";
import ErrorStateCard from "./ErrorStateCard";
import { useNavigation } from "@react-navigation/native";
import { HomeStackNavigationProp } from "../../navigators/index";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHART_LABEL_TOUCH_WIDTH = 112;
const CHART_LABEL_TOUCH_HEIGHT = 44;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// --- 1. Translation Map ---
type MetricAccentKey = "success" | "danger" | "info" | "purple" | "warning";

const METRIC_CONFIG: Record<
  ClinicalDomain,
  {
    label: string;
    accentKey: MetricAccentKey;
    icon: IconName;
    description: string;
    profileKey: keyof GrowthProfileMetrics;
  }
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    label: "Confidence",
    accentKey: "success",
    icon: icons.confidence,
    description: "Belief in your ability to speak freely.",
    profileKey: "confidence",
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    accentKey: "danger",
    icon: icons.courage,
    description: "Facing situations without holding back.",
    profileKey: "courage",
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery", // Was Control
    accentKey: "info",
    icon: icons.mastery,
    description: "Managing speech techniques effectively.",
    profileKey: "mastery",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease", // Was Flow
    accentKey: "purple",
    icon: icons.ease,
    description: "Smoothness in daily communication.",
    profileKey: "ease",
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    accentKey: "warning",
    icon: icons.social,
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
  const { colors } = useTheme();
  const styles = useStyles();
  const {
    overallState,
    historyBuckets,
    fetchAllTrends,
    loading,
    error,
  } = useUserBehaviorTrendsStore();

  const navigation = useNavigation<HomeStackNavigationProp<"Home">>();
  const combinedProfile = overallState?.profile?.axes?.combined ?? null;
  const isMomentumSlipping =
    overallState?.profile?.meta?.momentumState === "SLIPPING";

  const handleMetricPress = (domain: ClinicalDomain) => {
    if (!overallState) return;

    const profileKey = METRIC_CONFIG[domain].profileKey;
    const buildFamilyData = (
      family: "combined" | "clinical" | "engagement",
    ) => {
      const familyAxes = overallState.profile.axes[family];
      const familyDelta = overallState.profile.comparison.deltas[family][profileKey];

      return {
        currentScore: familyAxes[profileKey],
        previousScore: familyDelta.previous,
        percentDelta: familyDelta.percentDelta,
        absoluteDelta: familyDelta.absoluteDelta,
        trend: familyDelta.trend,
      };
    };

    const familyData = {
      combined: buildFamilyData("combined"),
      clinical: buildFamilyData("clinical"),
      engagement: buildFamilyData("engagement"),
    };

    navigation.navigate("DimensionDetail", {
      domain,
      accentKey: METRIC_CONFIG[domain].accentKey,
      familyData,
      comparisonLabel: overallState.profile.comparison.comparisonLabel,
    });
  };

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
  const chartHorizontalInset = Math.max((CHART_WIDTH - SIZE) / 2, 0);
  const chartLabelTargets = useMemo(() => {
    if (!chartData) {
      return [];
    }

    return chartData.allDomains.map((domain, index) => {
      const pos = POLAR_TO_CARTESIAN(
        CENTER,
        CENTER,
        RADIUS + 28,
        index * angleStep,
      );

      let textAlign: "left" | "center" | "right" = "center";
      if (pos.x < CENTER - 10) textAlign = "right";
      if (pos.x > CENTER + 10) textAlign = "left";

      let left =
        chartHorizontalInset + pos.x - CHART_LABEL_TOUCH_WIDTH / 2;
      if (textAlign === "left") {
        left = chartHorizontalInset + pos.x - 14;
      } else if (textAlign === "right") {
        left = chartHorizontalInset + pos.x - CHART_LABEL_TOUCH_WIDTH + 14;
      }

      return {
        domain,
        left: clamp(left, 0, CHART_WIDTH - CHART_LABEL_TOUCH_WIDTH),
        top: clamp(
          pos.y - CHART_LABEL_TOUCH_HEIGHT / 2,
          0,
          SIZE - CHART_LABEL_TOUCH_HEIGHT,
        ),
      };
    });
  }, [CHART_WIDTH, CENTER, RADIUS, SIZE, angleStep, chartData, chartHorizontalInset]);

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
        {/* Decorative watermark — sprout, echoing the card's growth identity
            (same glyph as the eyebrow, and as the app's other growth-journey
            cards) instead of an unrelated trend arrow. */}
        <View style={styles.mainWatermarkContainer}>
          <Icon
            name={icons.growthSeed}
            size={300}
            color={colors.action.primary}
            style={{ opacity: 0.08 }}
          />
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
                {/* Bare eyebrow (icon + label, no tint pill) — matches the
                    dashboard-card header grammar (ResourceStats / SmartRec). */}
                <View style={styles.eyebrow}>
                  <Icon
                    name={icons.growthSeed}
                    size={14}
                    color={colors.action.primary}
                  />
                  <Text variant="label" color={colors.action.primary}>
                    TRACKING
                  </Text>
                </View>
                {isMomentumSlipping && (
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: colors.surface.control,
                        borderRadius: 12,
                        paddingHorizontal: 8,
                      },
                    ]}
                  >
                    <Icon
                      name={icons.warning}
                      size={12}
                      color={colors.text.tertiary}
                    />
                    <Text
                      variant="label"
                      color="secondary"
                      style={styles.chipText}
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
                <Text variant="h2" color="primary">
                  Growth Profile
                </Text>
                <Text variant="bodySm" color="secondary" style={styles.subtitle}>
                  {dynamicSubtitle}
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
                      stopColor={colors.action.primary}
                      stopOpacity="0.6"
                    />
                    <Stop
                      offset="1"
                      stopColor={colors.action.primaryTint}
                      stopOpacity="0.2"
                    />
                  </SvgGradient>
                </Defs>

                {/* Organic Grid (Concentric Blobs) */}
                {gridPaths.map((pathD, i) => (
                  <Path
                    key={`grid-${i}`}
                    d={pathD}
                    stroke={colors.border.default}
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
                      stroke={colors.border.default} // Lighter axis
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
                      stroke={colors.text.tertiary}
                      strokeWidth={1.5}
                      strokeDasharray="5,5"
                      opacity={0.9}
                    />
                  ) : null}

                  {/* 2. Clinical Baseline Layer (Greenish) */}
                  <AnimatedPath
                    d={baselinePathD}
                    fill={colors.accent.success}
                    fillOpacity={0.12}
                    stroke={colors.accent.success}
                    strokeWidth={1.5}
                    strokeDasharray="4,4"
                  />

                  {/* 3. Current Combined Progress Layer (Orange) */}
                  {/* Glow Effect */}
                  <AnimatedPath
                    d={currentPathD}
                    fill="none"
                    stroke={colors.action.primary}
                    strokeWidth="12"
                    strokeOpacity={0.15}
                  />

                  {/* Main Fill and Stroke */}
                  <AnimatedPath
                    d={currentPathD}
                    fill="url(#radarGradient)"
                    fillOpacity={0.6}
                    stroke={colors.action.primary}
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
                      fill={colors.surface.default}
                      stroke={colors.action.primary}
                      strokeWidth="2"
                    />
                  ))}
                </G>

                {/* Labels */}
                {chartData.allDomains.map((domain, i) => {
                  const pos = POLAR_TO_CARTESIAN(
                    CENTER,
                    CENTER,
                    RADIUS + 28,
                    i * angleStep,
                  );
                  const config = METRIC_CONFIG[domain];

                  type TextAnchor = "start" | "middle" | "end";
                  let anchor: TextAnchor = "middle";
                  if (pos.x < CENTER - 10) anchor = "end";
                  if (pos.x > CENTER + 10) anchor = "start";

                  return (
                    <SvgText
                      key={`text-${i}`}
                      x={pos.x}
                      y={pos.y}
                      fill={colors.text.secondary}
                      fontSize={"10"}
                      fontWeight={"600"}
                      textAnchor={anchor}
                      alignmentBaseline="middle"
                      letterSpacing={1}
                    >
                      {config.label.toUpperCase()}
                    </SvgText>
                  );
                })}

              </Svg>
            )}
            {!isRefreshing ? (
              <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
                {chartLabelTargets.map((target) => {
                  return (
                    <TouchableOpacity
                      key={target.domain}
                      activeOpacity={0.7}
                      hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                      onPress={() => handleMetricPress(target.domain)}
                      style={[
                        styles.chartLabelHitbox,
                        { left: target.left, top: target.top },
                      ]}
                    />
                  );
                })}
              </View>
            ) : null}
          </View>

          {/* Weekly Breakthroughs */}
          <View style={styles.breakthroughContainer}>
            {/* Breakthrough Watermark Icon */}
            <View style={styles.breakthroughWatermarkContainer}>
              <Icon
                name={icons.milestone}
                size={160}
                color={colors.action.primary}
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
                    <Text
                      variant="title"
                      color="primary"
                      style={styles.sectionLabel}
                    >
                      Top Breakthroughs
                    </Text>
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
                                  onPress={() => handleMetricPress(item.domain)}
                                  style={[
                                    styles.miniCard,
                                    styles.compactBreakthroughCard,
                                    topBreakthroughs.length === 1
                                      ? styles.compactBreakthroughCardSingle
                                      : null,
                                    {
                                      borderWidth: 1,
                                      borderColor: colors.border.hairline,
                                    },
                                  ]}
                                >
                                  <View style={styles.compactBreakthroughWatermark}>
                                    <Icon
                                      name={item.config.icon}
                                      size={40}
                                      color={colors.accent[item.config.accentKey]}
                                      style={{ opacity: 0.08 }}
                                    />
                                  </View>

                                  <View style={styles.compactBreakthroughHeader}>
                                    <Text
                                      variant="title"
                                      color="primary"
                                      style={styles.cardTitle}
                                      numberOfLines={1}
                                      adjustsFontSizeToFit
                                      minimumFontScale={0.7}
                                    >
                                      {item.config.label}
                                    </Text>
                                  </View>

                                  <View style={styles.compactBreakthroughValueRow}>
                                    <Text
                                      variant="h2"
                                      color="primary"
                                      style={styles.compactBreakthroughValue}
                                    >
                                      {Math.round(item.current)}
                                    </Text>
                                    {item.hasComparison ? (
                                      <View
                                        style={
                                          styles.compactBreakthroughDeltaRow
                                        }
                                      >
                                        <Text
                                          variant="bodySm"
                                          color={
                                            isImp
                                              ? colors.feedback.successText
                                              : colors.feedback.dangerText
                                          }
                                          style={styles.btChange}
                                        >
                                          {item.percentDelta! > 0 ? "+" : ""}
                                          {item.percentDelta?.toFixed(1)}%
                                        </Text>
                                        <Icon
                                          name={
                                            isImp
                                              ? icons.trend
                                              : icons.trendDown
                                          }
                                          size={14}
                                          color={
                                            isImp
                                              ? colors.feedback.successText
                                              : colors.feedback.dangerText
                                          }
                                        />
                                      </View>
                                    ) : null}
                                  </View>

                                  {item.absoluteDelta !== null ? (
                                    <Text
                                      variant="label"
                                      color="secondary"
                                      style={styles.btDeltaTextSmall}
                                    >
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
                              onPress={() => handleMetricPress(heroItem.domain)}
                              style={[
                                styles.miniCard,
                                styles.heroCard,
                                {
                                  borderWidth: 1,
                                  borderColor: colors.border.hairline,
                                },
                              ]}
                            >
                              <View style={styles.heroHeader}>
                                <Text
                                  variant="title"
                                  color="primary"
                                  style={styles.cardTitle}
                                >
                                  {heroItem.config.label}
                                </Text>
                                <Icon
                                  name={heroItem.config.icon}
                                  size={18}
                                  color={colors.accent[heroItem.config.accentKey]}
                                />
                              </View>
                              <Text
                                variant="h2"
                                color="primary"
                                style={styles.heroValue}
                              >
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
                                      variant="bodySm"
                                      color={
                                        heroItem.trend === "IMPROVING"
                                          ? colors.feedback.successText
                                          : colors.feedback.dangerText
                                      }
                                    >
                                      {heroItem.percentDelta! > 0 ? "+" : ""}
                                      {heroItem.percentDelta?.toFixed(1)}%
                                    </Text>

                                    <Icon
                                      name={
                                        heroItem.trend === "IMPROVING"
                                          ? icons.trend
                                          : icons.trendDown
                                      }
                                      size={16}
                                      color={
                                        heroItem.trend === "IMPROVING"
                                          ? colors.feedback.successText
                                          : colors.feedback.dangerText
                                      }
                                      style={{ marginLeft: 4 }}
                                    />
                                  </View>
                                )}
                              </View>
                              {heroItem.absoluteDelta !== null ? (
                                <Text
                                  variant="bodySm"
                                  color="secondary"
                                  style={styles.btDeltaText}
                                >
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
                                  onPress={() => handleMetricPress(item.domain)}
                                  style={[
                                    styles.miniCard,
                                    {
                                      borderWidth: 1,
                                      borderColor: colors.border.hairline,
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
                                          variant="title"
                                          color="primary"
                                          style={[styles.cardTitle, { flex: 1 }]}
                                          numberOfLines={1}
                                          adjustsFontSizeToFit
                                          minimumFontScale={0.8}
                                        >
                                          {item.config.label}
                                        </Text>
                                        <View style={{ marginLeft: 4 }}>
                                          <Icon
                                            name={item.config.icon}
                                            size={14}
                                            color={colors.accent[item.config.accentKey]}
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
                                            variant="bodySm"
                                            color={
                                              isImp
                                                ? colors.feedback.successText
                                                : colors.feedback.dangerText
                                            }
                                            style={[
                                              styles.btChange,
                                              {
                                                fontSize: 11,
                                                fontWeight: "700",
                                              },
                                            ]}
                                          >
                                            {item.percentDelta! > 0 ? "+" : ""}
                                            {item.percentDelta?.toFixed(1)}%
                                          </Text>
                                          <Icon
                                            name={
                                              isImp
                                                ? icons.trend
                                                : icons.trendDown
                                            }
                                            size={14}
                                            color={
                                              isImp
                                                ? colors.feedback.successText
                                                : colors.feedback.dangerText
                                            }
                                            style={{ marginLeft: 2 }}
                                          />
                                        </View>
                                      )}

                                      {item.absoluteDelta !== null ? (
                                        <Text
                                          variant="label"
                                          color="secondary"
                                          style={styles.btDeltaTextSmall}
                                        >
                                          {formatPointDelta(
                                            item.absoluteDelta,
                                          )}
                                        </Text>
                                      ) : null}
                                    </View>

                                    <Text
                                      variant="title"
                                      color="primary"
                                      style={styles.miniValue}
                                    >
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
              <Icon
                name={icons.refresh}
                size={16}
                color={colors.text.tertiary}
              />
            </Animated.View>
            <Text variant="caption" color="tertiary" style={styles.syncText}>
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

        {/* Modal removed - now uses DimensionDetailScreen via navigation */}
      </View>
    </View>
  );
};

const useStyles = makeStyles((c) => ({
  container: {
    borderRadius: radius.card,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    marginVertical: 0,
    backgroundColor: c.surface.default,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.border.default,
    // Premium SaaS Shadow
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  comparisonCaption: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: c.text.tertiary,
    fontWeight: "600",
  },
  contentPanel: {
    marginTop: spacing.md,
    paddingHorizontal: 0,
  },

  btChangeRow: {
    marginTop: "auto",
    paddingTop: spacing.md,
  },
  miniValue: {
    color: c.text.primary,
  },
  card: {
    backgroundColor: c.surface.default,
    borderRadius: radius.card,
    marginVertical: 0,
    padding: 20,
  },
  mainWatermarkContainer: {
    position: "absolute",
    top: -10,
    right: -80,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },
  // Decorative Elements (White transparent overlays)

  header: {
    marginBottom: space.sectionGap,
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: c.action.primaryTint,
    borderRadius: radius.md,
    gap: spacing.sm,
    alignSelf: "flex-start",
  },
  chipText: {},
  textContainer: {
    gap: space.titleSub,
  },
  subtitle: {},
  syncLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingVertical: 0,
  },
  syncText: {
    width: "100%",
  },
  chartContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  chartLabelHitbox: {
    position: "absolute",
    width: CHART_LABEL_TOUCH_WIDTH,
    height: CHART_LABEL_TOUCH_HEIGHT,
    zIndex: 2,
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
    color: c.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: c.action.primary,
    borderRadius: 20,
  },
  retryText: {
    color: c.action.onPrimary,
    fontWeight: "600",
    fontSize: 13,
  },
  heroChartContainer: {
    marginTop: spacing.md,
    flexDirection: "column",
    gap: spacing.md,
  },
  compactBreakthroughGrid: {
    marginTop: spacing.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  compactBreakthroughCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    height: 104,
    justifyContent: "space-between",
    padding: spacing.lg,
    position: "relative",
    overflow: "hidden",
  },
  compactBreakthroughCardSingle: {
    width: "100%",
    height: 96,
  },
  compactBreakthroughWatermark: {
    position: "absolute",
    right: 10,
    bottom: 8,
    zIndex: 0,
  },
  compactBreakthroughHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    zIndex: 1,
  },
  compactBreakthroughValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
    zIndex: 1,
  },
  compactBreakthroughValue: {
    letterSpacing: -0.8,
  },
  compactBreakthroughDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroCard: {
    height: 140,
    justifyContent: "space-between",
    width: "100%",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: {
    marginBottom: space.titleSub,
  },
  heroValue: {
    letterSpacing: -1,
    marginTop: spacing.sm,
  },
  bentoBottomRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  miniCard: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: c.surface.elevated,
    padding: spacing.lg,
    borderRadius: radius.input,
    height: 110,
  },
  miniContent: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "flex-start",
    height: "100%",
  },

  breakthroughContainer: {
    marginTop: spacing.md,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: c.border.default,
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
    marginBottom: spacing.lg,
  },

  btChange: {
    fontSize: 11,
    fontWeight: "700",
  },
  btDeltaText: {
    marginTop: 6,
  },
  btDeltaTextSmall: {
    marginTop: 4,
  },
}));

export default React.memo(ClinicalStatsWidget);
