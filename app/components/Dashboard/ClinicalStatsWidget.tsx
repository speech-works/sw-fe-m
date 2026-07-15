import React, { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  ClinicalDomain,
  GrowthProfileMetrics,
} from "../../api/userBehaviorTrends/types";
import { GrowthProfileAxisKey } from "../../api/overallState/types";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import {
  buildTrendWeeks,
  overallOf,
  buildFamilyMetric,
} from "../../stores/userBehaviorTrends/selectors";
import {
  Icon,
  Text,
  TrendLine,
  AnimatedNumber,
  icons,
  makeStyles,
  spacing,
  space,
  radius,
  useTheme,
  useMotion,
} from "../../design-system";
import type { IconName } from "../../design-system/components/Icon";
import { Gradient } from "../../design-system/components/Gradient";
import PressableScale from "../PressableScale";
import SkeletonLoader from "../SkeletonLoader";
import ErrorStateCard from "./ErrorStateCard";
import { useNavigation } from "@react-navigation/native";
import { HomeStackNavigationProp } from "../../navigators/index";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type MetricAccentKey = "success" | "danger" | "info" | "purple" | "warning";
type MomentumState = "ACTIVE" | "QUIET" | "SLIPPING";

const METRIC_CONFIG: Record<
  ClinicalDomain,
  {
    label: string;
    accentKey: MetricAccentKey;
    icon: IconName;
    profileKey: keyof GrowthProfileMetrics;
  }
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    label: "Confidence",
    accentKey: "success",
    icon: icons.confidence,
    profileKey: "confidence",
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    accentKey: "danger",
    icon: icons.courage,
    profileKey: "courage",
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery",
    accentKey: "info",
    icon: icons.mastery,
    profileKey: "mastery",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease",
    accentKey: "purple",
    icon: icons.ease,
    profileKey: "ease",
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    accentKey: "warning",
    icon: icons.social,
    profileKey: "social",
  },
};

// Momentum wording matches Progress Report's WeeklyGrowthCard.
const MOMENTUM_LABEL: Record<MomentumState, string> = {
  ACTIVE: "Rising",
  QUIET: "Stable",
  SLIPPING: "Slipping",
};

type MetricChipItem = {
  key: GrowthProfileAxisKey;
  domain: ClinicalDomain;
  config: (typeof METRIC_CONFIG)[ClinicalDomain];
  current: number;
  hasComparison: boolean;
  percentDelta: number | null;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
  uncertainty: number;
};

/** One tappable metric tile — accent icon, score, a trend arrow, and its label. */
const MetricChip: React.FC<{
  item: MetricChipItem;
  index: number;
  onPress: (domain: ClinicalDomain) => void;
}> = ({ item, index, onPress }) => {
  const { colors, elevation, scheme } = useTheme();
  const styles = useStyles();
  const motion = useMotion();

  // The metric icon is a small, meaning-bearing glyph on the control surface —
  // the bright accent base fails AA on the light "paper" control, so use the
  // per-scheme colored-text cut (keeps each metric's hue, AA in both schemes).
  const accent = colors.accentText[item.config.accentKey];
  const pct = item.percentDelta;
  const improving = item.trend === "IMPROVING" && (pct ?? 0) > 0;
  const worsening = item.trend === "WORSENING" && (pct ?? 0) < 0;
  const showTrend = item.hasComparison && (improving || worsening);

  const trendColor = improving
    ? colors.feedback.successText
    : colors.feedback.dangerText;

  const isSettling = item.uncertainty > 25;

  return (
    <Animated.View style={styles.chipWrap} entering={motion.stagger(index)}>
      <PressableScale
        scaleTo={0.96}
        onPress={() => onPress(item.domain)}
        style={[
          styles.chip,
          { backgroundColor: scheme === "dark" ? colors.surface.control : colors.surface.inverse },
          scheme !== "dark" && elevation.e3,
          isSettling && { opacity: 0.65 }
        ]}
      >
        <View style={styles.chipHeader}>
          <Icon name={item.config.icon} size={16} color={accent} />
          {showTrend && !isSettling && (
            <View style={styles.chipTrend}>
              <Text variant="caption" color={trendColor}>
                {improving ? "+" : ""}
                {Math.round(pct ?? 0)}%
              </Text>
            </View>
          )}
          {isSettling && (
            <View style={styles.chipTrend}>
              <Icon name={icons.duration} size={14} color={colors.text.tertiary} />
            </View>
          )}
        </View>
        <Text variant="h3" color={isSettling ? "tertiary" : "primary"}>
          {Math.round(item.current)}
        </Text>
        <Text variant="bodySm" color="secondary" numberOfLines={1}>
          {item.config.label}
        </Text>
      </PressableScale>
    </Animated.View>
  );
};

const ClinicalStatsWidget = ({ style }: { style?: any }) => {
  const { colors, elevation, scheme } = useTheme();
  const styles = useStyles();
  const motion = useMotion();
  const { overallState, historyBuckets, fetchAllTrends, loading, error } =
    useUserBehaviorTrendsStore();

  const navigation = useNavigation<HomeStackNavigationProp<"Home">>();
  const combinedProfile = overallState?.profile?.axes?.combined ?? null;
  const momentumState = overallState?.profile?.meta?.momentumState as
    | MomentumState
    | undefined;
  const isMomentumSlipping = momentumState === "SLIPPING";

  const handleMetricPress = (domain: ClinicalDomain) => {
    if (!overallState) return;

    const profileKey = METRIC_CONFIG[domain].profileKey;

    navigation.navigate("DimensionDetail", {
      domain,
      accentKey: METRIC_CONFIG[domain].accentKey,
      // Passed as a fallback only — the detail screen re-derives from the live
      // store so its number stays synced with its trend line (buildFamilyMetric).
      familyData: {
        combined: buildFamilyMetric(overallState, "combined", profileKey),
        clinical: buildFamilyMetric(overallState, "clinical", profileKey),
        engagement: buildFamilyMetric(overallState, "engagement", profileKey),
      },
      comparisonLabel: overallState.profile.comparison.comparisonLabel,
    });
  };

  // --- Refresh Handler ---
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rotationAnim = useSharedValue(0);

  const onRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    rotationAnim.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false,
    );
    try {
      await fetchAllTrends();
    } catch (err) {
      console.error("Failed to refresh:", err);
    } finally {
      rotationAnim.value = withTiming(0, { duration: 200 });
      setIsRefreshing(false);
    }
  };

  const refreshIconStyle = useAnimatedStyle(
    () => ({ transform: [{ rotate: rotationAnim.value + "deg" }] }),
    [],
  );

  const metricChips = useMemo<MetricChipItem[]>(() => {
    if (!overallState?.profile) return [];
    const combinedAxes = overallState.profile.axes.combined;
    const combinedDeltas = overallState.profile.comparison.deltas.combined;

    return Object.values(ClinicalDomain).map((domain) => {
      const config = METRIC_CONFIG[domain];
      const key = config.profileKey;
      const delta = combinedDeltas[key];
      const uncertainty = overallState.clinical.domains[domain]?.uncertainty ?? 0;
      return {
        key,
        domain,
        config,
        current: combinedAxes[key],
        hasComparison: delta.hasComparison,
        percentDelta: delta.percentDelta,
        trend: delta.trend,
        uncertainty,
      };
    });
  }, [overallState]);

  // Overall growth hero: current value, 4-week series, and week-over-week delta.
  const overall = useMemo(() => {
    if (!combinedProfile) return null;
    const current = overallOf(combinedProfile);
    const series = buildTrendWeeks(historyBuckets, overallState, (agg) =>
      overallOf(agg.profile.axes.combined),
    );
    const prev = series.length >= 2 ? series[series.length - 2].value : null;
    const delta = prev != null ? current - prev : null;
    return {
      current,
      delta,
      values: series.map((w) => w.value),
      labels: series.map((w) => w.label),
    };
  }, [combinedProfile, historyBuckets, overallState]);

  const dynamicSubtitle = useMemo(() => {
    const best = metricChips
      .filter((item) => item.hasComparison && (item.percentDelta ?? 0) > 0)
      .sort((a, b) => (b.percentDelta ?? 0) - (a.percentDelta ?? 0))[0];
    if (!best) return "Building your foundation";
    return `Your ${best.config.label} improved ${Math.abs(
      best.percentDelta ?? 0,
    ).toFixed(0)}%!`;
  }, [metricChips]);

  if (error) {
    return (
      <ErrorStateCard
        onRetry={fetchAllTrends}
        variant="dark"
        style={{ marginVertical: 16 }}
      />
    );
  }

  if (loading || !overallState?.profile || !combinedProfile || !overall) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <View style={styles.textContainer}>
            <SkeletonLoader width={180} height={34} style={{ borderRadius: 6 }} />
            <SkeletonLoader width={240} height={18} style={{ borderRadius: 4 }} />
          </View>
        </View>
        <SkeletonLoader
          width="100%"
          height={120}
          style={{ borderRadius: 16, marginBottom: spacing.xl }}
        />
        <View style={styles.chips}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonLoader
              key={i}
              width="100%"
              height={72}
              style={{ borderRadius: 12, flex: 1 }}
            />
          ))}
        </View>
      </View>
    );
  }

  const deltaColor =
    overall.delta == null || overall.delta === 0
      ? colors.text.tertiary
      : overall.delta > 0
        ? colors.feedback.successText
        : colors.feedback.dangerText;

  return (
    <View>
      <View style={[styles.container, style]}>
        <View style={styles.mainWatermarkContainer}>
          <Icon
            name={icons.growthSeed}
            size={300}
            color={colors.action.primary}
            style={{ opacity: 0.1 }}
          />
        </View>

        {/* Header — title + subtitle, no eyebrow. Momentum chip only when slipping. */}
        <View style={styles.header}>
          {(isRefreshing || isMomentumSlipping) && (
            <View style={styles.headerTopRow}>
              {isRefreshing ? (
                <SkeletonLoader width={80} height={22} style={{ borderRadius: 20 }} />
              ) : (
                <View
                  style={[
                    styles.chipBadge,
                    { backgroundColor: colors.surface.control },
                  ]}
                >
                  <Icon name={icons.warning} size={12} color={colors.text.tertiary} />
                  <Text variant="label" color="secondary">
                    Slipping Momentum
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.textContainer}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: spacing.xs }}>
              <Text variant="h1" color="primary" style={{ paddingRight: 4 }}>
                Growth Profile
              </Text>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text.link, shadowColor: colors.text.link, shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } }} />
            </View>
            <Text variant="body" color="secondary" style={{ marginTop: spacing.xs, fontWeight: "500", fontSize: 16 }}>
              {dynamicSubtitle}
            </Text>
          </View>
        </View>

        {/* Hero — overall growth score + weekly delta + momentum. */}
        <View style={styles.hero}>
          <AnimatedNumber
            value={overall.current}
            variant="screenTitle"
            color="primary"
          />
          <View style={styles.heroMeta}>
            {overall.delta != null && (
              <View style={styles.heroDelta}>
                {overall.delta !== 0 && (
                  <Icon
                    name={overall.delta > 0 ? icons.trend : icons.trendDown}
                    size={14}
                    color={deltaColor}
                  />
                )}
                <Text variant="bodySm" color={deltaColor}>
                  {overall.delta > 0 ? "+" : ""}
                  {overall.delta} this week
                </Text>
              </View>
            )}
            {momentumState && (
              <View
                style={[
                  styles.momentumPill,
                  { backgroundColor: scheme === "dark" ? colors.surface.control : colors.surface.default },
                  scheme !== "dark" && elevation.e1
                ]}
              >
                <Text variant="label" color="secondary">
                  {MOMENTUM_LABEL[momentumState]}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Signature line chart — overall trajectory over 4 weeks. */}
        <View style={styles.chartWrap}>
          <TrendLine
            data={overall.values}
            labels={overall.labels}
            color={colors.text.link}
            height={120}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border.hairline }]} />

        {/* 5 tappable metric chips. */}
        <View style={styles.chips}>
          {metricChips.map((item, index) => (
            <MetricChip
              key={item.key}
              item={item}
              index={index}
              onPress={handleMetricPress}
            />
          ))}
        </View>


      </View>
    </View>
  );
};

const useStyles = makeStyles((c) => ({
  gradientBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  gradientBadgeText: {
    color: "#111111", // Deep dark text "cut out" of the gradient
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontSize: 11,
    fontWeight: "800",
  },
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: spacing.xl,
  },
  mainWatermarkContainer: {
    position: "absolute",
    top: -10,
    right: -80,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },
  header: {
    marginLeft: -spacing.xl,
    marginBottom: space.groupGap,
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    marginBottom: spacing.xl,
  },
  chipBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    gap: spacing.sm,
    alignSelf: "flex-start",
  },
  textContainer: {
    gap: space.titleSub,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.md,
    zIndex: 1,
    marginBottom: spacing.xs,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  heroDelta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  momentumPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  chartWrap: {
    zIndex: 1,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1,
    marginBottom: spacing.lg,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    zIndex: 1,
    marginBottom: spacing.md,
  },
  // ~30% basis wraps 5 tiles into 3-then-2 rows; flexGrow lets each row's
  // tiles stretch evenly to fill the width instead of leaving a gap.
  chipWrap: {
    flexGrow: 1,
    flexBasis: "30%",
  },
  chip: {
    backgroundColor: c.surface.control,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  chipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipTrend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  syncLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: spacing.sm,
    marginLeft: -2,
    gap: spacing.sm,
    zIndex: 1,
  },
  syncText: {
    flex: 1,
  },
}));

export default ClinicalStatsWidget;
