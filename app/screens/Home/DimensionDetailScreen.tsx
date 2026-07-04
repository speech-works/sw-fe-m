import React, { useMemo, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
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
  useTheme,
  useMotion,
  makeStyles,
  spacing,
  space,
  radius,
  SemanticColors,
} from "../../design-system";
import PressableScale from "../../components/PressableScale";

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
      {/* Family tabs — each family's score is an inline hint next to its label. */}
      <Animated.View entering={motion.stagger(0)} style={styles.tabs}>
        {FAMILY_ORDER.map((family) => {
          const active = family === selectedFamily;
          return (
            <PressableScale
              key={family}
              scaleTo={0.97}
              onPress={() => {
                if (!active) haptics.selection();
                setSelectedFamily(family);
              }}
              style={[
                styles.tab,
                { backgroundColor: active ? accentColor : "transparent" },
              ]}
            >
              <Text variant="bodySm" color={active ? onAccentColor : "tertiary"}>
                {FAMILY_LABELS[family]}
              </Text>
              <Text variant="label" color={active ? onAccentColor : "secondary"}>
                {familyScore(family)}
              </Text>
            </PressableScale>
          );
        })}
      </Animated.View>

      <Animated.View entering={motion.stagger(1)}>
        <Text variant="bodySm" color="secondary" style={styles.familyDesc}>
          {FAMILY_DESCRIPTIONS[domain as ClinicalDomain][selectedFamily]}
        </Text>
      </Animated.View>

      {/* Hero number + delta. */}
      <Animated.View entering={motion.stagger(2)} style={styles.hero}>
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
        {hasComparison && !isUnavailable ? (
          <>
            <View
              style={[styles.deltaChip, { backgroundColor: colors.surface.control }]}
            >
              <Icon
                name={
                  trend === "IMPROVING"
                    ? icons.trend
                    : trend === "WORSENING"
                      ? icons.trendDown
                      : "minus"
                }
                size={16}
                color={trendColor}
              />
              <Text variant="bodySm" color={trendColor}>
                {(activeMetrics.percentDelta ?? 0) > 0 ? "+" : ""}
                {activeMetrics.percentDelta?.toFixed(1)}% vs last week
              </Text>
            </View>
            <Text variant="caption" color="tertiary" style={styles.prev}>
              Previously {Math.round(activeMetrics.previousScore ?? 0)}
            </Text>
          </>
        ) : (
          !isUnavailable && (
            <View
              style={[styles.deltaChip, { backgroundColor: colors.surface.control }]}
            >
              <Icon name={icons.duration} size={16} color={colors.text.tertiary} />
              <Text variant="bodySm" color="tertiary">
                Waiting for history
              </Text>
            </View>
          )
        )}
      </Animated.View>

      {/* Signature 4-week trend line. */}
      <Animated.View entering={motion.stagger(3)} style={styles.trendBlock}>
        <Text variant="title" color="primary" style={styles.trendTitle}>
          Last 4 weeks
        </Text>
        {hasTrendData ? (
          <TrendLine
            data={trendValues.map((w) => w.value)}
            labels={trendValues.map((w) => w.label)}
            color={accentColor}
            height={120}
          />
        ) : (
          <Text variant="bodySm" color="tertiary">
            Not enough signal yet — a few weeks of practice will draw your trend.
          </Text>
        )}
      </Animated.View>

      {/* Insight — or the engagement empty state. */}
      <Animated.View
        entering={motion.stagger(4)}
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
  tabs: {
    flexDirection: "row",
    backgroundColor: c.surface.default,
    borderRadius: radius.chip,
    padding: 4,
    gap: 4,
    marginBottom: space.groupGap,
  },
  // Single line — label + inline score hint, standard 38px segmented height.
  tab: {
    flex: 1,
    height: 38,
    borderRadius: radius.chip - 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inlineGap,
  },
  familyDesc: {
    marginBottom: space.sectionGap,
  },
  hero: {
    alignItems: "center",
    gap: space.rowGap,
    marginBottom: space.sectionGap,
  },
  deltaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.input,
  },
  prev: {
    marginTop: -spacing.xs,
  },
  trendBlock: {
    marginBottom: space.sectionGap,
  },
  trendTitle: {
    marginBottom: space.groupGap,
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
