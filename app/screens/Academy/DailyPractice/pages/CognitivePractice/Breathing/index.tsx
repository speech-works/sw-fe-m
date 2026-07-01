import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import { BreathingHalo } from "./components/BreathingHalo";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";

import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import { CognitivePracticeType } from "../../../../../../api/dailyPractice/types";
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
  Surface,
  Button,
  Text,
  useTheme,
  spacing,
  space,
} from "../../../../../../design-system";

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import { ExploreStackNavigationProp } from "../../../../../../navigators/stacks/ExploreStack/types";

const Breathing = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Breathing">>();
  const route = useRoute<CDPStackRouteProp<"BreathingPractice">>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const passedActivity = route.params?.practiceActivity;
  const packContext = route.params?.packContext;
  const from = route.params?.from;

  // single “mute” state that mutes both breath sounds + background
  const [mute] = useState(false);
  // State to track elapsed seconds for the session
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null,
  );
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [showEarlyExitPrompt, setShowEarlyExitPrompt] = useState(false);
  const [isAborted, setIsAborted] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<any>(null);

  const totalSessionDurationInSeconds = 5 * 60; // 5 minutes converted to seconds

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
    // Allow the BottomSheetModal to fully animate out (300ms) before
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
      const defaultId = cp[0]?.id || null;
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
          <BreathingHalo inhale={4} hold={4} exhale={4} repeat mute={mute} />
        </View>

        {/* Bottom Controls */}
        <View style={styles.immersiveControls}>
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
        />

        {/* Early Exit Prompt Bottom Sheet */}
        <BottomSheetModal
          visible={showEarlyExitPrompt}
          onClose={() => setShowEarlyExitPrompt(false)}
          showCloseButton={true}
          fitContent={true}
        >
          <Surface
            level="raised"
            rounded="sheet"
            style={[
              styles.skipModalContainer,
              { paddingBottom: Math.max(insets.bottom, spacing["2xl"]) },
            ]}
          >
            <Text variant="h2" color="primary" center style={styles.skipModalTitle}>
              Finish early?
            </Text>
            <Text variant="body" color="secondary" center style={styles.skipModalDesc}>
              We recommend at least 5 minutes of practice for the best results. Are you sure you want to end your session early?
            </Text>
            <View style={styles.skipModalActions}>
              <Button
                label="End Session"
                variant="primary"
                onPress={confirmEarlyExit}
              />
              <Button
                label="Continue Practice"
                variant="secondary"
                onPress={() => setShowEarlyExitPrompt(false)}
              />
            </View>
          </Surface>
        </BottomSheetModal>

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
        onDone={undefined}
        isAborted={isAborted}
        from={from}
      />
    );
  }

  // ── INTRO MODE (Tips) ───────────────────────────────────────────────────────
  const tips = [
    "Take deep breaths before starting. Feel your diaphragm expand.",
    "Maintain a relaxed facial posture. Release jaw tension.",
    "It's okay to take your time. Focus on smooth transitions.",
  ];

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
          />
        }
      >
        {/* Tips — a dot timeline on the dark canvas. */}
        <View>
          <Text variant="h3" color="primary" style={styles.tipsHeading}>
            Tips
          </Text>
          {tips.map((tip, index, arr) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipTrack}>
                <View
                  style={[styles.tipDot, { backgroundColor: colors.action.primary }]}
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

      {/* Vitals Feedback Modal */}
      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSubmit={handleVitalsSubmit}
        onSkip={handleVitalsSkip}
        showAccuracy={showAccuracy}
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
  },
  timerText: {
    fontVariant: ["tabular-nums"],
    marginTop: spacing["6xl"],
    marginBottom: spacing["5xl"],
  },
  // Early-exit sheet
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
