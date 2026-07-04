import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  ClinicalDomain,
  GrowthProfileMetrics,
} from "../../api/userBehaviorTrends/types";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import { useNavigation, useRoute } from "@react-navigation/native";
import { HomeStackNavigationProp, HomeStackRouteProp } from "../../navigators/index";
import {
  Page,
  Text,
  Icon,
  IconName,
  icons,
  Segmented,
  ProgressRing,
  AnimatedNumber,
  useTheme,
  useMotion,
  makeStyles,
  withAlpha,
  spacing,
  space,
  radius,
  duration,
  easing,
  SemanticColors,
} from "../../design-system";

type DetailFamily = "combined" | "clinical" | "engagement";
type AccentKey = keyof SemanticColors["accent"];

type FamilyMetricData = {
  currentScore: number | null;
  previousScore: number | null;
  percentDelta: number | null;
  absoluteDelta: number | null;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
};

const FAMILY_ORDER: DetailFamily[] = ["combined", "clinical", "engagement"];

const FAMILY_LABELS: Record<DetailFamily, string> = {
  combined: "Combined",
  clinical: "Clinical",
  engagement: "Engagement",
};

/** Axis key for each domain — mirrors the Growth Profile card's METRIC_CONFIG. */
const PROFILE_KEYS: Record<ClinicalDomain, keyof GrowthProfileMetrics> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: "confidence",
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: "courage",
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: "mastery",
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: "ease",
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: "social",
};

const FAMILY_DESCRIPTIONS: Record<
  ClinicalDomain,
  Record<DetailFamily, string>
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    combined:
      "Overall view combining your steadier baseline with how communication has felt lately.",
    clinical:
      "Steadier baseline based on validated clinical responses about confidence and speech impact.",
    engagement:
      "Short-term signal from recent check-ins about confidence, anxiety, and stress.",
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    combined:
      "Overall view combining your steadier baseline with how much you have been approaching speaking lately.",
    clinical:
      "Steadier baseline based on validated clinical responses related to avoidance.",
    engagement:
      "Short-term signal from recent check-ins about your urge to avoid speaking moments.",
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    combined:
      "Overall view combining your steadier baseline with recent signs of how manageable speech has felt.",
    clinical:
      "Steadier baseline based on validated clinical responses about speech struggle and control.",
    engagement:
      "Short-term signal from recent secondary-behavior patterns. It does not capture all of your skill use on its own.",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    combined:
      "Overall view combining your steadier baseline with how manageable speaking has felt lately.",
    clinical:
      "Steadier baseline based on validated clinical responses about everyday speaking impact.",
    engagement:
      "Short-term signal from recent check-ins about tension, body awareness, and comfort.",
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    combined:
      "Overall view combining your steadier baseline with your recent participation activity.",
    clinical:
      "Steadier baseline based on validated clinical responses about participation and social impact.",
    engagement:
      "Short-term signal from recent exposure practice activity. It is not a full measure of your social life yet.",
  },
};

const DIMENSION_CONFIG: Record<
  ClinicalDomain,
  {
    label: string;
    accentKey: AccentKey;
    icon: IconName;
    description: string;
    recommendations: {
      IMPROVING: string;
      STABLE: string;
      WORSENING: string;
    };
  }
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    label: "Confidence",
    accentKey: "success",
    icon: icons.confidence,
    description:
      "How confident you feel communicating, even when speech is not perfect.",
    recommendations: {
      IMPROVING:
        "Confidence seems to be building. Keep choosing speaking moments that feel meaningful and manageable.",
      STABLE:
        "A steady week still matters. One small speaking win can help strengthen trust in your voice.",
      WORSENING:
        "If confidence dips, step back to a simpler speaking situation and rebuild from there.",
    },
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    accentKey: "danger",
    icon: icons.courage,
    description:
      "How willing you are to enter speaking moments instead of avoiding them.",
    recommendations: {
      IMPROVING:
        "You’re approaching more speaking moments. Keep the next step small, specific, and repeatable.",
      STABLE:
        "A steady stretch can still be progress. Pick one speaking moment next that is slightly outside your comfort zone.",
      WORSENING:
        "If avoidance is growing, shrink the challenge rather than stopping. Smaller, supported reps help rebuild momentum.",
    },
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery",
    accentKey: "info",
    icon: icons.mastery,
    description:
      "How reliably you’re using helpful tools and strategies to manage speech.",
    recommendations: {
      IMPROVING:
        "Your tools seem to be helping more reliably. Keep practicing them in real situations, not just drills.",
      STABLE:
        "A steady week is a good time to sharpen one dependable strategy instead of changing everything at once.",
      WORSENING:
        "If speech feels harder to manage, return to one dependable strategy and practice it in a lower-pressure setting.",
    },
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease",
    accentKey: "purple",
    icon: icons.ease,
    description:
      "How manageable and less effortful speaking feels in everyday moments.",
    recommendations: {
      IMPROVING:
        "Speaking seems to be feeling a little easier. Keep your practice regular and low-pressure so that comfort can carry over.",
      STABLE:
        "Steady ease still counts. Gentle repetition can help comfort build over time.",
      WORSENING:
        "If speaking feels harder lately, lower the pressure and pair speaking with a calming routine that works for you.",
    },
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    accentKey: "warning",
    icon: icons.social,
    description:
      "How much you’re taking part in conversations and speaking situations that matter to you.",
    recommendations: {
      IMPROVING:
        "You’re participating more. Keep choosing speaking moments that matter to you, not just more moments.",
      STABLE:
        "A steady week can still be a foundation. One small initiation or response can help widen participation.",
      WORSENING:
        "If participation is shrinking, start with safer conversations and build outward from there.",
    },
  },
};

const GAUGE_SIZE = 160;
const GAUGE_STROKE = 14;
const TREND_COLUMN_MAX = 72;

type TrendWeek = {
  key: string;
  label: string;
  value: number | null; // null = no data → hollow column
  isCurrent: boolean;
};

/** One weekly column — grows 0 → value on mount (static under reduced motion). */
const TrendColumn: React.FC<{ week: TrendWeek; accent: string; tint: string }> = ({
  week,
  accent,
  tint,
}) => {
  const styles = useStyles();
  const motion = useMotion();

  const target =
    week.value == null
      ? 0
      : Math.max((Math.min(100, Math.max(0, week.value)) / 100) * TREND_COLUMN_MAX, 6);

  const heightAnim = useSharedValue(motion.reduced ? target : 0);
  useEffect(() => {
    heightAnim.value = motion.reduced
      ? target
      : withTiming(target, { duration: duration.reveal, easing: easing.out });
  }, [target, motion.reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  const barStyle = useAnimatedStyle(() => ({ height: heightAnim.value }));

  return (
    <View style={styles.trendColumn}>
      <View style={styles.trendColumnWell}>
        {week.value == null ? (
          <View style={styles.trendHollow} />
        ) : (
          <Animated.View
            style={[
              styles.trendBar,
              { backgroundColor: week.isCurrent ? accent : tint },
              barStyle,
            ]}
          />
        )}
      </View>
      <Text
        variant="caption"
        color={week.isCurrent ? "secondary" : "tertiary"}
        center
      >
        {week.label}
      </Text>
    </View>
  );
};

const DimensionDetailScreen = () => {
  const route = useRoute<HomeStackRouteProp<"DimensionDetail">>();
  const navigation = useNavigation<HomeStackNavigationProp<"DimensionDetail">>();
  const { colors } = useTheme();
  const styles = useStyles();
  const motion = useMotion();
  const { historyBuckets, overallState } = useUserBehaviorTrendsStore();
  const { domain, familyData: rawFamilyData } = route.params;

  const familyData = rawFamilyData as Record<DetailFamily, FamilyMetricData>;

  const [selectedFamily, setSelectedFamily] = useState<DetailFamily>("combined");

  const profileKey = domain ? PROFILE_KEYS[domain as ClinicalDomain] : "confidence";

  // 4 weekly columns, oldest → newest, ending at the current week ("Now").
  // History buckets may or may not include the current period — normalize so the
  // last column is always this week's live value from `overallState`.
  const trendWeeks = useMemo<TrendWeek[]>(() => {
    const currentPeriodKey = overallState?.periodKey ?? null;
    const currentValue =
      overallState?.profile?.axes?.[selectedFamily]?.[profileKey] ?? null;

    const pastBuckets = [...historyBuckets]
      .sort((a, b) => String(a.periodKey).localeCompare(String(b.periodKey)))
      .filter((bucket) => bucket.periodKey !== currentPeriodKey)
      .slice(-3);

    const past = pastBuckets.map((bucket) => ({
      key: bucket.periodKey,
      label: "",
      value:
        bucket.hasData && bucket.snapshot
          ? bucket.snapshot.profile.axes[selectedFamily]?.[profileKey] ?? null
          : null,
      isCurrent: false,
    }));

    // Pad to exactly 3 past weeks so the block never collapses pre-history.
    while (past.length < 3) {
      past.unshift({ key: `empty-${past.length}`, label: "", value: null, isCurrent: false });
    }

    const weeks: TrendWeek[] = [
      ...past,
      {
        key: currentPeriodKey ?? "now",
        label: "Now",
        value: currentValue,
        isCurrent: true,
      },
    ];

    return weeks.map((week, index) =>
      week.isCurrent
        ? week
        : { ...week, label: `${weeks.length - 1 - index}w` },
    );
  }, [historyBuckets, overallState, selectedFamily, profileKey]);

  if (!domain) return null;

  const config = DIMENSION_CONFIG[domain as ClinicalDomain];
  const accentColor = colors.accent[config.accentKey];
  const onAccentColor = colors.accentOn[config.accentKey];
  const accentTint = colors.accentTint[config.accentKey];
  const activeMetrics = familyData[selectedFamily];
  const isUnavailable = activeMetrics.currentScore === null;
  const hasComparison = activeMetrics.previousScore !== null;
  const trend = activeMetrics.trend;
  const trendColor =
    trend === "IMPROVING"
      ? colors.feedback.successText
      : trend === "WORSENING"
        ? colors.feedback.dangerText
        : colors.text.tertiary;

  const score = activeMetrics.currentScore;
  const isEngagementEmpty = selectedFamily === "engagement" && isUnavailable;

  const familyScore = (family: DetailFamily) => {
    const value = familyData[family]?.currentScore;
    return value == null ? "—" : String(Math.round(value));
  };

  return (
    <Page
      title={config.label}
      description={config.description}
      onBack={() => navigation.goBack()}
    >
      {/* Faint domain watermark, behind the content. */}
      <View style={styles.watermark} pointerEvents="none">
        <Icon name={config.icon} size={400} color={withAlpha(accentColor, 0.1)} />
      </View>

      <View style={styles.card}>
        {/* Family switcher — DS segmented control in the metric's accent. */}
        <Animated.View entering={motion.stagger(0)} style={styles.switcherWrap}>
          <Segmented
            options={FAMILY_ORDER.map((f) => FAMILY_LABELS[f])}
            value={FAMILY_LABELS[selectedFamily]}
            onChange={(label) => {
              const next = FAMILY_ORDER.find((f) => FAMILY_LABELS[f] === label);
              if (next) setSelectedFamily(next);
            }}
            accentColor={accentColor}
            onAccentColor={onAccentColor}
          />
        </Animated.View>

        {/* 3-family strip — how the blend relates, without tab-hopping. */}
        <Animated.View entering={motion.stagger(1)} style={styles.familyStrip}>
          {FAMILY_ORDER.map((family, index) => (
            <React.Fragment key={family}>
              {index > 0 && (
                <Text variant="bodySm" color="tertiary">
                  ·
                </Text>
              )}
              <Text
                variant="bodySm"
                color={family === selectedFamily ? accentColor : "secondary"}
              >
                {FAMILY_LABELS[family]} {familyScore(family)}
              </Text>
            </React.Fragment>
          ))}
        </Animated.View>

        <Animated.View entering={motion.stagger(2)}>
          <Text variant="bodySm" color="secondary" center style={styles.familyDesc}>
            {FAMILY_DESCRIPTIONS[domain as ClinicalDomain][selectedFamily]}
          </Text>
        </Animated.View>

        {/* Hero — DS ring + counting score. Re-keyed per family so the count
            replays when the view actually changes. */}
        <Animated.View entering={motion.stagger(3)} style={styles.gaugeWrapper}>
          <ProgressRing
            progress={score === null ? 0 : score / 100}
            size={GAUGE_SIZE}
            strokeWidth={GAUGE_STROKE}
            color={accentColor}
            trackColor={colors.surface.control}
          >
            <Text variant="label" color="tertiary">
              Current Score
            </Text>
            {score === null ? (
              <Text variant="display" color="tertiary">
                —
              </Text>
            ) : (
              <AnimatedNumber
                key={selectedFamily}
                value={Math.round(score)}
                variant="display"
                color="primary"
              />
            )}
          </ProgressRing>
        </Animated.View>

        <Animated.View entering={motion.stagger(4)} style={styles.trendChipGroup}>
          <View style={styles.trendRow}>
            <Icon
              name={
                !hasComparison
                  ? icons.duration
                  : trend === "IMPROVING"
                    ? icons.trend
                    : trend === "WORSENING"
                      ? icons.trendDown
                      : "minus"
              }
              size={16}
              color={trendColor}
            />
            <Text variant="bodySm" color={trendColor}>
              {!hasComparison
                ? "Waiting for history"
                : `${(activeMetrics.percentDelta ?? 0) > 0 ? "+" : ""}${activeMetrics.percentDelta?.toFixed(1)}% since last week`}
            </Text>
          </View>

          {hasComparison && (
            <Text variant="caption" color="tertiary" style={styles.previousScore}>
              Previously {Math.round(activeMetrics.previousScore ?? 0)}
            </Text>
          )}
        </Animated.View>

        {/* 4-week trend — from the history buckets the store already fetches. */}
        <Animated.View entering={motion.stagger(5)} style={styles.trendBlock}>
          <Text variant="title" color="primary" style={styles.trendTitle}>
            Last 4 weeks
          </Text>
          <View style={styles.trendColumns}>
            {trendWeeks.map((week) => (
              <TrendColumn
                key={`${selectedFamily}-${week.key}`}
                week={week}
                accent={accentColor}
                tint={accentTint}
              />
            ))}
          </View>
        </Animated.View>

        {/* Insight — or the engagement empty state when there's no signal yet. */}
        <Animated.View
          entering={motion.stagger(6)}
          style={[styles.insight, { borderTopColor: colors.border.hairline }]}
        >
          <Icon
            name={icons.energy}
            size={16}
            color={accentColor}
            style={styles.insightIcon}
          />
          <Text variant="bodySm" color="secondary" style={styles.insightText}>
            {isEngagementEmpty
              ? "No engagement signal yet — practice this week to build it."
              : isUnavailable
                ? "Reflection pending..."
                : config.recommendations[trend]}
          </Text>
        </Animated.View>
      </View>
    </Page>
  );
};

export default DimensionDetailScreen;

const useStyles = makeStyles((c) => ({
  watermark: {
    position: "absolute",
    top: 0,
    right: -150,
    zIndex: -1,
    transform: [{ rotate: "-15deg" }],
  },
  card: {
    backgroundColor: c.surface.default,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: c.border.hairline,
    padding: spacing["2xl"],
    alignItems: "center",
  },
  switcherWrap: {
    alignSelf: "stretch",
    marginBottom: space.groupGap,
  },
  familyStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    marginBottom: space.groupGap,
  },
  familyDesc: {
    paddingHorizontal: spacing.md,
    marginBottom: space.sectionGap,
  },
  gaugeWrapper: {
    marginBottom: space.groupGap,
  },
  trendChipGroup: {
    alignItems: "center",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    backgroundColor: c.surface.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.input,
  },
  previousScore: {
    marginTop: spacing.xs,
  },
  trendBlock: {
    width: "100%",
    marginTop: space.sectionGap,
  },
  trendTitle: {
    marginBottom: space.groupGap,
  },
  trendColumns: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  trendColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  trendColumnWell: {
    height: 72,
    justifyContent: "flex-end",
  },
  trendBar: {
    borderRadius: radius.xs,
  },
  trendHollow: {
    height: 6,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: c.border.hairline,
  },
  insight: {
    marginTop: space.sectionGap,
    paddingTop: space.groupGap,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.rowGap,
    width: "100%",
  },
  insightIcon: {
    marginTop: 2,
  },
  insightText: {
    flex: 1,
  },
}));
