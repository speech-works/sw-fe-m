import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Svg, Circle } from "react-native-svg";
import { ClinicalDomain } from "../../api/userBehaviorTrends/types";
import { useNavigation, useRoute } from "@react-navigation/native";
import { HomeStackNavigationProp, HomeStackRouteProp } from "../../navigators/index";
import {
  Page,
  Text,
  Icon,
  IconName,
  icons,
  useTheme,
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

const FAMILY_CONFIG: Record<DetailFamily, { label: string; accentKey: AccentKey }> = {
  combined: { label: "Combined", accentKey: "warning" },
  clinical: { label: "Clinical", accentKey: "success" },
  engagement: { label: "Engagement", accentKey: "info" },
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

const DimensionDetailScreen = () => {
  const route = useRoute<HomeStackRouteProp<"DimensionDetail">>();
  const navigation = useNavigation<HomeStackNavigationProp<"DimensionDetail">>();
  const { colors } = useTheme();
  const styles = useStyles();
  const { domain, familyData: rawFamilyData } = route.params;

  const familyData = rawFamilyData as Record<DetailFamily, FamilyMetricData>;

  const [selectedFamily, setSelectedFamily] = useState<DetailFamily>("combined");

  if (!domain) return null;

  const config = DIMENSION_CONFIG[domain as ClinicalDomain];
  const accentColor = colors.accent[config.accentKey];
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

  // Gauge ring geometry (unchanged math; colours are tokens now).
  const gaugeRadius = (GAUGE_SIZE - GAUGE_STROKE) / 2;
  const circumference = 2 * Math.PI * gaugeRadius;
  const score = activeMetrics.currentScore;
  const progress = score === null ? 0 : score / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Page
      title={config.label}
      description={config.description}
      onBack={() => navigation.goBack()}
    >
      {/* Faint domain watermark, behind the content. */}
      <View style={styles.watermark} pointerEvents="none">
        <Icon name={config.icon} size={400} color={withAlpha(accentColor, 0.08)} />
      </View>

      <View style={styles.card}>
        <View style={styles.switcher}>
          {(Object.keys(FAMILY_CONFIG) as DetailFamily[]).map((f) => {
            const active = f === selectedFamily;
            return (
              <TouchableOpacity
                key={f}
                activeOpacity={0.8}
                onPress={() => setSelectedFamily(f)}
                style={[
                  styles.switcherPill,
                  active && { backgroundColor: accentColor },
                ]}
              >
                <Text
                  variant="bodySm"
                  color={active ? colors.accentOn[config.accentKey] : colors.text.tertiary}
                >
                  {FAMILY_CONFIG[f].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text variant="bodySm" color="secondary" center style={styles.familyDesc}>
          {FAMILY_DESCRIPTIONS[domain as ClinicalDomain][selectedFamily]}
        </Text>

        <View style={styles.gaugeWrapper}>
          <View style={styles.gauge}>
            <Svg width={GAUGE_SIZE} height={GAUGE_SIZE}>
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={gaugeRadius}
                stroke={colors.border.default}
                strokeWidth={GAUGE_STROKE}
                fill="none"
              />
              <Circle
                cx={GAUGE_SIZE / 2}
                cy={GAUGE_SIZE / 2}
                r={gaugeRadius}
                stroke={accentColor}
                strokeWidth={GAUGE_STROKE}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                transform={`rotate(-90 ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
              />
            </Svg>
            <View style={styles.gaugeContent}>
              <Text variant="label" color="tertiary">
                CURRENT SCORE
              </Text>
              <Text
                variant="display"
                color={score === null ? "tertiary" : "primary"}
              >
                {score === null ? "--" : Math.round(score)}
              </Text>
            </View>
          </View>
        </View>

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

        <View style={[styles.insight, { borderTopColor: withAlpha(accentColor, 0.2) }]}>
          <Icon name={icons.energy} size={16} color={accentColor} style={styles.insightIcon} />
          <Text variant="bodySm" color="secondary" style={styles.insightText}>
            {isUnavailable ? "Reflection pending..." : config.recommendations[trend]}
          </Text>
        </View>
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
    padding: spacing["2xl"],
    alignItems: "center",
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: c.surface.control,
    borderRadius: radius.chip,
    padding: spacing.xs,
    alignSelf: "center",
    marginBottom: space.sectionGap,
  },
  switcherPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.chip,
    minWidth: 92,
  },
  familyDesc: {
    paddingHorizontal: spacing.md,
    marginBottom: space.sectionGap,
  },
  gaugeWrapper: {
    marginBottom: space.groupGap,
  },
  gauge: {
    width: GAUGE_SIZE,
    height: GAUGE_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  gaugeContent: {
    position: "absolute",
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
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
