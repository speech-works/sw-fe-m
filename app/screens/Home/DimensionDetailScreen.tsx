import React, { useRef, useEffect, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";
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
  const scrollViewRef = useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(Dimensions.get("window").width);

  // Sync tab-tap → scroll position.
  useEffect(() => {
    const index = FAMILY_ORDER.indexOf(selectedFamily);
    if (scrollViewRef.current && contentWidth > 0) {
      scrollViewRef.current.scrollTo({ x: index * contentWidth, animated: true });
    }
  }, [selectedFamily, contentWidth]);

  const profileKey = domain
    ? PROFILE_KEYS[domain as ClinicalDomain]
    : "confidence";

  if (!domain) return null;

  const config = DIMENSION_CONFIG[domain as ClinicalDomain];
  const accentColor = colors.accent[config.accentKey];
  const onAccentColor = colors.accentOn[config.accentKey];
  // The trend STROKE and insight ICON are thin/small meaning-bearing marks on
  // the canvas/card — the bright accent base fails AA on the light "paper"
  // ground, so use the per-scheme colored-text cut of the dimension's accent
  // (keeps the family's hue, AA in both schemes).
  const accentInk = colors.accentText[config.accentKey];

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

      {/* Horizontal pager — one page per family. Swipe to change tab; tap also works. */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={styles.pager}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0) setContentWidth(w);
        }}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / contentWidth);
          const family = FAMILY_ORDER[index];
          if (family && family !== selectedFamily) setSelectedFamily(family);
        }}
      >
        {FAMILY_ORDER.map((family) => {
          const metrics = familyData[family];
          const fScore = metrics.currentScore;
          const fUnavailable = fScore === null;
          const fHasComparison = metrics.previousScore !== null;
          const fTrend = metrics.trend;
          const fTrendColor =
            fTrend === "IMPROVING"
              ? colors.feedback.successText
              : fTrend === "WORSENING"
                ? colors.feedback.dangerText
                : colors.text.tertiary;
          const fEngagementEmpty = family === "engagement" && fUnavailable;
          const fTrendValues = buildTrendWeeks(
            historyBuckets,
            overallState,
            (agg) => agg.profile.axes[family]?.[profileKey] ?? null,
          );
          const fHasTrendData = fTrendValues.some((w) => w.value != null);

          return (
            <View key={family} style={[styles.page, { width: contentWidth }]}>
              <Animated.View entering={motion.stagger(1)}>
                <Text variant="bodySm" color="secondary" style={styles.familyDesc}>
                  {FAMILY_DESCRIPTIONS[domain as ClinicalDomain][family]}
                </Text>
              </Animated.View>

              {/* Score + trend read top-left, the 4-week trajectory flows below them. */}
              <Animated.View entering={motion.stagger(2)} style={styles.chartHero}>
                <View style={styles.chartHeader}>
                  <Text variant="label" color="tertiary">
                    This week
                  </Text>

                  {/* Number + trend pill on one line — tight, baseline-grouped. */}
                  <View style={styles.numberRow}>
                    {fUnavailable ? (
                      <Text variant="screenTitle" color="tertiary">—</Text>
                    ) : (
                      <AnimatedNumber
                        key={family}
                        value={Math.round(fScore)}
                        variant="screenTitle"
                        color="primary"
                      />
                    )}

                    {!fUnavailable && fHasComparison && (
                      <View
                        style={[
                          styles.trendPill,
                          { backgroundColor: withAlpha(fTrendColor, 0.14) },
                        ]}
                      >
                        <Icon
                          name={
                            fTrend === "IMPROVING"
                              ? icons.trend
                              : fTrend === "WORSENING"
                                ? icons.trendDown
                                : "minus"
                          }
                          size={15}
                          color={fTrendColor}
                        />
                        <Text variant="title" color={fTrendColor}>
                          {Math.abs(metrics.percentDelta ?? 0).toFixed(1)}%
                        </Text>
                      </View>
                    )}

                    {!fUnavailable && !fHasComparison && (
                      <View
                        style={[styles.trendPill, { backgroundColor: colors.surface.control }]}
                      >
                        <Icon name={icons.duration} size={15} color={colors.text.tertiary} />
                        <Text variant="bodySm" color="tertiary">New baseline</Text>
                      </View>
                    )}
                  </View>

                  {!fUnavailable && fHasComparison && (
                    <Text variant="caption" color="tertiary">
                      vs last week · was {Math.round(metrics.previousScore ?? 0)}
                    </Text>
                  )}
                </View>

                {fHasTrendData ? (
                  <TrendLine
                    data={fTrendValues.map((w) => w.value)}
                    labels={fTrendValues.map((w) => w.label)}
                    color={accentInk}
                    height={92}
                  />
                ) : (
                  <Text variant="bodySm" color="tertiary" style={styles.trendEmpty}>
                    Not enough signal yet — a few weeks of practice will draw your trend.
                  </Text>
                )}
              </Animated.View>

              {/* Insight message — closes the page. */}
              <Animated.View
                entering={motion.stagger(3)}
                style={[styles.insight, { borderTopColor: colors.border.hairline }]}
              >
                <Icon
                  name={icons.energy}
                  size={16}
                  color={accentInk}
                  style={styles.insightIcon}
                />
                <Text variant="bodySm" color="secondary" style={styles.insightText}>
                  {fEngagementEmpty
                    ? "No engagement signal yet — practice this week to build it."
                    : fUnavailable
                      ? "Reflection pending..."
                      : config.recommendations[fTrend]}
                </Text>
              </Animated.View>
            </View>
          );
        })}
      </ScrollView>
    </Page>
  );
};

export default DimensionDetailScreen;

const useStyles = makeStyles((c) => ({
  // Horizontal pager that holds all three family pages side-by-side.
  pager: {
    // Bleed the pager to the screen edges so pages feel full-width,
    // compensating for the Page's horizontal padding.
    marginHorizontal: -space.screenX,
  },
  // Each individual family page inside the pager.
  page: {
    paddingHorizontal: space.screenX,
  },
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
    marginBottom: space.groupGap,
  },
  // A tidy left-aligned stack: label → number+pill row → caption; chart below.
  chartHeader: {
    alignItems: "flex-start",
    gap: spacing.xxs,
    marginBottom: spacing.sm,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
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
