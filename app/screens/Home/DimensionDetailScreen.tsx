import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withSpring,
} from "react-native-reanimated";
import {
  ClinicalDomain,
  GrowthProfileMetrics,
} from "../../api/userBehaviorTrends/types";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import { buildTrendWeeks } from "../../stores/userBehaviorTrends/selectors";
import { useNavigation, useRoute } from "@react-navigation/native";
import { HomeStackNavigationProp, HomeStackRouteProp } from "../../navigators/index";
import {
  Page,
  Text,
  Icon,
  IconName,
  icons,
  TrendLine,
  AnimatedNumber,
  haptics,
  spring,
  useTheme,
  useMotion,
  makeStyles,
  withAlpha,
  spacing,
  space,
  radius,
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

/** Growth-family lens icons — collision-free glyphs that denote each tab. */
const FAMILY_ICONS: Record<DetailFamily, IconName> = {
  combined: icons.lensCombined,
  clinical: icons.lensClinical,
  engagement: icons.lensEngagement,
};

/**
 * One family tab — the Community `TabDock` mechanic: icon-only when idle, the label
 * expands + the accent pill fills in when active, all on the shared `gentle` spring.
 */
const FamilyTab: React.FC<{
  label: string;
  icon: IconName;
  active: boolean;
  accent: string;
  onAccent: string;
  onPress: () => void;
}> = ({ label, icon, active, accent, onAccent, onPress }) => {
  const { colors } = useTheme();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const labelTarget = label.length * 8 + 4; // generous so a glyph run never clips
  const v = useDerivedValue(
    () => (reduced ? (active ? 1 : 0) : withSpring(active ? 1 : 0, spring.gentle)),
    [active, reduced],
  );

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      Math.min(1, Math.max(0, v.value)),
      [0, 1],
      ["transparent", accent],
    ),
  }));
  const idleIconStyle = useAnimatedStyle(() => ({ opacity: 1 - v.value }));
  const activeIconStyle = useAnimatedStyle(() => ({ opacity: v.value }));
  const labelStyle = useAnimatedStyle(() => ({
    width: Math.max(0, interpolate(v.value, [0, 1], [0, labelTarget])),
    marginLeft: Math.max(0, interpolate(v.value, [0, 1], [0, 6])),
    opacity: Math.max(0, Math.min(1, v.value)),
  }));

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.tabPill, pillStyle]}>
          <View style={styles.tabIconBox}>
            <Animated.View style={[styles.tabIconLayer, idleIconStyle]}>
              <Icon name={icon} size={18} color={colors.text.tertiary} />
            </Animated.View>
            <Animated.View style={[styles.tabIconLayer, activeIconStyle]}>
              <Icon name={icon} size={18} color={onAccent} />
            </Animated.View>
          </View>
        <Animated.View style={[styles.tabLabelWrap, labelStyle]}>
          <Text
            variant="bodySm"
            color={onAccent}
            numberOfLines={1}
            style={styles.tabLabelText}
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
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

  const profileKey = domain
    ? PROFILE_KEYS[domain as ClinicalDomain]
    : "confidence";

  // 4-week trend of the selected family's metric.
  const trendValues = useMemo(
    () =>
      buildTrendWeeks(
        historyBuckets,
        overallState,
        (agg) => agg.profile.axes[selectedFamily]?.[profileKey] ?? null,
      ),
    [historyBuckets, overallState, selectedFamily, profileKey],
  );

  if (!domain) return null;

  const config = DIMENSION_CONFIG[domain as ClinicalDomain];
  const accentColor = colors.accent[config.accentKey];
  const onAccentColor = colors.accentOn[config.accentKey];
  const activeMetrics = familyData[selectedFamily];
  const score = activeMetrics.currentScore;
  const isUnavailable = score === null;
  const hasComparison = activeMetrics.previousScore !== null;
  const trend = activeMetrics.trend;
  const trendColor =
    trend === "IMPROVING"
      ? colors.feedback.successText
      : trend === "WORSENING"
        ? colors.feedback.dangerText
        : colors.text.tertiary;
  const isEngagementEmpty = selectedFamily === "engagement" && isUnavailable;
  const hasTrendData = trendValues.some((w) => w.value != null);

  return (
    <Page
      title={config.label}
      description={config.description}
      onBack={() => navigation.goBack()}
    >
      {/* Family tabs — Community-style morphing pill (label only). */}
      <Animated.View entering={motion.stagger(0)} style={styles.tabs}>
        {FAMILY_ORDER.map((family) => (
          <FamilyTab
            key={family}
            label={FAMILY_LABELS[family]}
            icon={FAMILY_ICONS[family]}
            active={family === selectedFamily}
            accent={accentColor}
            onAccent={onAccentColor}
            onPress={() => {
              if (family !== selectedFamily) haptics.selection();
              setSelectedFamily(family);
            }}
          />
        ))}
      </Animated.View>

      <Animated.View entering={motion.stagger(1)}>
        <Text variant="bodySm" color="secondary" style={styles.familyDesc}>
          {FAMILY_DESCRIPTIONS[domain as ClinicalDomain][selectedFamily]}
        </Text>
      </Animated.View>

      {/* Score + trend read top-left, the 4-week trajectory flows below them. */}
      <Animated.View entering={motion.stagger(2)} style={styles.chartHero}>
        <View style={styles.chartHeader}>
          <View style={styles.chartHeaderLeft}>
            <Text variant="label" color="tertiary">
              This week
            </Text>
            {isUnavailable ? (
              <Text variant="screenTitle" color="tertiary">
                —
              </Text>
            ) : (
              <AnimatedNumber
                key={selectedFamily}
                value={Math.round(score)}
                variant="screenTitle"
                color="primary"
              />
            )}
          </View>

          {!isUnavailable && (
            <View style={styles.readoutMeta}>
              {hasComparison ? (
                <>
                  <View
                    style={[
                      styles.trendPill,
                      { backgroundColor: withAlpha(trendColor, 0.14) },
                    ]}
                  >
                    <Icon
                      name={
                        trend === "IMPROVING"
                          ? icons.trend
                          : trend === "WORSENING"
                            ? icons.trendDown
                            : "minus"
                      }
                      size={15}
                      color={trendColor}
                    />
                    <Text variant="title" color={trendColor}>
                      {Math.abs(activeMetrics.percentDelta ?? 0).toFixed(1)}%
                    </Text>
                  </View>
                  <Text variant="caption" color="tertiary">
                    vs last week · was {Math.round(activeMetrics.previousScore ?? 0)}
                  </Text>
                </>
              ) : (
                <View
                  style={[styles.trendPill, { backgroundColor: colors.surface.control }]}
                >
                  <Icon name={icons.duration} size={15} color={colors.text.tertiary} />
                  <Text variant="bodySm" color="tertiary">
                    New baseline
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {hasTrendData ? (
          <TrendLine
            data={trendValues.map((w) => w.value)}
            labels={trendValues.map((w) => w.label)}
            color={accentColor}
            height={128}
          />
        ) : (
          <Text variant="bodySm" color="tertiary" style={styles.trendEmpty}>
            Not enough signal yet — a few weeks of practice will draw your trend.
          </Text>
        )}
      </Animated.View>

      {/* Insight message — closes the screen. */}
      <Animated.View
        entering={motion.stagger(3)}
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
    </Page>
  );
};

export default DimensionDetailScreen;

const useStyles = makeStyles((c) => ({
  // Hugs its tabs (like the Community dock) instead of filling the width.
  tabs: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: c.surface.default,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    marginBottom: space.groupGap,
  },
  // Icon-only when idle; the accent fill + label expand in when active.
  tabPill: {
    flexDirection: "row",
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  tabIconBox: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabelWrap: {
    overflow: "hidden",
    justifyContent: "center",
  },
  tabLabelText: {
    textAlign: "center",
  },
  familyDesc: {
    marginBottom: space.sectionGap,
  },
  chartHero: {
    marginBottom: space.sectionGap,
  },
  // Label + score sit top-left; trend detail top-right; the chart flows below.
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: space.rowGap,
  },
  chartHeaderLeft: {
    gap: spacing.xxs,
  },
  readoutMeta: {
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  trendEmpty: {
    marginTop: space.groupGap,
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  insight: {
    paddingTop: space.groupGap,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.rowGap,
  },
  insightIcon: {
    marginTop: 2,
  },
  insightText: {
    flex: 1,
  },
}));
