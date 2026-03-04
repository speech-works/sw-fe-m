import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../../../../components/ScreenView";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { triggerToast } from "../../../../../../util/functions/toast";
import MasonryTips from "../../../components/MasonryTips";
import { BreathingHalo } from "./components/BreathingHalo";

import {
  createPracticeActivity,
  createPracticeActivityFromPack,
} from "../../../../../../api";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import { CognitivePracticeType } from "../../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";
import Button from "../../../../../../components/Button";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
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

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/CognitivePracticeStack/types";
import { AcademyStackNavigationProp } from "../../../../../../navigators/stacks/AcademyStack/types";

const Breathing = () => {
  const navigation = useNavigation<AcademyStackNavigationProp<"Breathing">>();

  // single “mute” state that mutes both breath sounds + background
  const [mute, setMute] = useState(false);
  // State to track elapsed seconds for the session
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null,
  );
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [currentActivity, setCurrentActivity] = useState<any>(null);

  const totalSessionDurationInSeconds = 5 * 60; // 5 minutes converted to seconds

  // background hook (load, toggle, stop)
  const { loadBackground, toggleBackground, stopBackground } =
    useBackgroundAudio();

  const { addActivity, updateActivity } = useActivityStore();
  const { practiceSession, ensureActiveSession } = useSessionStore();
  const { user } = useUserStore();

  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );

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
      triggerToast("error", "Invalid Input", validation.error);
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
      triggerToast(
        "error",
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
      triggerToast(
        "error",
        "Save Failed",
        "We couldn't save your progress. Please try again.",
      );
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

  // Use route params if available
  const route = useRoute<CDPStackRouteProp<"BreathingPractice">>();
  const passedActivity = route.params?.practiceActivity;
  const packContext = route.params?.packContext;

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
      // Always fetch default to get a VALID backend ID (since hydration might have wrapper ID)
      const cp = await getCognitivePracticeByType(
        CognitivePracticeType.GUIDED_BREATHING,
      );
      const defaultId = cp[0]?.id || null;
      console.log("Breathing Screen - Fetched default ID:", defaultId);

      if (passedActivity) {
        console.log("Breathing Screen - Using passed activity mode");
        // In the new workflow, passedActivity.id IS the unique instance ID
        setCognitivePracticeId(passedActivity.id);
        setCurrentActivityId(passedActivity.id);
        setCurrentActivity(passedActivity);
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

  const markActivityStart = async () => {
    console.log("Breathing Screen - markActivityStart", {
      currentActivityId,
      hasPracticeSession: !!practiceSession,
      packContext,
    });

    const userId = practiceSession?.user?.id || user?.id;
    if (!userId) {
      console.error("Breathing Screen - Missing user ID");
      return;
    }

    try {
      let activityIdToStart = currentActivityId;

      // If we don't have a unique activity ID yet, create one
      if (!activityIdToStart) {
        if (packContext?.packId) {
          console.log("Breathing - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
            contentId: apiContentId || cognitivePracticeId!,
          });
          activityIdToStart = newActivity.id;
        } else {
          console.log("Breathing - Creating Activity via POST (Standalone)");
          if (!apiContentId) {
            console.error(
              "Breathing Screen - Missing apiContentId for standalone creation",
            );
            return;
          }

          let sessionToUse: any = practiceSession;
          try {
            sessionToUse = await ensureActiveSession(user!.id);
          } catch (err) {
            console.error(
              "Breathing Screen - Failed to ensure active session",
              err,
            );
            return;
          }

          if (!sessionToUse) {
            console.error(
              "Breathing Screen - Missing session for standalone activity",
            );
            return;
          }

          const newActivity = await createPracticeActivity({
            sessionId: sessionToUse.id,
            contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
            contentId: apiContentId,
          });
          activityIdToStart = newActivity.id;
        }
      }

      console.log("Starting activity with ID:", activityIdToStart);

      const startedActivity = await startPracticeActivity({
        id: activityIdToStart,
        userId,
      });

      addActivity(startedActivity);
      useUserStore.getState().fetchUser();
      setCurrentActivity(startedActivity);
      setCurrentActivityId(activityIdToStart);
    } catch (error) {
      console.error("Failed to start activity:", error);
      triggerToast(
        "error",
        "Failed to Start",
        "We couldn't start this exercise. Please try again later.",
      );
    }
  };

  if (currentActivityId && !isDone) {
    return (
      <View style={styles.immersiveContainer}>
        {/* Warm Gradient Background */}
        <LinearGradient
          colors={["#000000", "#020617", "#0F172A"]} // Black -> Slate-950 -> Slate-900
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.immersiveContent}>
          {/* Timer Display */}
          <Text
            style={[
              styles.timerText,
              { marginTop: 60 },
              elapsedSeconds >= totalSessionDurationInSeconds && {
                color: "#4ADE80",
              },
            ]}
          >
            {`${displayMinutes.toString().padStart(2, "0")}:${displaySeconds
              .toString()
              .padStart(2, "0")}`}
          </Text>

          {/* Centered Halo */}
          <BreathingHalo inhale={4} hold={4} exhale={4} repeat mute={mute} />
        </View>

        {/* Bottom Controls */}
        <View style={styles.immersiveControls}>
          <Button
            text="End Session"
            variant="ghost" // Ghost/Subtle button style if available, or just standard
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderColor: "rgba(255,255,255,0.1)",
            }}
            textColor="#F8FAFC"
            onPress={async () => {
              setIsLoading(true);
              try {
                // Check if vitals should be collected
                if (
                  currentActivity &&
                  shouldCollectVitals(currentActivity.contentType)
                ) {
                  setShowAccuracy(shouldCollectAccuracy(currentActivity));
                  setShowVitalsModal(true);
                } else {
                  console.log(
                    "[Breathing Debug] Marking activity done via manual completion",
                  );
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
                  } else {
                    setIsDone(true);
                  }
                }
              } finally {
                setIsLoading(false);
              }
            }}
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
      </View>
    );
  }

  if (isDone) {
    return <DonePractice practiceName="breathing exercise" />;
  }

  return (
    <ScreenView style={styles.screenView}>
      {/* ── STANDARD MODE (Intro) ────────────────────────────────────────────── */}
      <View style={styles.container}>
        {/* ── Top Bar with Back + Mute Button ──────────────────────────────────────── */}
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Breathing</Text>
          <View style={{ width: 32 }} />
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContainer}>
          <View>
            {/* ── Practice Tips ─────────────────────────────────────────────────────────── */}
            <View style={styles.tipsContainer}>
              {/* Header Banner */}
              <View style={styles.noteHeaderBanner}>
                <LinearGradient
                  colors={["#FFE4E6", "#FFEDD5"]} // Soft Pink to Orange
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.noteHeaderTextContainer}>
                  <Text style={styles.noteHeaderTitle}>Tips</Text>
                  <Text style={styles.noteHeaderSubtitle}>
                    Before you start
                  </Text>
                </View>
                <TherapistFace size={72} />
              </View>

              {/* Masonry Tips Grid */}
              <MasonryTips
                tips={[
                  "Take deep breaths before starting. Feel your diaphragm expand.",
                  "Maintain a relaxed facial posture. Release jaw tension.",
                  "It's okay to take your time. Focus on smooth transitions.",
                ]}
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={markActivityStart}
              style={[
                styles.startButton,
                { marginHorizontal: 20, marginTop: 10 },
              ]}
            >
              <LinearGradient
                colors={[
                  theme.colors.library.orange[400],
                  theme.colors.library.orange[500],
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startButtonGradient}
              >
                <Text style={styles.startButtonText}>Start Exercise</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </CustomScrollView>
      </View>

      {/* Vitals Feedback Modal */}
      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSubmit={handleVitalsSubmit}
        onSkip={handleVitalsSkip}
        showAccuracy={showAccuracy}
      />
    </ScreenView>
  );
};

export default Breathing;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
    flexGrow: 1,
  },
  topNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  haloContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: 36,
  },
  tipsContainer: {
    paddingHorizontal: 0,
    gap: 0,
  },
  noteHeaderBanner: {
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 24,
    height: 120, // tall banner
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  noteHeaderTextContainer: {
    flex: 1,
    gap: 8,
    zIndex: 2,
  },
  noteHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 24,
    fontWeight: "800",
    color: "#881337", // Deep pink/red text
  },
  noteHeaderSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#9F1239",
    fontWeight: "500",
  },
  noteStack: {
    paddingHorizontal: 0,
    gap: 16,
    paddingBottom: 20,
  },
  noteCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    // Soft, premium shadow like iOS Notes
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  noteIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7", // faint yellow
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  noteContent: {
    flex: 1,
    gap: 4,
  },
  noteTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
    color: "#171717",
  },
  noteBody: {
    ...parseTextStyle(theme.typography.Body),
    color: "#525252",
    lineHeight: 22,
  },
  startButton: {
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginBottom: 40,
  },
  startButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
  },
  startButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontWeight: "700",
  },
  progressContainer: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: 24,
    gap: 16,
  },
  progressTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  progressDescText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  exerciseContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    height: "100%",
  },
  actionContainer: {
    gap: 20,
  },
  // Immersive Styles
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
    paddingBottom: 48,
  },
  timerText: {
    ...parseTextStyle(theme.typography.Heading2),
    fontVariant: ["tabular-nums"],
    color: "#E2E8F0", // Slate-200
    marginBottom: 48,
    opacity: 0.9,
  },
});
