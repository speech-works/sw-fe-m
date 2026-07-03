import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePractice,
  CognitivePracticeType,
} from "../../../../../../api/dailyPractice/types";
import PressableScale from "../../../../../../components/PressableScale";
import { useBackgroundAudio } from "../../../../../../hooks/useBackgroundAudio";
import {
  Page,
  Surface,
  Button,
  Text,
  Icon,
  IconButton,
  useTheme,
  spacing,
  space,
  icons,
  Sheet,
} from "../../../../../../design-system";
import MeditationCard from "./components/MeditationCard";
import VoiceHoverPlayer from "./components/VoieHoverPlayer";

import {
  createPracticeActivity,
  createPracticeActivityFromPack,
} from "../../../../../../api";
import { MoodType } from "../../../../../../api/moodCheck/types";
import {
  completePracticeActivity,
  startPracticeActivity,
  abortPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import MeditationFace from "../../../../../../assets/sw-faces/MeditationFace";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import DonePractice from "../../../components/DonePractice";
import VitalsFeedbackModal from "../../../../../../components/VitalsFeedbackModal";
import { useConfirmOnExit } from "../../../../../../hooks/useConfirmOnExit";
import { track } from "../../../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";
import { ExploreStackNavigationProp } from "../../../../../../navigators/stacks/ExploreStack/types";

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";

const Meditation = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Meditation">>();
  const { colors } = useTheme();
  // Guided Meditation = the "purple" accent from the Cognitive Practice list;
  // the flow inherits it (Start, tips, selection, save + done screens).
  const accentColor = colors.accent.purple;
  const onAccentColor = colors.accentOn.purple;
  // Use CDPStackRouteProp for MeditationPractice
  const route = useRoute<CDPStackRouteProp<"MeditationPractice">>();
  const { packContext, practiceActivity, from } = route.params || {};

  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, ensureActiveSession } = useSessionStore();
  const { user } = useUserStore();
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    practiceActivity?.id || null,
  );

  // Mute toggle for both background and hover audio
  const [mute, setMute] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showEarlyExitPrompt, setShowEarlyExitPrompt] = useState(false);
  const [isAborted, setIsAborted] = useState(false);

  // Use existing route params

  // All fetched meditation scenarios
  const [meditationScenarios, setMeditationScenarios] = useState<
    CognitivePractice[]
  >([]);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    practiceActivity?.cognitivePractice?.id || null,
  );

  // meditation scenarios

  // Which scenario is currently selected
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // URLs for background music and voice‐hover audio
  const [bgMusicUrl, setBgMusicUrl] = useState<string>();
  const [voiceHoverUrl, setVoiceHoverUrl] = useState<string>();
  const [bgVolume] = useState<number>(0.1);
  const [hoverVolume] = useState<number>(0.8);

  // Exercise playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(packContext?.alreadyStarted || false);
  const [progress, setProgress] = useState<number>(0); // in seconds
  const isInitialMount = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // isStarted tracks if the activity is active (immersive view)
  const [isStarted, setIsStarted] = useState(packContext?.alreadyStarted || false);

  const TOTAL_SESSION_SECONDS = 5 * 60; // 5 minutes in seconds

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  // Save opens the existing vitals modal (the normal completion path). isCompleted
  // includes showVitalsModal so the 5-min auto-complete window (which opens the
  // vitals modal) doesn't trigger a second prompt.
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

  // Hook for background audio (looping)
  const { loadBackground, toggleBackground, stopBackground } =
    useBackgroundAudio(bgMusicUrl, bgVolume);

  // Bottom‐sheet visibility for selecting scenario
  const [isVisible, setIsVisible] = useState(false);
  const closeModal = () => setIsVisible(false);

  // Fetch all meditation scenarios once on mount
  useEffect(() => {
    const fetchScenarios = async () => {
      const ms = await getCognitivePracticeByType(
        CognitivePracticeType.GUIDED_MEDITATION,
      );
      setMeditationScenarios(ms);

      // If an ID is passed from recommendations, set it as the cognitivePracticeId
      const recommendedId = (route.params as any)?.id;
      if (recommendedId) {
        setCognitivePracticeId(recommendedId);
      }
    };
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (!meditationScenarios.length) return;

    // 1. Priority: Specific scenario ID from backend (especially for Packs)
    if (cognitivePracticeId) {
      const backendIndex = meditationScenarios.findIndex((s) => s.id === cognitivePracticeId);
      if (backendIndex !== -1) {
        setSelectedIndex(backendIndex);
        return;
      }
    }

    // 2. Fallback: Mood-based selection
    if (!route?.params?.mood) {
      setSelectedIndex(0);
      return;
    }

    const mood = route.params.mood;

    const findScenarioIndex = (name: string) =>
      meditationScenarios.findIndex((s) => s.name === name);

    let index = 0;
    switch (mood) {
      case MoodType.ANGRY:
        index = findScenarioIndex("Stress Relief");
        break;
      case MoodType.SAD:
        index = findScenarioIndex("Fear Removal");
        break;
      case MoodType.CALM:
        index = findScenarioIndex("Body Scan");
        break;
      case MoodType.HAPPY:
        index = findScenarioIndex("Guided Visualization");
        break;
      default:
        index = 0;
        break;
    }

    if (index === -1) index = 0;
    setSelectedIndex(index);
  }, [route?.params?.mood, meditationScenarios, cognitivePracticeId]);

  // Whenever scenarios or selectedIndex changes, update both URLs
  // And reset playback state
  useEffect(() => {
    if (!meditationScenarios.length) return;
    if (selectedIndex === null) return;

    const bgMusic =
      meditationScenarios[selectedIndex]?.guidedMeditationData?.bgMusicUrl;
    setBgMusicUrl(bgMusic);

    const vhUrl =
      meditationScenarios[selectedIndex]?.guidedMeditationData?.audioUrlKey;
    setVoiceHoverUrl(vhUrl);

    setCognitivePracticeId(meditationScenarios[selectedIndex]?.id || null);

    // Reset playback when meditation type changes,
    // BUT avoid resetting on the very first mount if the pack already started the session.
    if (!isInitialMount.current || !packContext?.alreadyStarted) {
      setIsPlaying(false);
      setProgress(0);
    }
    isInitialMount.current = false;
  }, [meditationScenarios, selectedIndex]);

  // When bgMusicUrl changes: stop old, load new
  useEffect(() => {
    let cancelled = false;
    if (!bgMusicUrl) return;

    (async () => {
      await stopBackground();

      if (cancelled) return;

      await loadBackground();

      // No auto-play here, only play when `isPlaying` is true
    })();

    return () => {
      cancelled = true;
    };
  }, [bgMusicUrl]);

  // Control background audio based on `isPlaying`, `mute` and screen focus
  useFocusEffect(
    useCallback(() => {
      if (isPlaying && !mute) {
        toggleBackground(true);
      } else {
        toggleBackground(false);
      }

      return () => {
        // Always pause audio when leaving screen
        toggleBackground(false);
      };
    }, [isPlaying, mute, toggleBackground])
  );

  const markActivityStart = async () => {
    console.log("markActivityStart [Meditation] called", {
      currentActivityId,
      packContext,
      practiceSession,
      cognitivePracticeId,
      selectedIndex,
      user: user?.id,
    });

    const userId = user?.id || practiceSession?.user?.id;
    if (!userId) {
      console.error("Missing userId for activity start");
      return;
    }

    try {
      let activityIdToStart = currentActivityId;

      // --- DOUBLE-START PREVENTION ---
      if (packContext?.alreadyStarted) {
        if (practiceActivity && selectedIndex !== null) {
          console.log(
            ">> Meditation: Activity already started by Pack, skipping API call...",
          );
          addActivity({
            ...practiceActivity,
            cognitivePractice: meditationScenarios[selectedIndex],
          });
          useUserStore.getState().fetchUser();
          setCurrentActivityId(practiceActivity.id);
          return;
        } else {
          console.error("FATAL: Pack marked activity as started, but practiceActivity is missing!");
          showErrorBottomSheet(
            "Something went wrong",
            "Activity data was lost. Returning to your Pack."
          );
          if (navigation.canGoBack()) {
            navigation.goBack();
          }
          return;
        }
      }

      // New Workflow: If we don't have an instance ID, create one
      if (!activityIdToStart) {
        if (!cognitivePracticeId) {
          console.error("Meditation Screen - Missing cognitivePracticeId, cannot create activity");
          return;
        }

        if (packContext?.packId) {
          console.log("Meditation - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
            contentId: cognitivePracticeId,
          });
          activityIdToStart = newActivity.id;
        } else {
          console.log("Meditation - Creating Activity via POST (Standalone)");
          if (selectedIndex === null) {
            console.warn("Missing requirements for standalone start", {
              cognitivePracticeId,
              selectedIndex,
            });
            return;
          }

          let sessionToUse: any = practiceSession;
          try {
            sessionToUse = await ensureActiveSession(user!.id);
          } catch (err) {
            console.error("Failed to ensure active session", err);
            return;
          }

          if (!sessionToUse) {
            console.error("Missing session for standalone activity");
            return;
          }

          let newActivity;
          try {
            newActivity = await createPracticeActivity({
              sessionId: sessionToUse.id,
              contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
              contentId: cognitivePracticeId,
            });
          } catch (createErr: any) {
            // Handle 404: Session found in local storage but missing in backend
            if (createErr?.response?.status === 404 && createErr?.response?.data?.error?.toLowerCase().includes("session")) {
              console.log(">> Meditation: Stale session detected (404), refreshing...");
              sessionToUse = await ensureActiveSession(userId, true);
              newActivity = await createPracticeActivity({
                sessionId: sessionToUse.id,
                contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
                contentId: cognitivePracticeId,
              });
            } else {
              throw createErr;
            }
          }
          activityIdToStart = newActivity.id;
        }
      }

      console.log("Starting activity with ID:", activityIdToStart);
      const startedActivity = await startPracticeActivity({
        id: activityIdToStart,
        userId: userId,
      });

      console.log("Activity STARTED:", startedActivity);

      addActivity({
        ...startedActivity,
        cognitivePractice: meditationScenarios[selectedIndex!],
      });

      // Track activity start
      track(ANALYTICS_EVENTS.ACTIVITY_STARTED, {
        activityId: activityIdToStart,
        contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
        title: meditationScenarios[selectedIndex!]?.name,
        isPackContext: !!packContext?.packId
      });

      useUserStore.getState().fetchUser();
      setCurrentActivityId(activityIdToStart);
    } catch (e) {
      console.error("Failed to start activity", e);
      throw e; // Re-throw to handle in UI
    }
  };

  const markActivityComplete = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    console.log("markActivityComplete [Meditation] called", {
      currentActivityId,
      practiceSession: practiceSession?.id,
      packContext,
      selectedIndex,
      vitals,
    });

    if (
      (!practiceSession && !packContext) ||
      !currentActivityId ||
      !doesActivityExist(currentActivityId) ||
      selectedIndex === null
    ) {
      console.warn("Missing requirements for completion", {
        hasSession: !!practiceSession,
        hasPackContext: !!packContext,
        currentActivityId,
        activityExists: currentActivityId
          ? doesActivityExist(currentActivityId)
          : false,
        selectedIndex,
      });
      return;
    }

    // Fix: Use user store ID if available, fallback to session ID
    const userId = user?.id || practiceSession?.user?.id;
    if (!userId) {
      console.warn(">> Meditation: Missing userId, cannot complete activity");
      return;
    }

    try {
      console.log("Completing activity...", { id: currentActivityId, userId });
      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId: userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
        vitals,
      });

      console.log("Activity COMPLETED:", completedActivity);

      updateActivity(currentActivityId, {
        ...completedActivity,
        cognitivePractice: meditationScenarios[selectedIndex],
      });

      // Track activity completion
      track(ANALYTICS_EVENTS.ACTIVITY_COMPLETED, {
        activityId: currentActivityId,
        contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
        title: meditationScenarios[selectedIndex]?.name,
        isPackContext: !!packContext?.packId,
        vitals: vitals ? {
          effortScore: vitals.effortScore,
          autonomyScore: vitals.autonomyScore,
          accuracyScore: vitals.accuracyScore ?? null,
        } : null
      });

      useUserStore.getState().fetchUser();

      // Navigation handled externally now
    } catch (e) {
      console.error("Failed to complete activity", e);
      showErrorBottomSheet(
        "Save Failed",
        "We couldn't save your progress. Please try again.",
      );
      throw e; // Rethrow to let calling function handle navigation stop
    }
  };

  // Timer logic for progress
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= TOTAL_SESSION_SECONDS) {
            clearInterval(intervalRef.current!);
            setIsPlaying(false); // Stop playing when session is complete
            // Show vitals modal instead of completing immediately
            setShowVitalsModal(true);
            return TOTAL_SESSION_SECONDS;
          }
          return prevProgress + 1;
        });
      }, 1000); // Update every second
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);

  const handleStart = async () => {
    try {
      await markActivityStart();
      setIsStarted(true);
      setIsPlaying(true);
      setProgress(0);
    } catch (error) {
      console.error("Error starting meditation practice:", error);
      // Global stamina modal will be handled by the API layer event
    }
  };

  const handleCompletePress = () => {
    if (progress < 300) {
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
    setIsPlaying(false);
    setIsStarted(false);

    const userId = user?.id || practiceSession?.user?.id;
    if (currentActivityId && userId) {
      try {
        const abortedActivity = await abortPracticeActivity({
          id: currentActivityId,
          userId: userId,
          packId: packContext?.packId,
          moduleId: packContext?.moduleId,
        });
        updateActivity(currentActivityId, {
          ...abortedActivity,
          cognitivePractice: meditationScenarios[selectedIndex as number],
        });

        // Track activity abandonment
        track(ANALYTICS_EVENTS.ACTIVITY_ABANDONED, {
          activityId: currentActivityId,
          contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
          title: meditationScenarios[selectedIndex as number]?.name,
          isPackContext: !!packContext?.packId,
          progressSeconds: progress
        });

        useUserStore.getState().fetchUser();
      } catch (e) {
        console.error("Failed to abort activity", e);
      }
    }

    if (packContext && navigation.canGoBack()) {
      navigation.goBack();
    } else if (packContext) {
      navigation.navigate("PackModule", {
        packId: packContext.packId,
        moduleId: packContext.moduleId,
        initialBlockIndex: packContext.blockIndex,
      } as any);
    } else {
      setIsAborted(true);
      setIsDone(true);
    }
  };

  const handleComplete = () => {
    setIsPlaying(false);
    setIsStarted(false); // Add this to exit immersive view when showing vitals
    setShowVitalsModal(true);
  };

  const handleVitalsSubmit = async (vitals?: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => {
    setShowVitalsModal(false);
    try {
      await markActivityComplete(vitals);
      if (packContext) {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate("PackModule", {
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            initialBlockIndex: packContext.blockIndex,
          } as any);
        }
      } else {
        setIsDone(true);
      }
    } catch (e) {
      // Error is handled in markActivityComplete
      console.error("Failed to submit vitals and complete activity", e);
    }
  };

  const displayMinutes = Math.floor(progress / 60);
  const displaySeconds = progress % 60;

  // ── IMMERSIVE MODE (dark canvas + preserved meditation face + audio) ────────
  if (isStarted && !isDone) {
    const sessionComplete = progress >= TOTAL_SESSION_SECONDS;
    return (
      <View
        style={[styles.immersiveContainer, { backgroundColor: colors.background.canvas }]}
      >
        <View style={styles.immersiveContent}>
          {/* Timer */}
          <Text
            variant="display"
            color={sessionComplete ? colors.feedback.successText : "primary"}
            style={styles.timerText}
          >
            {`${displayMinutes.toString().padStart(2, "0")}:${displaySeconds
              .toString()
              .padStart(2, "0")}`}
          </Text>

          {/* Large Meditation Face (preserved) */}
          <View>
            <MeditationFace size={240} />
          </View>
        </View>

        {/* Audio Player (Invisible but active) — preserved */}
        <VoiceHoverPlayer
          voiceHoverUrl={voiceHoverUrl}
          mute={mute}
          hoverVolume={hoverVolume}
          isPlaying={isPlaying}
          playbackRatePercent={-20}
        />

        {/* Bottom Controls */}
        <View style={styles.immersiveControls}>
          <IconButton
            name={mute ? "volume-x" : "volume-2"}
            variant="ghost"
            onPress={() => setMute(!mute)}
            color={colors.text.secondary}
          />

          <Button
            label="Complete Session"
            variant="secondary"
            onPress={handleCompletePress}
            fullWidth={false}
            style={styles.completeButton}
          />
        </View>

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
        practiceName="meditation"
        accentColor={accentColor}
        onAccentColor={onAccentColor}
        onDone={undefined}
        isAborted={isAborted}
        from={from}
      />
    );
  }

  const tips =
    selectedIndex !== null
      ? meditationScenarios[selectedIndex]?.guidedMeditationData?.tips ?? []
      : [];

  // ── INTRO MODE ──────────────────────────────────────────────────────────────
  return (
    <>
      <Page
        title="Guided Meditation"
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        footer={
          <Button
            label="Start Exercise"
            onPress={handleStart}
            accentColor={accentColor}
            onAccentColor={onAccentColor}
          />
        }
      >
        {selectedIndex !== null && meditationScenarios[selectedIndex] && (
          <MeditationCard
            selectedMed={meditationScenarios[selectedIndex]}
            onMedToggle={() => {
              setIsVisible((old) => !old);
            }}
          />
        )}

        {tips.length > 0 && (
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
        )}
      </Page>

      <Sheet visible={isVisible} onClose={closeModal}>
        <View style={styles.modalHeader}>
          <Text variant="h2" color="primary">
            Meditation Library
          </Text>
          <Text variant="body" color="secondary" style={styles.modalSubtitle}>
            Select a scenario to start your practice
          </Text>
        </View>

        <View style={styles.medList}>
            {meditationScenarios.map((med, index) => {
              const isSelected = selectedIndex === index;
              return (
                <PressableScale
                  key={index}
                  onPress={() => {
                    setSelectedIndex(index);
                    closeModal();
                  }}
                >
                  <Surface
                    level={isSelected ? "elevated" : "control"}
                    rounded="card"
                    bordered={!isSelected}
                    style={[
                      styles.medCard,
                      isSelected && { borderWidth: 1, borderColor: accentColor },
                    ]}
                  >
                    <View style={styles.watermarkIconContainer}>
                      <Icon
                        name={icons.affirmation}
                        size={100}
                        color={colors.text.tertiary}
                        style={{ opacity: 0.1 }}
                      />
                    </View>
                    <View style={styles.medDescContainer}>
                      <Text variant="h3" color="primary">
                        {med.name}
                      </Text>
                      <Text variant="bodySm" color="secondary" numberOfLines={2}>
                        {med.description}
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

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
        accentColor={accentColor}
        onAccentColor={onAccentColor}
      />

      {exitSheet}
    </>
  );
};

export default Meditation;

const styles = StyleSheet.create({
  // Immersive
  immersiveContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing["6xl"],
  },
  immersiveContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  immersiveControls: {
    paddingBottom: spacing["5xl"],
    width: "100%",
    alignItems: "center",
    gap: space.groupGap,
  },
  timerText: {
    fontVariant: ["tabular-nums"],
    fontSize: 56,
    lineHeight: 80,
    letterSpacing: 4,
    marginBottom: spacing["6xl"],
  },
  completeButton: {
    minWidth: 200,
    alignSelf: "center",
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
  // Library modal
  modalContent: {
    flex: 1,
    paddingHorizontal: space.sectionGap,
    paddingVertical: space.sectionGap,
  },
  modalHeader: {
    alignItems: "flex-start",
    gap: space.inlineGap,
    marginBottom: spacing["3xl"],
    marginTop: space.groupGap,
  },
  modalSubtitle: {
    marginTop: space.titleSub,
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer2: {
    paddingBottom: spacing["6xl"],
    gap: space.groupGap,
    paddingTop: space.rowGap,
  },
  medList: {
    gap: space.groupGap,
  },
  medCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.groupGap,
    paddingHorizontal: space.sectionGap,
    minHeight: 90,
    overflow: "hidden",
  },
  watermarkIconContainer: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
    zIndex: 0,
  },
  medDescContainer: {
    flex: 1,
    gap: space.iconText,
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
