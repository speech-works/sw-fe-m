import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../../../../components/ScreenView";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import { BreathingHalo } from "./components/BreathingHalo";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useMarkActivityStart } from "../../../../../../hooks/useMarkActivityStart";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import { CognitivePracticeType } from "../../../../../../api/dailyPractice/types";
import {
  completePracticeActivity,
  abortPracticeActivity,
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

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";
import { ExploreStackNavigationProp } from "../../../../../../navigators/stacks/ExploreStack/types";

const Breathing = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Breathing">>();
  const route = useRoute<CDPStackRouteProp<"BreathingPractice">>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;

  const passedActivity = route.params?.practiceActivity;
  const packContext = route.params?.packContext;
  const from = route.params?.from;

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
          <LinearGradient
            colors={["#EFF6FF", "#DBEAFE"]}
            style={[styles.skipModalContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}
          >
            <View style={styles.skipModalWatermark} pointerEvents="none">
              <Icon
                name="clock"
                solid
                size={180}
                color={theme.colors.library.blue[200]}
                style={{ opacity: 0.2, transform: [{ rotate: "15deg" }] }}
              />
            </View>
            <Text style={styles.skipModalTitle}>Finish early?</Text>
            <Text style={styles.skipModalDesc}>
              We recommend at least 5 minutes of practice for the best results. Are you sure you want to end your session early?
            </Text>
            <View style={styles.skipModalActions}>
              <TouchableOpacity
                style={styles.skipModalPrimaryButton}
                onPress={confirmEarlyExit}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[theme.colors.library.blue[500], theme.colors.library.blue[600]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.skipModalButtonGradient}
                >
                  <Text style={styles.skipModalPrimaryButtonText}>End Session</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.skipModalSecondaryButton}
                onPress={() => setShowEarlyExitPrompt(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.skipModalSecondaryButtonText}>Continue Practice</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BottomSheetModal>
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

  return (
    <ScreenView style={styles.screenView}>
      {/* ── STANDARD MODE (Intro) ────────────────────────────────────────────── */}
      <View style={styles.container}>
        {/* ── Top Bar with Back + Mute Button ──────────────────────────────────────── */}
        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.topNavigationContainer,
            { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
          ]}
        >
          <TouchableOpacity
            onPress={() =>
              from === "MOOD_CHECK"
                ? navigation.navigate("Root" as any, { screen: "HOME" })
                : navigation.goBack()
            }
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
        </BlurView>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: HEADER_HEIGHT + insets.top + 20,
            flexGrow: 1,
            justifyContent: "flex-start",
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.timelineSection}>
            <Text style={styles.sectionHeader}>Tips</Text>
            <View style={styles.timelineContainer}>
              {[
                "Take deep breaths before starting. Feel your diaphragm expand.",
                "Maintain a relaxed facial posture. Release jaw tension.",
                "It's okay to take your time. Focus on smooth transitions.",
              ].map((tip, index, arr) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineTrack}>
                    <View style={styles.timelineDot} />
                    {index !== arr.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineText}>{tip}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Fixed Start Button at the bottom */}
        <View
          style={[
            styles.bottomActionContainer,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <Button
            text="Start Exercise"
            onPress={async () => {
              try {
                await markActivityStart();
              } catch (error) {
                console.error("Error starting breathing practice:", error);
                // Global stamina modal will be handled by the API layer event
              }
            }}
            style={styles.startButton}
          />
        </View>
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
    backgroundColor: '#FAFAFA',
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
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
  heroSection: {
    marginBottom: 40,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    fontSize: 34,
    color: '#111827', // Gray 900
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  heroDescription: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 17,
    color: '#4B5563', // Gray 600
    lineHeight: 26,
  },
  timelineSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 22,
    color: '#111827',
    marginBottom: 24,
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineTrack: {
    alignItems: 'center',
    width: 20,
    marginRight: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginTop: 7,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
    marginBottom: -4,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 32,
  },
  timelineText: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: '#374151', // Gray 700
    lineHeight: 24,
  },
  startButton: {
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
    marginBottom: 0,
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
  bottomActionContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  skipModalContainer: {
    padding: 32,
    alignItems: "center",
    paddingBottom: 48,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: "relative",
    overflow: "hidden",
  },
  skipModalWatermark: {
    position: "absolute",
    left: -50,
    top: -30,
    zIndex: 0,
  },
  skipModalTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#1E3A8A", // Blue-900
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    zIndex: 1,
  },
  skipModalDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: "#1E3A8A",
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    zIndex: 1,
  },
  skipModalActions: {
    width: "100%",
    gap: 12,
    zIndex: 1,
  },
  skipModalPrimaryButton: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  skipModalButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  skipModalPrimaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },
  skipModalSecondaryButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(30,58,138,0.1)", // Border matching text blue
  },
  skipModalSecondaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#1E3A8A",
    fontWeight: "600",
    fontSize: 16,
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
