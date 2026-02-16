import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ImageBackground,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import ScreenView from "../../../../../../components/ScreenView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { LinearGradient } from "expo-linear-gradient";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import ProgressBar from "../../../../../../components/ProgressBar";
import Button from "../../../../../../components/Button";
import MeditationCard from "./components/MeditationCard";
import MasonryTips from "../../../components/MasonryTips";
import { getCognitivePracticeByType } from "../../../../../../api/dailyPractice";
import {
  CognitivePractice,
  CognitivePracticeType,
} from "../../../../../../api/dailyPractice/types";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";
import { useBackgroundAudio } from "../../../../../../hooks/useBackgroundAudio";
import VoiceHoverPlayer from "./components/VoieHoverPlayer";
import { MoodFUStackParamList } from "../../../../../../navigators/stacks/AcademyStack/MoodCheckStack/FollowUpStack/types";

import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { useActivityStore } from "../../../../../../stores/activity";
import {
  createPracticeActivity,
  createPracticeActivityFromPack,
  createSession,
} from "../../../../../../api";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { MoodType } from "../../../../../../api/moodCheck/types";
import DonePractice from "../../../components/DonePractice";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";
import MeditationFace from "../../../../../../assets/sw-faces/MeditationFace";
import { triggerToast } from "../../../../../../util/functions/toast";

import { AcademyStackNavigationProp } from "../../../../../../navigators/stacks/AcademyStack/types";

import { CDPStackRouteProp } from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/CognitivePracticeStack/types";

const Meditation = () => {
  const navigation = useNavigation<AcademyStackNavigationProp<"Meditation">>();
  // Use CDPStackRouteProp for MeditationPractice
  const route = useRoute<CDPStackRouteProp<"MeditationPractice">>();

  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, setSession, ensureActiveSession } =
    useSessionStore();
  const { user } = useUserStore();
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
  );

  // Mute toggle for both background and hover audio
  const [mute, setMute] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Use existing route params
  const { packContext, practiceActivity } = route.params || {};

  // All fetched meditation scenarios
  const [meditationScenarios, setMeditationScenarios] = useState<
    CognitivePractice[]
  >([]);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null,
  );

  // Initialize from params for the new workflow
  useEffect(() => {
    if (practiceActivity?.id) {
      setCurrentActivityId(practiceActivity.id);
      // We don't have the full hydrated activity here yet (needs to be merged with scenario)
      // but we have the ID for startPracticeActivity.
    }
  }, [practiceActivity]);

  // Which scenario is currently selected
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // URLs for background music and voice‐hover audio
  const [bgMusicUrl, setBgMusicUrl] = useState<string>();
  const [voiceHoverUrl, setVoiceHoverUrl] = useState<string>();
  const [bgVolume, setBgVolume] = useState<number>(0.1);
  const [hoverVolume, setHoverVolume] = useState<number>(0.8);

  // Exercise playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0); // in seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    };
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (!meditationScenarios.length) return;

    // If no route param, default to first scenario
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
      default: // Added a default case
        index = 0;
        break;
    }

    // If mood mapping failed, default to 0
    if (index === -1) index = 0;

    setSelectedIndex(index);
  }, [route?.params?.mood, meditationScenarios]);

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

    // Reset playback when meditation type changes
    setIsPlaying(false);
    setProgress(0);
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

  // Control background audio based on `isPlaying` and `mute`
  useEffect(() => {
    if (isPlaying && !mute) {
      toggleBackground(true);
    } else {
      toggleBackground(false);
    }
  }, [isPlaying, mute, toggleBackground]);

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

      // New Workflow: If we don't have an instance ID, create one
      if (!activityIdToStart) {
        if (packContext?.packId) {
          console.log("Meditation - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
            contentId: cognitivePracticeId!,
          });
          activityIdToStart = newActivity.id;
        } else {
          console.log("Meditation - Creating Activity via POST (Standalone)");
          if (!cognitivePracticeId || selectedIndex === null) {
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

          const newActivity = await createPracticeActivity({
            sessionId: sessionToUse.id,
            contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
            contentId: cognitivePracticeId,
          });
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

      setCurrentActivityId(activityIdToStart);
    } catch (e) {
      console.error("Failed to start activity", e);
      triggerToast(
        "error",
        "Failed to Start",
        "We couldn't start this exercise. Please try again later.",
      );
    }
  };

  const markActivityComplete = async () => {
    console.log("markActivityComplete [Meditation] called", {
      currentActivityId,
      practiceSession: practiceSession?.id,
      packContext,
      selectedIndex,
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
      console.error("Missing userId for activity complete");
      return;
    }

    try {
      console.log("Completing activity...", { id: currentActivityId, userId });
      const completedActivity = await completePracticeActivity({
        id: currentActivityId,
        userId: userId,
        packId: packContext?.packId,
        moduleId: packContext?.moduleId,
      });

      console.log("Activity COMPLETED:", completedActivity);

      updateActivity(currentActivityId, {
        ...completedActivity,
        cognitivePractice: meditationScenarios[selectedIndex],
      });
    } catch (e) {
      console.error("Failed to complete activity", e);
      triggerToast(
        "error",
        "Save Failed",
        "We couldn't save your progress. Please try again.",
      );
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
            // mark activity complete
            markActivityComplete();
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
  }, [isPlaying, TOTAL_SESSION_SECONDS]);

  const [isStarted, setIsStarted] = useState(false);

  // ... (previous state variables remain if needed)

  const handleStart = async () => {
    await markActivityStart();
    setIsStarted(true);
    setIsPlaying(true);
    setProgress(0);
  };

  const handleComplete = async () => {
    setIsPlaying(false);
    await markActivityComplete();
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
            onPress={handleComplete}
          />
        </View>
      </View>
    );
  }

  if (isDone) {
    return <DonePractice practiceName="meditation" />;
  }

  return (
    <>
      <ScreenView style={styles.screenView}>
        <View style={styles.container}>
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
            <Text style={styles.headerTitle}>Guided Meditation</Text>
            <View style={{ width: 32 }} />
          </View>

          <CustomScrollView contentContainerStyle={styles.scrollContainer}>
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
                {/* Header Banner */}
                <View style={styles.noteHeaderBanner}>
                  <LinearGradient
                    colors={["#EEF2FF", "#E0E7FF", "#C7D2FE"]} // Soft Indigo
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  {/* Decorative Elements */}
                  <View style={styles.bannerBubbleLeft} />
                  <View style={styles.bannerBubbleRight} />

                  <View style={styles.noteHeaderTextContainer}>
                    <View style={styles.bannerChip}>
                      <Icon name="lightbulb" size={10} color="#4338CA" />
                      <Text style={styles.bannerChipText}>PREPARATION</Text>
                    </View>
                    <Text
                      style={[styles.noteHeaderTitle, { color: "#312E81" }]}
                    >
                      Tips
                    </Text>
                    <Text
                      style={[styles.noteHeaderSubtitle, { color: "#4338CA" }]}
                    >
                      Before you start
                    </Text>
                  </View>
                  <TherapistFace size={80} />
                </View>

                {/* Masonry Tips Grid */}
                {selectedIndex !== null &&
                meditationScenarios[selectedIndex]?.guidedMeditationData
                  ?.tips ? (
                  <MasonryTips
                    tips={
                      meditationScenarios[selectedIndex]?.guidedMeditationData
                        ?.tips || []
                    }
                  />
                ) : null}
              </View>

              {/* Start Button */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleStart}
                style={[
                  styles.startButton,
                  { marginHorizontal: 20, marginTop: 20 },
                ]}
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
                  <Icon name="arrow-right" size={16} color="#FFF" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          </CustomScrollView>
        </View>
      </ScreenView>

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
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
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24, // Matched others
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
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
    paddingBottom: 120,
    flexGrow: 1,
  },

  tipsContainer: {
    paddingHorizontal: 0,
    gap: 0,
  },
  noteHeaderBanner: {
    marginHorizontal: 0,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 32,
    height: 140, // taller banner
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
    // Subtler border
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  bannerBubbleLeft: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  bannerBubbleRight: {
    position: "absolute",
    top: -60,
    right: 40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  noteHeaderTextContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
    zIndex: 2,
  },
  bannerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  bannerChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4338CA",
    letterSpacing: 0.5,
  },
  noteHeaderTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 28,
    fontWeight: "800",
    color: "#312E81",
  },
  noteHeaderSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "#4338CA",
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
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1", // Lighter handle
    marginBottom: 24,
    opacity: 0.6,
    alignSelf: "center", // Keep handle centered
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
});
