import React, { useEffect, useMemo, useState } from "react";
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
  Icon,
  Text,
  icons,
  makeStyles,
  spacing,
  space,
  radius,
  useTheme,
  useMotion,
  duration,
  easing,
} from "../../design-system";
import type { IconName } from "../../design-system/components/Icon";
import PressableScale from "../PressableScale";
import SkeletonLoader from "../SkeletonLoader";
import ErrorStateCard from "./ErrorStateCard";
import { useNavigation } from "@react-navigation/native";
import { HomeStackNavigationProp } from "../../navigators/index";

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

type MetricRowItem = {
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

/**
 * One tappable metric row: accent icon + name, an animated bar of the combined
 * score with a ghost tick at last week's value, and a right-aligned delta chip.
 * Precise and scannable where the old radar was a blob — every metric's weekly
 * change is visible at a glance, and the whole row is an obvious tap target.
 */
const MetricRow: React.FC<{
  item: MetricRowItem;
  index: number;
  onPress: (domain: ClinicalDomain) => void;
}> = ({ item, index, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const motion = useMotion();

  const accent = colors.accent[item.config.accentKey];
  const current = clamp(item.current ?? 0, 0, 100);
  const previous =
    item.hasComparison && item.previous != null
      ? clamp(item.previous, 0, 100)
      : null;

  // Bar fills 0 → score on mount (skipped under reduced motion).
  const fillAnim = useSharedValue(motion.reduced ? current : 0);
  useEffect(() => {
    fillAnim.value = motion.reduced
      ? current
      : withTiming(current, { duration: duration.reveal, easing: easing.out });
  }, [current, motion.reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillAnim.value}%`,
  }));

  const pct = item.percentDelta;
  const improving = item.trend === "IMPROVING" && (pct ?? 0) > 0;
  const worsening = item.trend === "WORSENING" && (pct ?? 0) < 0;
  const showDelta = item.hasComparison && pct != null && (improving || worsening);
  const deltaColor = improving
    ? colors.feedback.successText
    : colors.feedback.dangerText;

  return (
    <Animated.View entering={motion.stagger(index)}>
      <PressableScale
        scaleTo={0.98}
        onPress={() => onPress(item.domain)}
        style={styles.row}
      >
        <View style={styles.labelBox}>
          <Icon name={item.config.icon} size={18} color={accent} />
          <Text variant="title" color="primary" numberOfLines={1}>
            {item.config.label}
          </Text>
        </View>

        <View style={styles.trackWrap}>
          <View style={styles.track}>
            <Animated.View
              style={[styles.fill, { backgroundColor: accent }, fillStyle]}
            />
          </View>
          {previous != null && (
            <View
              style={[
                styles.ghostTick,
                { left: `${previous}%`, backgroundColor: colors.text.tertiary },
              ]}
              pointerEvents="none"
            />
          )}
        </View>

        <View style={styles.deltaBox}>
          {showDelta ? (
            <View style={styles.deltaRow}>
              <Icon
                name={improving ? icons.trend : icons.trendDown}
                size={14}
                color={deltaColor}
              />
              <Text variant="bodySm" color={deltaColor}>
                {improving ? "+" : ""}
                {Math.round(pct)}%
              </Text>
            </View>
          ) : (
            <Text variant="bodySm" color="tertiary">
              –
            </Text>
          )}
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const ClinicalStatsWidget = ({ style }: { style?: any }) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const {
    overallState,
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

  const onRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    // Continuous rotation on the sync glyph while fetching.
    rotationAnim.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    try {
      await fetchAllTrends();
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      rotationAnim.value = withTiming(0, { duration: 200 });
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

  // All 5 metrics as rows (combined family), in the canonical domain order.
  const metricRows = useMemo<MetricRowItem[]>(() => {
    if (!overallState?.profile) {
      return [];
    }

    const combinedAxes = overallState.profile.axes.combined;
    const combinedDeltas = overallState.profile.comparison.deltas.combined;

    return Object.values(ClinicalDomain).map((domain) => {
      const config = METRIC_CONFIG[domain];
      const key = config.profileKey;
      const delta = combinedDeltas[key];

      return {
        key,
        domain,
        config,
        current: combinedAxes[key],
        previous: delta.previous,
        absoluteDelta: delta.absoluteDelta,
        percentDelta: delta.percentDelta,
        hasComparison: delta.hasComparison,
        trend: delta.trend,
      };
    });
  }, [overallState]);

  const dynamicSubtitle = useMemo(() => {
    const best = metricRows
      .filter((item) => item.hasComparison && (item.percentDelta ?? 0) > 0)
      .sort((a, b) => (b.percentDelta ?? 0) - (a.percentDelta ?? 0))[0];

    if (!best) {
      return "Building your foundation";
    }

    return `Your ${best.config.label} improved ${Math.abs(
      best.percentDelta ?? 0,
    ).toFixed(0)}%!`;
  }, [metricRows]);

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
  if (loading || !overallState?.profile || !combinedProfile) {
    return (
      <View style={[styles.container, style]}>
        {/* Header Skeleton */}
        <View style={styles.header}>
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

        {/* Metric rows skeleton */}
        <View style={styles.rows}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonLoader
              key={i}
              width="100%"
              height={32}
              style={{ borderRadius: 8 }}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View>
      <View style={[styles.container, style]}>
        {/* Decorative watermark — sprout, echoing the card's growth identity
            (the same glyph the app's other growth-journey cards use). */}
        <View style={styles.mainWatermarkContainer}>
          <Icon
            name={icons.growthSeed}
            size={300}
            color={colors.action.primary}
            style={{ opacity: 0.1 }}
          />
        </View>

        {/* Header — title + subtitle, no eyebrow. The momentum chip is a
            functional status badge, shown above the title only when slipping. */}
        <View style={styles.header}>
          {(isRefreshing || isMomentumSlipping) && (
            <View style={styles.headerTopRow}>
              {isRefreshing ? (
                <SkeletonLoader
                  width={80}
                  height={22}
                  style={{ borderRadius: 20 }}
                />
              ) : (
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
                    Slipping Momentum
                  </Text>
                </View>
              )}
            </View>
          )}

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
                <Text variant="body" color="secondary" style={styles.subtitle}>
                  {dynamicSubtitle}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Metric rows — the whole profile, one precise bar per dimension. */}
        <View style={styles.rows}>
          {metricRows.map((item, index) => (
            <MetricRow
              key={item.key}
              item={item}
              index={index}
              onPress={handleMetricPress}
            />
          ))}
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
    borderColor: c.border.hairline,
  },
  mainWatermarkContainer: {
    position: "absolute",
    top: -10,
    right: -80,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },
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
  // Metric rows
  rows: {
    gap: space.rowGap,
    zIndex: 1,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: spacing.md,
  },
  labelBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    width: 118,
  },
  trackWrap: {
    flex: 1,
    height: 10,
    justifyContent: "center",
  },
  track: {
    height: 6,
    borderRadius: radius.xs,
    backgroundColor: c.surface.control,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.xs,
  },
  ghostTick: {
    position: "absolute",
    top: 0,
    width: 2,
    height: 10,
    borderRadius: 1,
  },
  deltaBox: {
    width: 64,
    alignItems: "flex-end",
  },
  deltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  syncLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: spacing.sm,
    gap: spacing.sm,
    paddingVertical: 0,
    zIndex: 1,
  },
  syncText: {
    width: "100%",
  },
}));

export default ClinicalStatsWidget;
