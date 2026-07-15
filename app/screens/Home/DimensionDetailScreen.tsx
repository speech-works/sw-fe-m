import React, { useRef, useEffect, useState } from "react";
import { Dimensions, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import {
  ClinicalDomain,
  GrowthProfileMetrics,
} from "../../api/userBehaviorTrends/types";
import { useUserBehaviorTrendsStore } from "../../stores/userBehaviorTrends";
import {
  buildTrendWeeks,
  buildFamilyMetric,
  FamilyMetricData,
} from "../../stores/userBehaviorTrends/selectors";
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
  TabDock,
  Surface,
  haptics,
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
    /** First-look copy — shown before there's a prior week to compare against,
     *  so it must NOT imply a trend (no "steady week" continuity language). */
    firstLook: string;
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
    firstLook:
      "This is your starting point. Keep choosing speaking moments that feel meaningful — your trend will build from here.",
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
    firstLook:
      "This is your starting point. Small, repeatable approaches will shape your trend over the next few weeks.",
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
    firstLook:
      "This is your starting point. Practicing your tools in real moments will shape your trend from here.",
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
    firstLook:
      "This is your starting point. Regular, low-pressure practice will let comfort build and your trend take shape.",
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
    firstLook:
      "This is your starting point. Taking part in conversations that matter to you will shape your trend from here.",
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

const DimensionDetailScreen = () => {
  const route = useRoute<HomeStackRouteProp<"DimensionDetail">>();
  const navigation = useNavigation<HomeStackNavigationProp<"DimensionDetail">>();
  const { colors } = useTheme();
  const styles = useStyles();
  const motion = useMotion();
  const { historyBuckets, overallState } = useUserBehaviorTrendsStore();
  const { domain, familyData: rawFamilyData } = route.params;

  const [selectedFamily, setSelectedFamily] = useState<DetailFamily>("combined");
  const scrollViewRef = useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(Dimensions.get("window").width);
  const uncertainty = overallState?.clinical?.domains?.[domain as ClinicalDomain]?.uncertainty ?? 0;
  const isSettling = uncertainty > 25;

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

  // Re-derive from the LIVE store (not the frozen route-param snapshot) so the
  // "This week" number stays pinned to the trend line's "Now" point — both now
  // read the same `overallState`. The route param is only a fallback for the
  // rare case the store is empty on entry.
  const familyData: Record<DetailFamily, FamilyMetricData> = overallState
    ? {
        combined: buildFamilyMetric(overallState, "combined", profileKey),
        clinical: buildFamilyMetric(overallState, "clinical", profileKey),
        engagement: buildFamilyMetric(overallState, "engagement", profileKey),
      }
    : (rawFamilyData as Record<DetailFamily, FamilyMetricData>);

  if (!domain) return null;

  const config = DIMENSION_CONFIG[domain as ClinicalDomain];
  // The trend STROKE and insight ICON are thin/small meaning-bearing marks on
  // the canvas/card — the bright accent base fails AA on the light "paper"
  // ground, so use the per-scheme colored-text cut of the dimension's accent
  // (keeps the family's hue, AA in both schemes).
  const accentInk = colors.accentText[config.accentKey];

  return (
    <View style={styles.root}>
      <Page
        title={config.label}
        description={config.description}
        onBack={() => navigation.goBack()}
        tabBarSafe
      >
        {/* Horizontal pager — the bottom dock controls the same selected lens,
            and swiping remains available as a direct gesture. */}
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

            // Insight line, in priority order:
            //  - engagement with no signal → practice nudge
            //  - clinical/combined unavailable → point at the right input
            //    (NOT "reflection pending" — a null clinical score is about the
            //    assessment, not a reflection)
            //  - available but no prior week → first-look copy (no trend implied)
            //  - available with a comparison → trend-based recommendation
            const insightText = fEngagementEmpty
              ? "No engagement signal yet — practice this week to build it."
              : fUnavailable
                ? family === "clinical"
                  ? "Answer more of your profile assessment to see this."
                  : "This unlocks as your profile and practice data build."
                : !fHasComparison
                  ? config.firstLook
                  : config.recommendations[fTrend];

            return (
              <View key={family} style={[styles.page, { width: contentWidth }]}>
                {/* Lens overview: the selected data source and its full supporting
                    explanation stay together as one readable editorial block. */}
                <Animated.View entering={motion.stagger(0)}>
                <Surface
                  level="default"
                  rounded="card"
                  bordered
                  style={styles.overviewCard}
                >
                  <View style={styles.overviewMain}>
                    <View
                      style={[
                        styles.overviewIcon,
                        { backgroundColor: colors.accentTint[config.accentKey] },
                      ]}
                    >
                      <Icon
                        name={FAMILY_ICONS[family]}
                        size={20}
                        color={accentInk}
                      />
                    </View>
                    <View style={styles.overviewCopy}>
                      <Text variant="label" color={accentInk}>
                        {FAMILY_LABELS[family].toUpperCase()} LENS
                      </Text>
                      <Text variant="bodySm" color="secondary" style={styles.overviewDescription}>
                        {FAMILY_DESCRIPTIONS[domain as ClinicalDomain][family]}
                      </Text>
                    </View>
                  </View>

                  {isSettling && (family === "combined" || family === "clinical") && (
                    <View
                      style={[
                        styles.settlingRow,
                        { borderTopColor: colors.border.hairline },
                      ]}
                    >
                      <Icon name={icons.duration} size={16} color={colors.text.tertiary} />
                      <Text variant="bodySm" color="tertiary" style={styles.settlingText}>
                        Still getting to know you. This is an early estimate and will firm up as you check in.
                      </Text>
                    </View>
                  )}
                </Surface>
              </Animated.View>

              {/* The weekly score is the page's visual anchor. Comparison and
                  trajectory remain attached to it as one coherent data story. */}
              <Animated.View entering={motion.stagger(1)}>
                <Surface
                  level="default"
                  rounded="card"
                  bordered
                  elevate="e1"
                  style={styles.scoreCard}
                >
                  <View
                    pointerEvents="none"
                    style={[
                      styles.accentOrb,
                      { backgroundColor: colors.accentTint[config.accentKey] },
                    ]}
                  />

                  <View style={styles.scoreCardHeader}>
                    <View
                      style={[
                        styles.dimensionIcon,
                        { backgroundColor: colors.accentTint[config.accentKey] },
                      ]}
                    >
                      <Icon name={config.icon} size={20} color={accentInk} />
                    </View>
                    <View style={styles.scoreCardHeading}>
                      <Text variant="label" color={accentInk}>
                        THIS WEEK
                      </Text>
                      <Text variant="caption" color="tertiary">
                        {FAMILY_LABELS[family]} score
                      </Text>
                    </View>
                  </View>

                  <View style={styles.scoreSummary}>
                    <View>
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
                            style={[
                              styles.trendPill,
                              { backgroundColor: colors.surface.control },
                            ]}
                          >
                            <Icon name={icons.duration} size={15} color={colors.text.tertiary} />
                            <Text variant="bodySm" color="tertiary">New baseline</Text>
                          </View>
                        )}
                      </View>

                      {!fUnavailable && fHasComparison && (
                        <Text variant="caption" color="tertiary" style={styles.comparisonText}>
                          vs last week · was {Math.round(metrics.previousScore ?? 0)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.chartPanel,
                      { backgroundColor: colors.surface.control },
                    ]}
                  >
                    <View style={styles.chartPanelHeader}>
                      <Text variant="caption" color="tertiary">
                        4-WEEK VIEW
                      </Text>
                      <Icon name={icons.trend} size={15} color={accentInk} />
                    </View>
                    {fHasTrendData ? (
                      <TrendLine
                        data={fTrendValues.map((w) => w.value)}
                        labels={fTrendValues.map((w) => w.label)}
                        color={accentInk}
                        height={104}
                      />
                    ) : (
                      <Text variant="bodySm" color="tertiary" style={styles.trendEmpty}>
                        Not enough signal yet — a few weeks of practice will draw your trend.
                      </Text>
                    )}
                  </View>
                </Surface>
              </Animated.View>

              {/* The takeaway is a distinct destination after the data, with a
                  semantic accent tile that works in both color schemes. */}
              <Animated.View entering={motion.stagger(2)}>
                <Surface level="control" rounded="card" style={styles.insightCard}>
                  <View
                    style={[
                      styles.insightIcon,
                      { backgroundColor: colors.accentTint[config.accentKey] },
                    ]}
                  >
                    <Icon name={icons.energy} size={18} color={accentInk} />
                  </View>
                  <View style={styles.insightCopy}>
                    <Text variant="label" color="primary">
                      YOUR NEXT STEP
                    </Text>
                    <Text variant="bodySm" color="secondary" style={styles.insightText}>
                      {insightText}
                    </Text>
                  </View>
                </Surface>
              </Animated.View>
              </View>
            );
          })}
        </ScrollView>
      </Page>

      {/* Preserve the original floating bottom position. Page.tabBarSafe keeps
          the last content reachable without moving or redesigning the dock. */}
      <TabDock
        fitContent
        items={FAMILY_ORDER.map((family) => ({
          key: family,
          label: FAMILY_LABELS[family],
          icon: FAMILY_ICONS[family],
        }))}
        activeKey={selectedFamily}
        onSelect={(key) => {
          if (key !== selectedFamily) haptics.selection();
          setSelectedFamily(key as DetailFamily);
        }}
        accessibilityLabel="Growth profile lenses"
      />
    </View>
  );
};

export default DimensionDetailScreen;

const useStyles = makeStyles(() => ({
  // Horizontal pager that holds all three family pages side-by-side.
  pager: {
    // Bleed the pager to the screen edges so pages feel full-width,
    // compensating for the Page's horizontal padding.
    marginHorizontal: -space.screenX,
  },
  // Each individual family page inside the pager.
  page: {
    paddingHorizontal: space.screenX,
    gap: space.groupGap,
  },
  root: {
    flex: 1,
  },
  overviewCard: {
    overflow: "hidden",
  },
  overviewMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: space.cardPad,
    gap: space.iconText,
  },
  overviewIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  overviewCopy: {
    flex: 1,
  },
  overviewDescription: {
    marginTop: spacing.xs,
  },
  settlingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.rowGap,
    borderTopWidth: 1,
    paddingHorizontal: space.cardPad,
    paddingVertical: spacing.md,
  },
  settlingText: {
    flex: 1,
  },
  scoreCard: {
    padding: space.cardPad,
    overflow: "hidden",
    gap: spacing.sm,
  },
  accentOrb: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: radius.full,
    top: -92,
    right: -56,
  },
  scoreCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
  },
  dimensionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreCardHeading: {
    gap: spacing.xxs,
  },
  scoreSummary: {
    paddingTop: spacing.xs,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  comparisonText: {
    marginTop: spacing.xs,
  },
  trendEmpty: {
    minHeight: 104,
    paddingHorizontal: spacing.sm,
    textAlignVertical: "center",
  },
  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  chartPanel: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  chartPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: space.cardPad,
    gap: space.iconText,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  insightCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  insightText: {
    flex: 1,
  },
}));
