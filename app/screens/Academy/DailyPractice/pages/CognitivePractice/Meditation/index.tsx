import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePractice,
  CognitivePracticeType,
} from "../../../../../../api/dailyPractice/types";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import Button from "../../../../../../components/Button";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../components/ScreenView";
import { useBackgroundAudio } from "../../../../../../hooks/useBackgroundAudio";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import MasonryTips from "../../../components/MasonryTips";
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
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { showErrorBottomSheet } from "../../../../../../util/functions/bottomSheet";
import DonePractice from "../../../components/DonePractice";
import VitalsFeedbackModal from "../../../../../../components/VitalsFeedbackModal";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { track } from "../../../../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../../../../util/analytics/analyticsEvents";
import { ExploreStackNavigationProp } from "../../../../../../navigators/stacks/ExploreStack/types";

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/CognitivePracticeStack/types";

const Meditation = () => {
  const navigation = useNavigation<ExploreStackNavigationProp<"Meditation">>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
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
  const [bgVolume, setBgVolume] = useState<number>(0.1);
  const [hoverVolume, setHoverVolume] = useState<number>(0.8);

  // Exercise playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(packContext?.alreadyStarted || false);
  const [progress, setProgress] = useState<number>(0); // in seconds
  const isInitialMount = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // isStarted tracks if the activity is active (immersive view)
  const [isStarted, setIsStarted] = useState(packContext?.alreadyStarted || false);

  const TOTAL_SESSION_SECONDS = 5 * 60; // 5 minutes in seconds

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
    // Allow the BottomSheetModal to fully animate out (300ms) before
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

  // Immersive Practice View
  if (isStarted && !isDone) {
    return (
      <View style={styles.immersiveContainer}>
        {/* Deep Indigo Gradient to match Face - Darker Variant */}
        <LinearGradient
          colors={["#3949AB", "#283593", "#1A237E"]} // Darker shades of Indigo
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.immersiveContent}>
          {/* Timer */}
          <Text
            style={[
              styles.timerText,
              { marginTop: 0 }, // Handled by container padding
              progress >= TOTAL_SESSION_SECONDS && { color: "#4ADE80" }, // Green if > 5 mins
            ]}
          >
            {`${displayMinutes.toString().padStart(2, "0")}:${displaySeconds
              .toString()
              .padStart(2, "0")}`}
          </Text>

          {/* Large Meditation Face */}
          <View>
            <MeditationFace size={240} />
          </View>
        </View>

        {/* Audio Player (Invisible but active) */}
        <VoiceHoverPlayer
          voiceHoverUrl={voiceHoverUrl}
          mute={mute}
          hoverVolume={hoverVolume}
          isPlaying={isPlaying}
          playbackRatePercent={-20}
        />

        {/* Bottom Controls */}
        <View style={styles.immersiveControls}>
          <TouchableOpacity
            onPress={() => setMute(!mute)}
            style={{ marginBottom: 20, alignSelf: "center", opacity: 0.8 }}
          >
            <Icon
              name={mute ? "volume-mute" : "volume-up"}
              size={24}
              color="#FFF"
            />
          </TouchableOpacity>

          <Button
            text="Complete Session"
            variant="ghost"
            style={{
              backgroundColor: "rgba(255,255,255,0.1)",
              borderColor: "rgba(255,255,255,0.1)",
              minWidth: 200,
            }}
            textColor="#F8FAFC"
            onPress={handleCompletePress}
          />
        </View>

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
        practiceName="meditation"
        onDone={undefined}
        isAborted={isAborted}
        from={from}
      />
    );
  }

  return (
    <>
      <ScreenView style={styles.screenView}>
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
          <Text style={styles.headerTitle}>Guided Meditation</Text>
          <View style={{ width: 32 }} />
        </BlurView>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: HEADER_HEIGHT + insets.top + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <>
            {selectedIndex !== null && meditationScenarios[selectedIndex] && (
              <MeditationCard
                selectedMed={meditationScenarios[selectedIndex]}
                onMedToggle={() => {
                  setIsVisible((old) => !old);
                }}
              />
            )}

            <View style={styles.tipsContainer}>
              {/* Masonry Tips Grid */}
              {selectedIndex !== null &&
              meditationScenarios[selectedIndex]?.guidedMeditationData?.tips ? (
                <MasonryTips
                  tips={
                    meditationScenarios[selectedIndex]?.guidedMeditationData
                      ?.tips || []
                  }
                />
              ) : null}
            </View>
          </>
        </ScrollView>

        {/* Start Button at bottom */}
        <View
          style={[
            styles.bottomActionContainer,
            { paddingBottom: insets.bottom || 24 },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleStart}
            style={styles.startButton}
          >
            <LinearGradient
              colors={[
                theme.colors.library.purple[400],
                theme.colors.library.purple[500],
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startButtonGradient}
            >
              <Text style={styles.startButtonText}>Start Exercise</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScreenView>

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
        showCloseButton={true}
      >
        <View
          style={[
            styles.modalContent,
            { paddingBottom: Math.max(insets.bottom, 24) },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitleText}>Meditation Library</Text>
            <Text style={styles.modalSubtitleText}>
              Select a scenario to start your practice
            </Text>
          </View>

          <CustomScrollView
            style={styles.scrollView}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.scrollContainer2}
          >
            {meditationScenarios.map((med, index) => {
              const isSelected = selectedIndex === index;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedIndex(index);
                    closeModal();
                  }}
                  style={[
                    styles.medCardBase,
                    isSelected ? null : styles.medCardUnselected,
                  ]}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={["#7C3AED", "#6D28D9"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.medCardGradient}
                    >
                      <View style={styles.medIconContainerSelected}>
                        <Icon
                          solid
                          name={med.guidedMeditationData?.icon || "spa"}
                          size={18}
                          color="#7C3AED"
                        />
                      </View>
                      <View style={styles.medDescContainer}>
                        <Text style={styles.medNameTextSelected}>
                          {med.name}
                        </Text>
                        <Text style={styles.medDetailTextSelected}>
                          {med.description}
                        </Text>
                      </View>
                      <Icon name="check-circle" solid size={20} color="#FFF" />
                    </LinearGradient>
                  ) : (
                    <View style={styles.medCardContent}>
                      <View style={styles.medIconContainerUnselected}>
                        <Icon
                          solid
                          name={med.guidedMeditationData?.icon || "spa"}
                          size={18}
                          color="#94A3B8"
                        />
                      </View>
                      <View style={styles.medDescContainer}>
                        <Text style={styles.medNameText}>{med.name}</Text>
                        <Text style={styles.medDetailText}>
                          {med.description}
                        </Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </CustomScrollView>
        </View>
      </BottomSheetModal>

      <VitalsFeedbackModal
        visible={showVitalsModal}
        onSkip={() => handleVitalsSubmit(undefined)}
        onSubmit={handleVitalsSubmit}
      />


    </>
  );
};

export default Meditation;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
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
    paddingHorizontal: 24, // Matched others
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
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
    paddingBottom: 180,
    flexGrow: 1,
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

  tipsContainer: {
    paddingHorizontal: 0,
    gap: 0,
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
    // Premium shadow
    shadowColor: theme.colors.library.purple[200],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  noteIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3E8FF", // faint purple
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
  // Modal Styles
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24, // Increased top padding
  },
  scrollView: {
    flex: 1,
  },
  scrollContainer2: {
    paddingBottom: 64, // More bottom space
    gap: 20, // Increased gap for airy feel
    paddingTop: 12,
  },
  modalHeader: {
    alignItems: "flex-start", // Left-align for editorial look
    gap: 8,
    marginBottom: 32, // Significant spacing
    marginTop: 16,
  },
  modalTitleText: {
    ...parseTextStyle(theme.typography.Heading1), // Heavy font
    fontSize: 32, // Large editorial size
    color: "#0F172A", // Slate-900 (Darker)
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  modalSubtitleText: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: "#64748B", // Slate-500
    marginTop: 4,
    maxWidth: "90%",
    lineHeight: 24,
  },

  // Med Card Styles
  medCardBase: {
    width: "100%",
    borderRadius: 32, // Squircle / Super-rounded
    overflow: "hidden",
  },
  medCardUnselected: {
    backgroundColor: "#F8FAFC", // Very subtle slate-50
    // Minimal floating shadow
    shadowColor: "#94A3B8",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 0, // No border
  },
  medCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24, // Generous padding
    gap: 20,
  },
  medCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24, // Generous padding
    gap: 20,
  },

  // Icons
  medIconContainerSelected: {
    width: 56, // Large icon
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.25)", // Frosted glass
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  medIconContainerUnselected: {
    width: 56, // Large icon
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    // Subtle shadow for icon
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },

  // Text
  medDescContainer: {
    flex: 1,
    gap: 6,
  },
  medNameText: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 19,
    fontWeight: "700",
    color: "#334155", // Slate-700
    letterSpacing: -0.3,
  },
  medDetailText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#94A3B8", // Slate-400
    fontSize: 15,
    fontWeight: "500",
  },
  medNameTextSelected: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  medDetailTextSelected: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.85)", // High contrast
    fontSize: 15,
    fontWeight: "500",
  },
  // Immersive Styles
  immersiveContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 80, // Safe area padding for timer
  },
  immersiveContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  immersiveControls: {
    paddingBottom: 48,
    width: "100%",
    alignItems: "center",
  },
  timerText: {
    ...parseTextStyle(theme.typography.Heading1),
    fontSize: 56, // Even Larger
    fontVariant: ["tabular-nums"],
    color: "#F8FAFC",
    marginBottom: 72,
    opacity: 0.95,
    fontWeight: "200", // Thinner, elegant font
    letterSpacing: 4,
    lineHeight: 80,
  },
  bottomActionContainer: {
    paddingHorizontal: SHADOW_BUFFER + 20,
  },
});
