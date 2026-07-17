import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import { BreathingHalo } from "./components/BreathingHalo";

import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePractice,
  CognitivePracticeType,
} from "../../../../../../api/dailyPractice/types";
import {
  DEFAULT_BREATHING_TECHNIQUE_ID,
  FALLBACK_BREATH_PHASES,
} from "../../../../../../constants/breathing";
import {
  completePracticeActivity,
  abortPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import VitalsFeedbackModal from "../../../../../../components/VitalsFeedbackModal";
import { useBackgroundAudio } from "../../../../../../hooks/useBackgroundAudio";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import {
  shouldCollectAccuracy,
  shouldCollectVitals,
  validateVitals,
} from "../../../../../../utils/vitals";
import DonePractice from "../../../components/DonePractice";
import {
  Page,
  Button,
  IconButton,
  Icon,
  icons,
  Surface,
  Text,
  useTheme,
  spacing,
  space,
  borderWidth,
  Sheet,
} from "../../../../../../design-system";
import PressableScale from "../../../../../../components/PressableScale";
import BreathingCard from "./components/BreathingCard";
import { patternLabel } from "../../../../../../constants/breathing";

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import { ExploreStackNavigationProp } from "../../../../../../navigators/stacks/ExploreStack/types";

const Breathing = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Breathing">>();
  const route = useRoute<CDPStackRouteProp<"BreathingPractice">>();
  const { colors } = useTheme();
  // Guided Breathing = the "danger" (rose) accent from the Cognitive Practice
  // list; the flow inherits it (Start, tips, save + done screens).
  const accentColor = colors.accent.danger;
  const onAccentColor = colors.accentOn.danger;

  const passedActivity = route.params?.practiceActivity;
  const packContext = route.params?.packContext;
  const from = route.params?.from;

  // single “mute” state that mutes both breath sounds + background.
  // The setter was missing, so this was pinned false and no UI could reach it.
  const [mute, setMute] = useState(false);
  /** The technique library sheet (mirrors Meditation's scenario picker). */
  const [showLibrary, setShowLibrary] = useState(false);
  // State to track elapsed seconds for the session
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null,
  );
  /** Every GUIDED_BREATHING record. The screen used to fetch these and throw all
   *  but one away, then pace 4-4-4 regardless of which one it had "chosen". */
  const [techniques, setTechniques] = useState<CognitivePractice[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [showEarlyExitPrompt, setShowEarlyExitPrompt] = useState(false);
  const [isAborted, setIsAborted] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<any>(null);

  const totalSessionDurationInSeconds = 5 * 60; // 5 minutes converted to seconds

  /**
   * The technique being paced. In pack/passed-activity mode the record comes
   * hydrated on the activity; standalone it's the one picked from `techniques`.
   */
  const selectedTechnique: CognitivePractice | null =
    techniques.find((t) => t.id === cognitivePracticeId) ??
    passedActivity?.cognitivePractice ??
    null;

  /**
   * What the pacer runs. This is the fix for the bug that mattered: the screen
   * saved a technique's `contentId` and then hardcoded 4-4-4, so a session
   * logged as "5-4-7 Diaphragmatic" actually paced box breathing. The rhythm
   * now comes from the same record the activity is filed under.
   */
  const breathPhases =
    selectedTechnique?.guidedBreathingData?.phases?.length
      ? selectedTechnique.guidedBreathingData.phases
      : FALLBACK_BREATH_PHASES;

  // background hook (load, toggle, stop)
  const { loadBackground, toggleBackground, stopBackground } =
    useBackgroundAudio();

  const { updateActivity } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();

  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );

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

  const markActivityDone = async () => {
    // Get userId from session or user store
    const userId = practiceSession?.user?.id || user?.id;

    if (!userId || !cognitivePracticeId || !currentActivityId) {
      // Changed apiContentId to cognitivePracticeId to match original logic
      console.warn(
        "Cannot complete activity: Missing userId, contentId, or currentActivityId",
      );
      return;
    }

    try {
      console.log(
        "[Breathing Debug] markActivityDone: Completing activity",
        currentActivityId,
      );
      const completedActivity = await completePracticeActivity({
        id: currentActivityId, // The ID of the started activity instance
        userId: userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
      });
      useUserStore.getState().fetchUser();

      console.log(
        "[Breathing Debug] markActivityDone: API success, updating store",
        completedActivity,
      );
      updateActivity(currentActivityId, {
        ...completedActivity,
      });
      setCurrentActivity(completedActivity);
      // We can optionally dispatch an event or update unrelated state here
    } catch (err) {
      console.error("Failed to complete activity:", err);
    }
  };

  const handleVitalsSubmit = async (vitals: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    const validation = validateVitals(vitals);
    if (!validation.valid) {
      showErrorBottomSheet("Invalid Input", validation.error);
      return;
    }

    try {
      setShowVitalsModal(false);
      const userId = practiceSession?.user?.id || user?.id;
      if (!currentActivityId || !userId) return;

      // Stop audio before navigating
      await stopBackground();

      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId,
        vitals,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
      });
      updateActivity(currentActivityId, completedActivity);
      useUserStore.getState().fetchUser();
      if (packContext && navigation.canGoBack()) {
        navigation.goBack();
      } else if (packContext) {
        navigation.navigate("PackModule", {
          packId: packContext.packId,
          moduleId: packContext.moduleId,
          initialBlockIndex: packContext.blockIndex,
        });
      } else {
        setIsDone(true);
      }
    } catch (error) {
      console.error("Failed to complete activity:", error);
      showErrorBottomSheet(
        "Save Failed",
        "We couldn't save your progress. Please try again.",
      );
    }
  };

  const handleVitalsSkip = async () => {
    try {
      setShowVitalsModal(false);
      const userId = practiceSession?.user?.id || user?.id;
      if (!currentActivityId || !userId) return;

      // Stop audio before navigating
      await stopBackground();

      console.log(
        "[Breathing Debug] handleVitalsSkip: Completing activity",
        currentActivityId,
      );
      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
      });

      console.log(
        "[Breathing Debug] handleVitalsSkip: API success, updating store",
        completedActivity,
      );
      updateActivity(currentActivityId, completedActivity);
      useUserStore.getState().fetchUser();

      if (packContext && navigation.canGoBack()) {
        navigation.goBack();
      } else if (packContext) {
        navigation.navigate("PackModule", {
          packId: packContext.packId,
          moduleId: packContext.moduleId,
          initialBlockIndex: packContext.blockIndex,
        });
      } else {
        setIsDone(true);
      }
    } catch (error) {
      console.error("Failed to complete activity:", error);
      showErrorBottomSheet(
        "Save Failed",
        "We couldn't save your progress. Please try again.",
      );
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Check if vitals should be collected
      if (currentActivity && shouldCollectVitals(currentActivity.contentType)) {
        setShowAccuracy(shouldCollectAccuracy(currentActivity));
        setShowVitalsModal(true);
      } else {
        console.log("[Breathing Debug] Marking activity done via manual completion");
        await markActivityDone();

        // Stop audio before navigating
        await stopBackground();

        if (packContext && navigation.canGoBack()) {
          navigation.goBack();
        } else if (packContext) {
          navigation.navigate("PackModule", {
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            initialBlockIndex: packContext.blockIndex,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompletePress = () => {
    if (elapsedSeconds < 300) {
      setShowEarlyExitPrompt(true);
    } else {
      handleComplete();
    }
  };

  const confirmEarlyExit = () => {
    setShowEarlyExitPrompt(false);
    // Allow the Sheet to fully animate out (300ms) before
    // attempting to mount the VitalsFeedbackModal, avoiding iOS collision freezes.
    setTimeout(() => {
      handleAbort();
    }, 400);
  };

  const handleAbort = async () => {
    setIsLoading(true);
    try {
      const userId = practiceSession?.user?.id || user?.id;
      if (currentActivityId && userId) {
        console.log("[Breathing Debug] handleAbort: Aborting activity", currentActivityId);
        const abortedActivity = await abortPracticeActivity({
          id: currentActivityId,
          userId: userId,
          packId: packContext?.packId,
          moduleId: packContext?.moduleId,
        });
        updateActivity(currentActivityId, abortedActivity);
        setCurrentActivity(abortedActivity);
        useUserStore.getState().fetchUser();
      }

      // Stop audio before navigating
      await stopBackground();

      if (packContext && navigation.canGoBack()) {
        navigation.goBack();
      } else if (packContext) {
        navigation.navigate("PackModule", {
          packId: packContext.packId,
          moduleId: packContext.moduleId,
          initialBlockIndex: packContext.blockIndex,
        });
      } else {
        setIsAborted(true);
        setIsDone(true);
      }
    } catch (e) {
      console.error("Failed to abort activity", e);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── On mount: load the music, then immediately play it (because mute === false) ────
  useEffect(() => {
    let isCurrent = true;
    const prepare = async () => {
      await loadBackground();
      if (isCurrent) {
        // Prepare audio but do not start yet
      }
    };
    prepare();

    return () => {
      isCurrent = false;
    };
  }, [loadBackground, toggleBackground, isDone]); // Add isDone to dependency array

  // ─── Whenever mute flips or activity starts, update audio ──────────────────────────
  useEffect(() => {
    // Only toggle background if active and not done
    if (currentActivityId && !isDone) {
      toggleBackground(!mute);
    } else if (isDone) {
      // If done, ensure background is stopped
      stopBackground();
    }
  }, [mute, currentActivityId, isDone, toggleBackground, stopBackground]);

  // ─── Timer for session progress ────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    // Start the timer when the component mounts and if not done
    if (currentActivityId && !isDone) {
      interval = setInterval(() => {
        setElapsedSeconds((prevSeconds) => {
          // Stop the timer if the session is complete
          return prevSeconds + 1; // Increment by 1 second
        });
      }, 1000); // Update every 1000 milliseconds (1 second)
    }

    // Clear the interval when the component unmounts or when isDone becomes true
    return () => clearInterval(interval);
  }, [isDone, currentActivityId]); // Add currentActivityId to dependency array

  // ─── When unmounting or blurring, fully stop & unload the background track ───────────────────
  useEffect(() => {
    return () => {
      stopBackground();
    };
  }, [stopBackground]);

  // Ensure audio stops when leaving screen
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        stopBackground();
      };
    }, [stopBackground]),
  );

  // Track the actual ID to be used for API creation separately from UI ID
  const [apiContentId, setApiContentId] = useState<string | null>(null);

  console.log("Breathing Screen Render - Params:", {
    hasPassedActivity: !!passedActivity,
    passedActivityId: passedActivity?.id,
    packContext,
    apiContentId,
  });

  useEffect(() => {
    console.log("Breathing Screen - useEffect triggered");
    const fetchCP = async () => {
      // Always fetch default to get a VALID backend ID
      const cp = await getCognitivePracticeByType(
        CognitivePracticeType.GUIDED_BREATHING,
      );
      setTechniques(cp);
      // Open on Steady deliberately — it's the calm-but-alert one, the only
      // technique that's safe right before speaking. This used to be `cp[0]`,
      // and the endpoint has no guaranteed order, so "first" was arbitrary:
      // the same user could land on a different exercise run to run.
      const defaultId =
        cp.find((t) => t.id === DEFAULT_BREATHING_TECHNIQUE_ID)?.id ??
        cp[0]?.id ??
        null;
      console.log("Breathing Screen - Fetched default ID:", defaultId);

      const recommendedId = (route.params as any)?.id;
      if (recommendedId) {
        console.log("Breathing Screen - Using recommended ID:", recommendedId);
        setCognitivePracticeId(recommendedId);
        setApiContentId(recommendedId);
        return;
      }

      if (passedActivity) {
        console.log(
          "Breathing Screen - Using passed activity mode (wait for start)",
        );
        setCognitivePracticeId(passedActivity.id);

        if (packContext?.alreadyStarted) {
          console.log("Breathing Screen - Autostarting since already started by pack");
          setCurrentActivityId(passedActivity.id);
        }
        return;
      }

      // Standalone mode
      setCognitivePracticeId(defaultId);
      setApiContentId(defaultId);
    };
    fetchCP();
  }, [passedActivity]);

  // Calculate elapsed minutes and remaining seconds for display
  const displayMinutes = Math.floor(elapsedSeconds / 60);
  const displaySeconds = elapsedSeconds % 60;

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
    contentId: apiContentId || cognitivePracticeId || undefined,
    initialActivity: passedActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    // Mirror the page-local currentActivity state on start.
    onActivityStarted: (activity) => setCurrentActivity(activity),
    navigation,
    logTag: "Breathing",
    // Breathing historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
    // Caller catches the thrown error; preserve throw.
    rethrowErrors: true,
  });

  // ── IMMERSIVE MODE (dark canvas + preserved breathing halo) ─────────────────
  if (currentActivityId && !isDone) {
    const sessionComplete = elapsedSeconds >= totalSessionDurationInSeconds;
    return (
      <View
        style={[styles.immersiveContainer, { backgroundColor: colors.background.canvas }]}
      >
        <View style={styles.immersiveContent}>
          {/* Timer Display */}
          <Text
            variant="h2"
            color={sessionComplete ? colors.feedback.successText : "secondary"}
            style={styles.timerText}
          >
            {`${displayMinutes.toString().padStart(2, "0")}:${displaySeconds
              .toString()
              .padStart(2, "0")}`}
          </Text>

          {/* Centered Halo (preserved animation) */}
          <BreathingHalo phases={breathPhases} repeat mute={mute} />
        </View>

        {/* Bottom Controls — mute mirrors Meditation's toggle; it silences the
            breath cues and the background bed together. */}
        <View style={styles.immersiveControls}>
          <IconButton
            name={mute ? icons.mute : icons.volume}
            variant="ghost"
            onPress={() => setMute((m) => !m)}
            color={colors.text.secondary}
            accessibilityLabel={mute ? "Unmute breathing sounds" : "Mute breathing sounds"}
          />
          <Button
            label="End Session"
            variant="secondary"
            onPress={handleCompletePress}
            disabled={isLoading}
          />
        </View>

        {/* Vitals Feedback Modal */}
        <VitalsFeedbackModal
          visible={showVitalsModal}
          onSubmit={handleVitalsSubmit}
          onSkip={handleVitalsSkip}
          showAccuracy={showAccuracy}
          accentColor={accentColor}
          onAccentColor={onAccentColor}
        />

        {/* Early Exit Prompt Bottom Sheet */}
        <Sheet
          visible={showEarlyExitPrompt}
          onClose={() => setShowEarlyExitPrompt(false)}
        >
          <View style={styles.skipModal}>
            <Text variant="h2" center>
              Finish early?
            </Text>
            <Text variant="body" color="secondary" center>
              We recommend at least 5 minutes of practice for the best results. Are you sure you want to end your session early?
            </Text>
            <View style={styles.skipModalActions}>
              <Button
                label="End Session"
                variant="primary"
                onPress={confirmEarlyExit}
                accentColor={accentColor}
                onAccentColor={onAccentColor}
              />
              <Button
                label="Continue Practice"
                variant="secondary"
                onPress={() => setShowEarlyExitPrompt(false)}
              />
            </View>
          </View>
        </Sheet>

        {exitSheet}
      </View>
    );
  }

  if (isDone) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.COGNITIVE_PRACTICE}
        practiceName="breathing exercise"
        accentColor={accentColor}
        onAccentColor={onAccentColor}
        onDone={undefined}
        isAborted={isAborted}
        from={from}
      />
    );
  }

  // ── INTRO MODE (technique + tips) ───────────────────────────────────────────
  // Every technique ships its own tips (how to do THAT pattern); these generic
  // three are the fallback for a record that has none. They used to be the only
  // tips shown, so the record's own guidance never reached anyone.
  const genericTips = [
    "Take deep breaths before starting. Feel your diaphragm expand.",
    "Maintain a relaxed facial posture. Release jaw tension.",
    "It's okay to take your time. Focus on smooth transitions.",
  ];
  const tips = selectedTechnique?.guidedBreathingData?.tips?.length
    ? selectedTechnique.guidedBreathingData.tips
    : genericTips;
  const caution = selectedTechnique?.guidedBreathingData?.caution;

  return (
    <>
      <Page
        title="Breathing"
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        footer={
          <Button
            label="Start Exercise"
            onPress={async () => {
              try {
                await markActivityStart();
              } catch (error) {
                console.error("Error starting breathing practice:", error);
                // Global stamina modal will be handled by the API layer event
              }
            }}
            accentColor={accentColor}
            onAccentColor={onAccentColor}
          />
        }
      >
        {/* The chosen technique, and the way into the library. */}
        {selectedTechnique ? (
          <BreathingCard
            technique={selectedTechnique}
            onPress={() => setShowLibrary(true)}
          />
        ) : null}

        {/* When NOT to use this one. It's a structured field precisely so it
            can't get quietly dropped — an honest limit is the point. */}
        {caution ? (
          <View style={styles.cautionRow}>
            <Icon name={icons.info} size={16} color={colors.text.tertiary} />
            <Text variant="bodySm" color="tertiary" style={styles.cautionText}>
              {caution}
            </Text>
          </View>
        ) : null}

        {/* Tips — a dot timeline on the dark canvas. */}
        <View>
          <Text variant="h3" color="primary" style={styles.tipsHeading}>
            Tips
          </Text>
          {tips.map((tip, index, arr) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipTrack}>
                <View
                  style={[styles.tipDot, { backgroundColor: accentColor }]}
                />
                {index !== arr.length - 1 && (
                  <View
                    style={[styles.tipLine, { backgroundColor: colors.border.default }]}
                  />
                )}
              </View>
              <Text variant="body" color="secondary" style={styles.tipText}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </Page>

      {/* Technique library — mirrors Meditation's scenario sheet. Selecting
          repoints `apiContentId`, so the activity is filed under the technique
          the user actually breathed. */}
      <Sheet visible={showLibrary} onClose={() => setShowLibrary(false)}>
        <View style={styles.libraryHeader}>
          <Text variant="h2" color="primary">
            Breathing Library
          </Text>
          <Text variant="body" color="secondary" style={styles.librarySubtitle}>
            Different breaths for different moments. Each one settles your body —
            none of them are about your speech.
          </Text>
        </View>

        <View style={styles.libraryList}>
          {techniques.map((t) => {
            const isSelected = t.id === cognitivePracticeId;
            const phases = t.guidedBreathingData?.phases;
            return (
              <PressableScale
                key={t.id}
                onPress={() => {
                  setCognitivePracticeId(t.id);
                  setApiContentId(t.id);
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
                        {t.name}
                      </Text>
                      {phases?.length ? (
                        <Text variant="caption" color="tertiary">
                          {patternLabel(phases)}
                        </Text>
                      ) : null}
                    </View>
                    <Text variant="bodySm" color="secondary">
                      {t.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <Icon name={icons.success} size={20} color={colors.feedback.dangerText} />
                  )}
                </Surface>
              </PressableScale>
            );
          })}
        </View>
      </Sheet>

      {/* Vitals Feedback Modal */}
      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSubmit={handleVitalsSubmit}
        onSkip={handleVitalsSkip}
        showAccuracy={showAccuracy}
        accentColor={accentColor}
        onAccentColor={onAccentColor}
      />

      {exitSheet}
    </>
  );
};

export default Breathing;

const styles = StyleSheet.create({
  // Immersive
  immersiveContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  immersiveContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  immersiveControls: {
    paddingBottom: spacing["5xl"],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.groupGap,
  },
  // Intro: the honest limit, sitting under the technique card.
  cautionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.iconText,
    marginTop: space.groupGap,
  },
  cautionText: {
    flex: 1,
  },
  // Technique library sheet
  libraryHeader: {
    gap: space.titleSub,
    marginBottom: space.sectionGap,
  },
  librarySubtitle: {
    marginTop: space.titleSub,
  },
  libraryList: {
    gap: space.groupGap,
  },
  libraryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    padding: spacing["2xl"],
  },
  libraryCardText: {
    flex: 1,
    gap: space.titleSub,
  },
  libraryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  timerText: {
    fontVariant: ["tabular-nums"],
    marginTop: spacing["6xl"],
    marginBottom: spacing["5xl"],
  },
  // Early-exit sheet
  skipModal: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  skipModalContainer: {
    padding: spacing["3xl"],
    alignItems: "center",
    paddingBottom: spacing["5xl"],
  },
  skipModalTitle: {
    marginBottom: space.groupGap,
  },
  skipModalDesc: {
    marginBottom: spacing["3xl"],
    lineHeight: 24,
  },
  skipModalActions: {
    width: "100%",
    gap: space.rowGap,
  },
  // Intro tips (dark)
  tipsHeading: {
    marginBottom: space.groupGap,
  },
  tipRow: {
    flexDirection: "row",
  },
  tipTrack: {
    alignItems: "center",
    width: 20,
    marginRight: space.groupGap,
  },
  tipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
  },
  tipLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -4,
  },
  tipText: {
    flex: 1,
    paddingBottom: spacing["3xl"],
    lineHeight: 24,
  },
});
