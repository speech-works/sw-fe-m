import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePracticeType,
  ReframingThoughtScenarioData,
} from "../../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { useSessionStore } from "../../../../../../stores/session";
import PressableScale from "../../../../../../components/PressableScale";
import TextArea from "../../../../../../components/TextArea";
import * as WebBrowser from "expo-web-browser";
import { toSafeExternalUrl } from "../../../../../../util/functions/url";
import {
  SchemeStatusBar,
  Button,
  Surface,
  Text,
  Icon,
  icons,
  Page,
  PageHeader,
  Gradient,
  FloatingControls,
  Sheet,
  useTheme,
  spacing,
  space,
  radius,
  borderWidth,
} from "../../../../../../design-system";
import {
  DEFAULT_REFRAME_SERIES_ID,
} from "../../../../../../constants/reframe";
import {
  CDPStackNavigationProp,
  CDPStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import {
  ExploreStackNavigationProp,
  ExploreStackParamList,
} from "../../../../../../navigators/stacks/ExploreStack/types";
import { useActivityStore } from "../../../../../../stores/activity";
import { useUserStore } from "../../../../../../stores/user";
import DonePractice from "../../../components/DonePractice";
import VitalsFeedbackModal from "../../../../../../components/VitalsFeedbackModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import { EVENT_NAMES } from "../../../../../../stores/events/constants";
import { dispatchCustomEvent } from "../../../../../../util/functions/events";
import SyncLoader from "../../../../../../components/SyncLoader";
import ReframeWeather from "./components/ReframeWeather";
import ReframeCard from "./components/ReframeCard";

/**
 * Opens a cited source in the in-app browser.
 *
 * We show real citations rather than asking users to take our word for it —
 * the app makes clinical claims, so it owes a way to check them. In-app
 * rather than Safari is deliberate: kicking out mid-exercise loses the
 * practice, which is the actual UX cost of citing sources. `toSafeExternalUrl`
 * restricts to http/https even though every URL is authored by us, because
 * this content arrives from the backend and should never be able to launch
 * an arbitrary scheme.
 */
const openSource = async (url?: string) => {
  const safe = toSafeExternalUrl(url);
  if (!safe) return;
  try {
    await WebBrowser.openBrowserAsync(safe);
  } catch (e) {
    console.error("Failed to open source", e);
  }
};

const Reframe = () => {
  const route = useRoute<CDPStackRouteProp<"ReframePractice">>();
  const { packContext, practiceActivity, from } = route.params || {};

  const navigation =
    useNavigation<CDPStackNavigationProp<keyof CDPStackParamList>>();
  const exploreNavigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  // Reframe Thoughts = the "info" (blue) accent from the Cognitive Practice list;
  // the flow inherits it (Start, selection, save + done screens).
  const accentColor = colors.accent.info;
  const onAccentColor = colors.accentOn.info;
  const [selectedReframe, setSelectedReframe] = React.useState<string | null>(
    null,
  );
  const { updateActivity } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();

  const [writtenReframe, setWrittenReframe] = React.useState<string>("");
  /**
   * "Two schools of thought" disclosure inside the evidence card. Collapsed on
   * every new selection so the card always opens at its short form.
   */
  const [showContrast, setShowContrast] = React.useState(false);
  const [scenarios, setScenarios] = useState<ReframingThoughtScenarioData[]>(
    [],
  );
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  /** Every series the user may open. Non-owners never receive the paid one. */
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null,
  );
  const [isDone, setIsDone] = useState(false);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    practiceActivity?.id || null,
  );
  const [showVitalsModal, setShowVitalsModal] = useState(false);

  const onBackPress = () => {
    if (from === "MOOD_CHECK") {
      navigation.navigate("Root" as any, { screen: "HOME" });
    } else {
      navigation.goBack();
    }
  };

  const toggleIndex = () => {
    if (scenarios && scenarios.length > 0) {
      setSelectedScenarioIndex(
        (prevIndex) => (prevIndex + 1) % scenarios.length,
      );
      setSelectedReframe(null);
      setWrittenReframe("");
      setShowContrast(false);
    }
  };

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
    contentId: cognitivePracticeId ?? undefined,
    initialActivity: practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    navigation,
    logTag: "Reframe",
    // Reframe historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
    // Caller branches on the thrown error (stamina upsell); preserve throw.
    rethrowErrors: true,
    onSessionError: () =>
      showErrorBottomSheet(
        "Session Error",
        "We couldn't initialize your practice session. Please try again.",
      ),
  });

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  // Save opens the existing vitals modal (the normal completion path). isCompleted
  // includes showVitalsModal so an open vitals modal doesn't trigger a 2nd prompt.
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: isDone || showVitalsModal,
    onSave: () => setShowVitalsModal(true),
    accentColor,
    family: "Cognitive",
    from,
    packContext,
  });

  const markActivityDone = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    console.log("markActivityDone [Reframe] called", {
      cognitivePracticeId,
      currentActivityId,
      userId: user?.id || practiceSession?.user?.id,
      vitals,
    });

    if (!cognitivePracticeId || !currentActivityId) {
      console.warn("Missing IDs for Reframe completion");
      return;
    }

    // Determine userId: try user store first (common), then session user
    const userId = user?.id || practiceSession?.user?.id;
    if (!userId) {
      console.warn(">> Reframe: Missing userId, cannot complete activity");
      return;
    }

    // If NOT in pack context, we must have a session
    const isPackContext = !!packContext?.packId;
    if (!isPackContext && !practiceSession) {
      console.warn("Missing session for non-pack Reframe completion");
      return;
    }

    try {
      console.log("Completing Reframe activity...", {
        currentActivityId,
        userId,
      });
      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId: userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
        vitals,
      });

      console.log("Reframe Activity COMPLETED:", completedActivity);

      updateActivity(currentActivityId, {
        ...completedActivity,
      });
      useUserStore.getState().fetchUser();

      if (packContext) {
        // Use the parent Explore stack navigation to return to PackModule
        if (exploreNavigation.canGoBack()) {
          exploreNavigation.goBack();
        } else {
          exploreNavigation.navigate("PackModule", {
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            initialBlockIndex: packContext.blockIndex,
          });
        }
      } else {
        setIsDone(true);
      }
    } catch (err) {
      console.error("Failed to complete activity", err);
      showErrorBottomSheet(
        "Save Failed",
        "We couldn't save your progress. Please try again.",
      );
      throw err;
    }
  };

  const handleVitalsSubmit = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    setShowVitalsModal(false);
    try {
      await markActivityDone(vitals);
    } catch (e) {
      console.error("Failed to submit vitals and complete activity", e);
    }
  };

  // Fetch all reframe scenarios once on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      const rs = await getCognitivePracticeByType(
        CognitivePracticeType.REFRAMING_THOUGHTS,
      );

      setAllSeries(rs);

      // Reframing is now several themed series rather than one 61-scenario
      // row, so "which one" is a real question. Order of preference:
      //   1. an explicit recommendation passed in (mood follow-up, pack block)
      //   2. the pinned default
      //   3. whatever came back first — only reachable if the default series
      //      is missing from this user's catalogue
      //
      // rs[0] used to be the whole logic. Harmless with one row; with nine it
      // silently opens whichever the endpoint sorts first, which is the
      // SHORTEST series for a non-owner.
      const recommendedId = (route.params as any)?.id;
      const targetScenario =
        (recommendedId && rs.find((s) => s.id === recommendedId)) ||
        rs.find((s) => s.id === DEFAULT_REFRAME_SERIES_ID) ||
        rs[0];

      setScenarios(targetScenario?.reframingThoughtsData?.scenarios || []);
      setCognitivePracticeId(targetScenario?.id || null);
    };
    fetchScenarios();
  }, []);

  if (isDone) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.COGNITIVE_PRACTICE}
        practiceName="reframe practice"
        accentColor={accentColor}
        onAccentColor={onAccentColor}
        onDone={undefined}
        from={from}
      />
    );
  }

  const currentScenario = scenarios[selectedScenarioIndex];
  const started = !!currentActivityId;
  const selectedSeries = allSeries.find((x) => x.id === cognitivePracticeId);

  const handleStart = async () => {
    if (!cognitivePracticeId) {
      console.warn("Missing cognitivePracticeId in Reframe start");
      return;
    }
    try {
      await markActivityStart();
    } catch (error: any) {
      console.error("Error starting reframe practice:", error);
      // Branch on errorCode ONLY. A bare `status === 402` used to
      // live here and it could never be right: the backend maps
      // InsufficientStaminaError to 400, and 402 exclusively to
      // the PURCHASE errors (PACK_NOT_OWNED / NO_CREDITS). So the
      // 402 arm only ever fired on the wrong errors — a user with
      // full energy, blocked by an unowned pack, was told they'd
      // run out of energy.
      const errorCode = error?.response?.data?.errorCode;
      if (errorCode === "INSUFFICIENT_STAMINA") {
        dispatchCustomEvent(EVENT_NAMES.SHOW_STAMINA_UPSELL);
      } else if (errorCode === "PACK_NOT_OWNED") {
        showErrorBottomSheet(
          "Part of a program",
          "This exercise belongs to a program you haven't joined yet. Open it from the program to get started.",
        );
      } else {
        showErrorBottomSheet(
          "Failed to start",
          "An error occurred while starting the session.",
        );
      }
    }
  };
  // The evidence card belongs to the CHOSEN reframe — selection is the
  // teaching moment ("why does the one I picked work?"), so nothing shows
  // until a pick is made. Written-own reframes carry no evidence by design.
  const selectedOption = selectedReframe
    ? currentScenario?.reframedThoughts.find((o) => o.text === selectedReframe)
    : undefined;
  const evidence = selectedOption?.evidence;

  // Series library — mirrors the Breathing technique sheet. Selecting repoints
  // cognitivePracticeId, so the activity is filed under the series the user
  // actually worked on. Non-owners never receive the paid series here; the
  // backend filters it out of the listing entirely. Shared by the start screen
  // and the exercise, so switching series is the same interaction wherever you are.
  const librarySheet = (
        <Sheet visible={showLibrary} onClose={() => setShowLibrary(false)}>
          <View style={styles.libraryHeader}>
            <Text variant="h2" color="primary">
              Reframe Series
            </Text>
            <Text variant="body" color="secondary" style={styles.librarySubtitle}>
              Different thoughts get in the way at different times. Pick the one
              that sounds like this week.
            </Text>
          </View>

          <View style={styles.libraryList}>
            {allSeries.map((serie) => {
              const isSelected = serie.id === cognitivePracticeId;
              const count = serie.reframingThoughtsData?.scenarios?.length ?? 0;
              return (
                <PressableScale
                  key={serie.id}
                  onPress={() => {
                    setCognitivePracticeId(serie.id);
                    setScenarios(serie.reframingThoughtsData?.scenarios || []);
                    // Reset position AND any in-progress answer: the old index
                    // points into a different series' scenario list.
                    setSelectedScenarioIndex(0);
                    setSelectedReframe(null);
                    setWrittenReframe("");
                    setShowContrast(false);
                    setShowLibrary(false);
                  }}
                >
                  <Surface
                    level={isSelected ? "elevated" : "control"}
                    rounded="card"
                    bordered={!isSelected}
                    style={[
                      styles.libraryCard,
                      isSelected && {
                        borderWidth: borderWidth.hairline,
                        borderColor: accentColor,
                      },
                    ]}
                  >
                    <View style={styles.libraryCardText}>
                      <View style={styles.libraryCardHeader}>
                        <Text variant="h3" color="primary">
                          {serie.name}
                        </Text>
                        {count ? (
                          <Text variant="caption" color="tertiary">
                            {count} thoughts
                          </Text>
                        ) : null}
                      </View>
                      <Text variant="bodySm" color="secondary">
                        {serie.description}
                      </Text>
                    </View>
                    {isSelected && (
                      <Icon name={icons.success} size={20} color={accentColor} />
                    )}
                  </Surface>
                </PressableScale>
              );
            })}
          </View>
        </Sheet>
  );

  // Start screen — same shape as Breathing / Meditation: large title, the subject
  // as a real card, CTA pinned at the bottom. No weather here: `Page`'s background
  // slot draws ABOVE the body (it's the Focus-lamp dimmer), so the scene would sit
  // on top of the text. The rain greets you the moment the exercise starts instead.
  if (!started) {
    return (
      <>
        <Page
          title="Reframe Thoughts"
          description="Learn to identify negative thoughts and replace them with empowering ones."
          onBack={onBackPress}
          footer={
            <Button
              label="Start Exercise"
              onPress={handleStart}
              accentColor={accentColor}
              onAccentColor={onAccentColor}
            />
          }
        >
          <ReframeCard
            name={selectedSeries?.name}
            description={selectedSeries?.description}
            count={selectedSeries?.reframingThoughtsData?.scenarios?.length}
            accentTextColor={colors.feedback.infoText}
            onPress={
              allSeries.length > 1 ? () => setShowLibrary(true) : undefined
            }
          />
        </Page>
        {librarySheet}
        {exitSheet}
      </>
    );
  }

  return (
    <View style={styles.root}>
      <SyncLoader />
      <SchemeStatusBar translucent backgroundColor="transparent" />

      {/* Ambient weather — moody rain that clears into warm light as a reframe is
          chosen. Sits behind the scrollable content. */}
      <ReframeWeather sunshine={!!(selectedReframe || writtenReframe.length > 0)} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + space.inlineGap,
            // Clears the floating-control slot (bottom 110 + 46 button + gap).
            paddingBottom: 180,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Reframe Thoughts" onBack={onBackPress} />

        <View style={styles.body}>
          {/* Eyebrow — Reframe's blue identity. Shuffle lives in the floating FAB. */}
          <Text variant="label" color={colors.feedback.infoText} style={styles.eyebrow}>
            REFRAME
          </Text>

          {/* Negative thought */}
          <View style={styles.negativeSection}>
            <View style={styles.negativeLabelRow}>
              <Icon name="cloud-rain" size={14} color={colors.text.tertiary} />
              <Text variant="label" color="tertiary">
                NEGATIVE THOUGHT
              </Text>
            </View>
            <Text variant="h2" color="primary" center style={styles.negativeText}>
              "{currentScenario?.negativeThought || "Loading..."}"
            </Text>
          </View>

          {/* Choose a better perspective */}
          <View style={styles.positiveSection}>
            <Text variant="label" color={colors.feedback.infoText} center style={styles.chooseLabel}>
              CHOOSE A BETTER PERSPECTIVE
            </Text>

            <View style={styles.optionsList}>
              {currentScenario?.reframedThoughts.map((item, index) => {
                const isSelected = selectedReframe === item.text;
                return (
                  <PressableScale
                    key={index}
                    onPress={() => {
                      setSelectedReframe(item.text);
                      setShowContrast(false);
                    }}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? colors.accentTint.info
                          : colors.surface.elevated,
                        borderColor: isSelected ? accentColor : colors.border.hairline,
                      },
                    ]}
                  >
                    <Text
                      variant="body"
                      color={isSelected ? colors.feedback.infoText : "secondary"}
                      center
                      style={styles.optionText}
                    >
                      {item.text}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>

            {/* Evidence card — the "why this works" layer behind the chosen
                reframe. Inline, NOT a modal: this flow already mounts the
                vitals modal and the series sheet, and stacking native Modals
                freezes touch app-wide on iOS. Server resolves mechanismKey →
                evidence; unmapped reframes simply show nothing. */}
            {evidence && (
              <View
                style={[
                  styles.evidenceCard,
                  {
                    backgroundColor: colors.surface.elevated,
                    borderColor: colors.border.hairline,
                  },
                ]}
              >
                <View style={styles.evidenceLabelRow}>
                  <Icon name="lightbulb" size={14} color={colors.feedback.infoText} />
                  <Text variant="label" color={colors.feedback.infoText}>
                    WHY THIS WORKS
                  </Text>
                </View>
                <Text variant="body" color="primary" style={styles.evidencePrinciple}>
                  {evidence.principle}
                </Text>
                <Text variant="bodySm" color="secondary" style={styles.evidenceMechanism}>
                  {evidence.mechanism}
                </Text>
                {/* Source is tappable when we have a link. Opening in the
                    in-app browser (not Safari) keeps the practice one tap
                    away — leaving the app mid-exercise is the real UX cost,
                    not the citation itself. Users must be able to check us. */}
                {evidence.sourceUrl ? (
                  <PressableScale
                    onPress={() => openSource(evidence.sourceUrl)}
                    style={styles.sourceRow}
                    accessibilityRole="link"
                    accessibilityLabel={`Open source: ${evidence.source}`}
                  >
                    <Text
                      variant="bodySm"
                      color={colors.feedback.infoText}
                      style={styles.evidenceSource}
                    >
                      {evidence.source}
                    </Text>
                    <Icon
                      name="external-link"
                      size={12}
                      color={colors.feedback.infoText}
                    />
                  </PressableScale>
                ) : (
                  <Text variant="bodySm" color="tertiary" style={styles.evidenceSource}>
                    {evidence.source}
                  </Text>
                )}

                {/* Two schools of thought — collapsed by default so the card
                    stays scannable; the comparison is the deep-dive. */}
                {evidence.contrast && (
                  <>
                    <PressableScale
                      onPress={() => setShowContrast((v) => !v)}
                      style={[
                        styles.contrastToggle,
                        { borderTopColor: colors.border.hairline },
                      ]}
                    >
                      <Icon
                        name="graduation-cap"
                        size={14}
                        color={colors.text.secondary}
                      />
                      <Text
                        variant="bodySm"
                        color="secondary"
                        style={styles.contrastToggleLabel}
                      >
                        {evidence.contrast.title}
                      </Text>
                      <Icon
                        name={showContrast ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={colors.text.tertiary}
                      />
                    </PressableScale>
                    {showContrast && (
                      <View style={styles.contrastBody}>
                        <Text variant="label" color="tertiary">
                          {evidence.contrast.viewA.label.toUpperCase()}
                        </Text>
                        <Text variant="bodySm" color="secondary" style={styles.contrastText}>
                          {evidence.contrast.viewA.text}
                        </Text>
                        <Text variant="label" color="tertiary" style={styles.contrastSideGap}>
                          {evidence.contrast.viewB.label.toUpperCase()}
                        </Text>
                        <Text variant="bodySm" color="secondary" style={styles.contrastText}>
                          {evidence.contrast.viewB.text}
                        </Text>
                        <Text variant="bodySm" color="primary" style={styles.contrastTakeaway}>
                          {evidence.contrast.takeaway}
                        </Text>
                        {evidence.contrast.sourceUrl ? (
                          <PressableScale
                            onPress={() => openSource(evidence.contrast!.sourceUrl)}
                            style={styles.sourceRow}
                            accessibilityRole="link"
                            accessibilityLabel={`Open source: ${evidence.contrast.source}`}
                          >
                            <Text
                              variant="bodySm"
                              color={colors.feedback.infoText}
                              style={styles.evidenceSource}
                            >
                              {evidence.contrast.source}
                            </Text>
                            <Icon
                              name="external-link"
                              size={12}
                              color={colors.feedback.infoText}
                            />
                          </PressableScale>
                        ) : (
                          <Text variant="bodySm" color="tertiary" style={styles.evidenceSource}>
                            {evidence.contrast.source}
                          </Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Write your own */}
            <View style={styles.writeOwnContainer}>
              <Text variant="bodySm" color="tertiary" center>
                Or write your own:
              </Text>
              <TextArea
                value={writtenReframe}
                onChangeText={setWrittenReframe}
                placeholder="I can handle this by..."
                numberOfLines={3}
                inputStyle={[styles.textAreaInput, { color: colors.text.primary }]}
                containerStyle={{
                  ...styles.textAreaWrapper,
                  backgroundColor: colors.surface.elevated,
                  borderColor: colors.border.hairline,
                }}
              />
            </View>

            {(selectedReframe || writtenReframe.length > 0) && (
              <Button
                label="Submit Reframe"
                onPress={() => setShowVitalsModal(true)}
                accentColor={accentColor}
                onAccentColor={onAccentColor}
                style={styles.submitButton}
              />
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating shuffle control — the canonical lower-right slot (same as the
          Community "+" and Library search). Cycles to a fresh thought to reframe. */}
      <FloatingControls
        items={[
          {
            icon: "refresh-cw",
            onPress: toggleIndex,
            accessibilityLabel: "Shuffle to a new thought",
            accentColor,
            onAccentColor,
          },
        ]}
      />

      {/* Soft dark cap so scrolled content fades out behind the status bar. */}
      {insets.top > 0 ? (
        <Gradient
          colors={["#10151F", "rgba(16,21,31,0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.statusCap, { height: insets.top + spacing.sm }]}
          pointerEvents="none"
        />
      ) : null}

      {librarySheet}

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
        accentColor={accentColor}
        onAccentColor={onAccentColor}
      />

      {exitSheet}
    </View>
  );
};

export default Reframe;

const styles = StyleSheet.create({
  // --- series library sheet ---
  libraryHeader: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  librarySubtitle: {
    marginTop: spacing.xs,
  },
  libraryList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  libraryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.lg,
  },
  libraryCardText: {
    flexShrink: 1,
    gap: spacing.xs,
  },
  libraryCardHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  root: { flex: 1 },

  scroll: {
    paddingHorizontal: space.screenX,
  },
  body: {
    marginTop: space.titleGap,
    gap: space.sectionGap,
  },
  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },

  // Header eyebrow
  eyebrow: {
    letterSpacing: 1.5,
  },

  // Negative thought
  negativeSection: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  negativeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    marginBottom: space.groupGap,
  },
  negativeText: {
    lineHeight: 38,
  },

  // Perspectives
  positiveSection: {
    width: "100%",
    gap: space.groupGap,
  },
  chooseLabel: {
    letterSpacing: 1.5,
  },
  optionsList: {
    gap: space.groupGap,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.sectionGap,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  optionText: {
    flex: 1,
    lineHeight: 26,
  },
  // Evidence card — sits between the options and "write your own".
  evidenceCard: {
    marginTop: space.sectionGap,
    padding: space.sectionGap,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  evidenceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    marginBottom: space.rowGap,
  },
  evidencePrinciple: {
    fontWeight: "600",
    marginBottom: space.rowGap,
  },
  evidenceMechanism: {
    lineHeight: 20,
    marginBottom: space.rowGap,
  },
  evidenceSource: {
    fontStyle: "italic",
    flexShrink: 1,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
  },
  contrastToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.inlineGap,
    borderTopWidth: 1,
    marginTop: space.rowGap,
    paddingTop: space.rowGap,
  },
  contrastToggleLabel: {
    flex: 1,
  },
  contrastBody: {
    marginTop: space.rowGap,
  },
  contrastText: {
    lineHeight: 20,
    marginTop: 2,
  },
  contrastSideGap: {
    marginTop: space.rowGap,
  },
  contrastTakeaway: {
    lineHeight: 20,
    marginTop: space.rowGap,
    marginBottom: space.rowGap,
    fontWeight: "500",
  },
  writeOwnContainer: {
    marginTop: spacing.xl,
    gap: space.rowGap,
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderRadius: radius.input,
    padding: space.inlineGap,
  },
  textAreaInput: {
    fontSize: 16,
    minHeight: 100,
    textAlign: "center",
  },
  submitButton: {
    marginTop: space.sectionGap,
  },
});
