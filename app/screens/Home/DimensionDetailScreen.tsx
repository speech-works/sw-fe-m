import React, { useEffect, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Directions,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
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
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";
import {
  Page,
  Text,
  Icon,
  IconName,
  icons,
  TrendLine,
  TabDock,
  Sheet,
  Surface,
  IconButton,
  haptics,
  useTheme,
  makeStyles,
  spacing,
  space,
  radius,
  borderWidth,
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

/** Plain-language definitions grounded in the `/overall-state` contract:
 *  clinical comes from assessment domains, engagement from recent practice and
 *  check-ins, and combined brings those two time-scales together. */
const FAMILY_EXPLANATIONS: Record<
  DetailFamily,
  { title: string; description: string }
> = {
  combined: {
    title: "A balanced view",
    description:
      "Brings your assessment baseline together with recent practice and check-in signals.",
  },
  clinical: {
    title: "Your steadier baseline",
    description:
      "Built from validated assessment responses, so it changes more gradually.",
  },
  engagement: {
    title: "Your recent signal",
    description:
      "Drawn from practice and check-ins, so it responds sooner to what’s changing.",
  },
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
      "Balances your assessment baseline with recent confidence, anxiety, and stress check-ins.",
    clinical:
      "Focuses on assessment responses about confidence and speech impact.",
    engagement:
      "Uses recent confidence, anxiety, and stress check-ins.",
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    combined:
      "Balances your avoidance baseline with recent approach and avoidance signals.",
    clinical:
      "Focuses on assessment responses about avoidance.",
    engagement:
      "Uses recent avoidance-urge check-ins and approach activity.",
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    combined:
      "Balances your speech-management baseline with recent tool and reflection signals.",
    clinical:
      "Focuses on assessment responses about speech struggle and control.",
    engagement:
      "Uses recent reflection and secondary-behavior patterns; it cannot see every tool you use.",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    combined:
      "Balances your everyday-speaking baseline with recent comfort and tension signals.",
    clinical:
      "Focuses on assessment responses about everyday speaking effort and impact.",
    engagement:
      "Uses recent tension, body-awareness, and comfort check-ins.",
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    combined:
      "Balances your participation baseline with recent exposure and speaking activity.",
    clinical:
      "Focuses on assessment responses about participation and social impact.",
    engagement:
      "Uses recent exposure practice; it is not a measure of your whole social life.",
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
      "Start with one meaningful speaking moment; your trend will build from here.",
    recommendations: {
      IMPROVING:
        "Keep choosing meaningful speaking moments that feel manageable.",
      STABLE:
        "Choose one small speaking win to strengthen trust in your voice.",
      WORSENING:
        "Return to a simpler speaking situation and rebuild from there.",
    },
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    accentKey: "danger",
    icon: icons.courage,
    description:
      "How willing you are to enter speaking moments instead of avoiding them.",
    firstLook:
      "Start with one small approach; repeat it to build your trend.",
    recommendations: {
      IMPROVING:
        "Keep your next speaking step small, specific, and repeatable.",
      STABLE:
        "Choose one speaking moment just beyond your comfort zone.",
      WORSENING:
        "Shrink the challenge and try one smaller, supported speaking rep.",
    },
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery",
    accentKey: "info",
    icon: icons.mastery,
    description:
      "How reliably you’re using helpful tools and strategies to manage speech.",
    firstLook:
      "Use one helpful tool in a real speaking moment to start your trend.",
    recommendations: {
      IMPROVING:
        "Keep using the tools that help in real situations, not only drills.",
      STABLE:
        "Sharpen one dependable strategy before adding another.",
      WORSENING:
        "Return to one dependable strategy in a lower-pressure setting.",
    },
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease",
    accentKey: "purple",
    icon: icons.ease,
    description:
      "How manageable and less effortful speaking feels in everyday moments.",
    firstLook:
      "Start with regular, low-pressure practice and let comfort build.",
    recommendations: {
      IMPROVING:
        "Keep practice regular and low-pressure so comfort carries over.",
      STABLE:
        "Use gentle repetition to help speaking feel easier over time.",
      WORSENING:
        "Lower the pressure and pair speaking with a calming routine.",
    },
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    accentKey: "warning",
    icon: icons.social,
    description:
      "How much you’re taking part in conversations and speaking situations that matter to you.",
    firstLook:
      "Take part in one conversation that matters to start your trend.",
    recommendations: {
      IMPROVING:
        "Keep choosing speaking moments that matter, not simply more moments.",
      STABLE:
        "Make one small initiation or response to widen participation.",
      WORSENING:
        "Start with safer conversations, then build outward.",
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
  const { historyBuckets, overallState } = useUserBehaviorTrendsStore();
  const { domain, familyData: rawFamilyData } = route.params;

  const [selectedFamily, setSelectedFamily] = useState<DetailFamily>("combined");
  const [aboutSheetVisible, setAboutSheetVisible] = useState(false);
  const uncertainty = overallState?.clinical?.domains?.[domain as ClinicalDomain]?.uncertainty ?? 0;
  const isSettling = uncertainty > 25;

  // Explain the unfamiliar score model once, then leave the same information
  // available on demand from the score header's info control. The sheet itself
  // owns the occasional entrance motion and reduced-motion behavior.
  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(ASYNC_KEYS_NAME.SW_GROWTH_PROFILE_DETAIL_INTRO_SEEN)
      .then((seen) => {
        if (!active || seen === "true") return;
        setAboutSheetVisible(true);
        return AsyncStorage.setItem(
          ASYNC_KEYS_NAME.SW_GROWTH_PROFILE_DETAIL_INTRO_SEEN,
          "true",
        );
      })
      .catch(() => {
        // Storage availability should never block the explanation in-session.
        if (active) setAboutSheetVisible(true);
      });

    return () => {
      active = false;
    };
  }, []);

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
  const accentInk = colors.accentText[config.accentKey];
  const metrics = familyData[selectedFamily];
  const score = metrics.currentScore;
  const isUnavailable = score === null;
  const hasComparison = metrics.previousScore !== null;
  const trend = metrics.trend;
  const trendColor =
    trend === "IMPROVING"
      ? colors.feedback.successText
      : trend === "WORSENING"
        ? colors.feedback.dangerText
        : colors.text.tertiary;
  const isEngagementEmpty = selectedFamily === "engagement" && isUnavailable;
  const isEarlyEstimate =
    isSettling &&
    (selectedFamily === "combined" || selectedFamily === "clinical");
  const trendValues = buildTrendWeeks(
    historyBuckets,
    overallState,
    (aggregate) =>
      aggregate.profile.axes[selectedFamily]?.[profileKey] ?? null,
  );
  const hasTrendData = trendValues.some((week) => week.value != null);
  const lensExplanation = FAMILY_EXPLANATIONS[selectedFamily];

  const insightText = isEngagementEmpty
    ? "Complete one practice or check-in to start building this signal."
    : isUnavailable
      ? selectedFamily === "clinical"
        ? "Complete more of your profile assessment to reveal this view."
        : "Your view will appear as assessment and practice data build."
      : !hasComparison
        ? config.firstLook
        : config.recommendations[trend];

  const selectFamily = (family: DetailFamily) => {
    if (family === selectedFamily) return;
    haptics.selection();
    setSelectedFamily(family);
  };

  const moveFamily = (step: -1 | 1) => {
    const currentIndex = FAMILY_ORDER.indexOf(selectedFamily);
    const nextIndex = Math.max(
      0,
      Math.min(FAMILY_ORDER.length - 1, currentIndex + step),
    );
    const nextFamily = FAMILY_ORDER[nextIndex];
    if (nextFamily) selectFamily(nextFamily);
  };

  // A horizontal fling changes the lens while the screen structure stays put.
  // Frequent tab changes do not trigger decorative page transitions; the dock's
  // own spring is enough feedback and remains interruptible.
  const lensSwipe = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .numberOfPointers(1)
      .runOnJS(true)
      .onEnd(() => moveFamily(1)),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .numberOfPointers(1)
      .runOnJS(true)
      .onEnd(() => moveFamily(-1)),
  );

  return (
    <View style={styles.root}>
      <Page
        title={config.label}
        description={config.description}
        onBack={() => navigation.goBack()}
        right={
          <IconButton
            name={icons.info}
            onPress={() => setAboutSheetVisible(true)}
          />
        }
        tabBarSafe
      >
        <View style={styles.detailCanvas}>
          {/* Home's Growth Profile uses a quiet oversized glyph behind the data.
              The same move gives this screen identity without another card. */}
          <View pointerEvents="none" style={styles.watermark}>
            <Icon
              name={config.icon}
              size={240}
              color={accentInk}
              style={styles.watermarkIcon}
            />
          </View>

          <GestureDetector gesture={lensSwipe}>
            <View style={styles.detailContent}>
              <View style={styles.scoreSection}>
                <View style={styles.scoreMetaRow}>
                  <Text variant="label" color="tertiary">
                    THIS WEEK
                  </Text>
                  {isEarlyEstimate ? (
                    <View style={styles.estimateStatus}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: accentInk },
                        ]}
                      />
                      <Text variant="caption" color={accentInk}>
                        Early estimate
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.numberRow}>
                  <Text
                    variant="screenTitle"
                    color={isUnavailable ? "tertiary" : "primary"}
                  >
                    {isUnavailable ? "—" : Math.round(score)}
                  </Text>

                  {!isUnavailable && hasComparison ? (
                    <View style={styles.trendDelta}>
                      {trend !== "STABLE" ? (
                        <Icon
                          name={trend === "IMPROVING" ? icons.trend : icons.trendDown}
                          size={15}
                          color={trendColor}
                        />
                      ) : null}
                      <Text variant="title" color={trendColor}>
                        {Math.abs(metrics.percentDelta ?? 0).toFixed(1)}%
                      </Text>
                    </View>
                  ) : !isUnavailable ? (
                    <Text variant="bodySm" color="tertiary">
                      New baseline
                    </Text>
                  ) : (
                    <Text variant="bodySm" color="tertiary">
                      No signal yet
                    </Text>
                  )}
                </View>

                {!isUnavailable && hasComparison ? (
                  <Text variant="caption" color="tertiary">
                    was {Math.round(metrics.previousScore ?? 0)} last week
                  </Text>
                ) : null}
              </View>

              <View style={styles.trendSection}>
                <Text variant="caption" color="tertiary">
                  LAST 4 WEEKS
                </Text>
                {hasTrendData ? (
                  <TrendLine
                    data={trendValues.map((week) => week.value)}
                    labels={trendValues.map((week) => week.label)}
                    color={colors.text.link}
                    height={120}
                    animate={false}
                  />
                ) : (
                  <View style={styles.trendEmpty}>
                    <Icon
                      name={icons.growthSeed}
                      size={24}
                      color={colors.text.tertiary}
                    />
                    <Text variant="bodySm" color="secondary">
                      Practice and check-ins will shape this trend.
                    </Text>
                  </View>
                )}
              </View>

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
                    NEXT STEP
                  </Text>
                  <Text variant="bodySm" color="secondary">
                    {insightText}
                  </Text>
                </View>
              </Surface>
            </View>
          </GestureDetector>
        </View>
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
        onSelect={(key) => selectFamily(key as DetailFamily)}
        accessibilityLabel="Growth profile lenses"
      />

      <Sheet
        visible={aboutSheetVisible}
        onClose={() => setAboutSheetVisible(false)}
        title={`${FAMILY_LABELS[selectedFamily]} lens`}
        right={
          <IconButton
            name={icons.close}
            onPress={() => setAboutSheetVisible(false)}
          />
        }
        exclusive
      >
        <View style={styles.sheetContent}>
          <View style={styles.sheetHero}>
            <View
              style={[
                styles.sheetIcon,
                { backgroundColor: colors.accentTint[config.accentKey] },
              ]}
            >
              <Icon
                name={FAMILY_ICONS[selectedFamily]}
                size={22}
                color={accentInk}
              />
            </View>
            <View style={styles.sheetHeroCopy}>
              <Text variant="h3">{lensExplanation.title}</Text>
              <Text variant="bodySm" color="secondary" style={styles.sheetHeroDescription}>
                {lensExplanation.description}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.sheetDivider,
              { backgroundColor: colors.border.hairline },
            ]}
          />

          <View style={styles.sheetDimension}>
            <Text variant="label" color={accentInk}>
              FOR {config.label.toUpperCase()}
            </Text>
            <Text variant="body" color="secondary">
              {FAMILY_DESCRIPTIONS[domain as ClinicalDomain][selectedFamily]}
            </Text>
          </View>

          {isEarlyEstimate ? (
            <View
              style={[
                styles.sheetEstimate,
                { borderTopColor: colors.border.hairline },
              ]}
            >
              <Icon name={icons.duration} size={18} color={accentInk} />
              <View style={styles.sheetEstimateCopy}>
                <Text variant="label" color="primary">EARLY ESTIMATE</Text>
                <Text variant="bodySm" color="secondary" style={styles.sheetEstimateText}>
                  {selectedFamily === "clinical"
                    ? "It becomes steadier as your assessment history grows."
                    : "It becomes steadier as assessment and check-in history grow."}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </Sheet>
    </View>
  );
};

export default DimensionDetailScreen;

const useStyles = makeStyles(() => ({
  root: {
    flex: 1,
  },
  detailCanvas: {
    position: "relative",
  },
  watermark: {
    position: "absolute",
    top: -20,
    right: -88,
    zIndex: 0,
    transform: [{ rotate: "-15deg" }, { scaleX: -1 }],
  },
  watermarkIcon: {
    opacity: 0.07,
  },
  detailContent: {
    gap: space.sectionGap,
    zIndex: 1,
  },
  scoreSection: {
    gap: spacing.sm,
  },
  scoreMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.rowGap,
  },
  estimateStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  trendDelta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
  },
  trendSection: {
    gap: spacing.sm,
  },
  trendEmpty: {
    minHeight: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
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
  sheetContent: {
    gap: space.groupGap,
  },
  sheetHero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.iconText,
  },
  sheetIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeroCopy: {
    flex: 1,
  },
  sheetHeroDescription: {
    marginTop: spacing.xs,
  },
  sheetDivider: {
    width: "100%",
    height: borderWidth.hairline,
  },
  sheetDimension: {
    gap: spacing.sm,
  },
  sheetEstimate: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.iconText,
    borderTopWidth: borderWidth.hairline,
    paddingTop: space.groupGap,
  },
  sheetEstimateCopy: {
    flex: 1,
  },
  sheetEstimateText: {
    marginTop: spacing.xs,
  },
}));
