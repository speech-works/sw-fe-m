import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
import { useActivityStore } from "../../../../../../stores/activity";
import { createPracticeActivity } from "../../../../../../api";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { MoodType } from "../../../../../../api/moodCheck/types";
import DonePractice from "../../../components/DonePractice";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";

const Meditation = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<MoodFUStackParamList, "MeditationPractice">>();

  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  // Mute toggle for both background and hover audio
  const [mute, setMute] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // All fetched meditation scenarios
  const [meditationScenarios, setMeditationScenarios] = useState<
    CognitivePractice[]
  >([]);
  const [cognitivePracticeId, setCognitivePracticeId] = useState<string | null>(
    null
  );

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
        CognitivePracticeType.GUIDED_MEDITATION
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

  const handleStartCompleteExercise = async () => {
    if (isPlaying) {
      // If currently playing, "Complete Exercise" button was pressed
      setIsPlaying(false);
      setProgress(0); // Reset progress on completion
      await markActivityComplete();
      setIsDone(true);
    } else {
      // If not playing, "Start Exercise" button was pressed
      await markActivityStart();
      setIsPlaying(true);
      if (progress === TOTAL_SESSION_SECONDS) {
        // If session was completed, restart from 0
        setProgress(0);
      }
    }
  };

  const markActivityStart = async () => {
    if (!practiceSession || !cognitivePracticeId) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.COGNITIVE_PRACTICE,
      contentId: cognitivePracticeId,
    });
    setCurrentActivityId(newActivity.id);
    const startedActivity = await startPracticeActivity({
      id: newActivity.id,
      userId: practiceSession.user.id,
    });
    addActivity({
      ...startedActivity,
    });
  };

  const markActivityComplete = async () => {
    if (
      !practiceSession ||
      !currentActivityId ||
      !doesActivityExist(currentActivityId)
    )
      return;
    const completedActivity = await completePracticeActivity({
      id: currentActivityId,
      userId: practiceSession.user.id,
    });
    updateActivity(currentActivityId, {
      ...completedActivity,
    });
  };

  const minutes = Math.floor(progress / 60);
  const seconds = progress % 60;
  const progressText = `${minutes}/${TOTAL_SESSION_SECONDS / 60} minutes`;

  return (
    <>
      <VoiceHoverPlayer
        voiceHoverUrl={voiceHoverUrl}
        mute={mute}
        hoverVolume={hoverVolume}
        isPlaying={isPlaying}
        playbackRatePercent={-20}
      />

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
            {!isDone ? (
              <TouchableOpacity
                onPress={() => {
                  setMute((old) => !old);
                }}
              >
                <Icon
                  name={mute ? "volume-mute" : "volume-up"}
                  size={16}
                  color={theme.colors.actionPrimary.default}
                />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 16 }} />
            )}
          </View>
          <CustomScrollView contentContainerStyle={styles.scrollContainer}>
            {isDone ? (
              <DonePractice />
            ) : (
              <>
                {selectedIndex !== null &&
                  meditationScenarios[selectedIndex] && (
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
                <View style={styles.progressContainer}>
                  <View style={styles.progressTitle}>
                    <Text style={styles.progressTitleText}>
                      Session Progress
                    </Text>
                    <Text style={styles.progressDescText}>{progressText}</Text>
                  </View>
                  <ProgressBar
                    currentStep={progress}
                    totalSteps={TOTAL_SESSION_SECONDS}
                    showStepIndicator={false}
                    showPercentage={false}
                  />
                </View>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleStartCompleteExercise}
                  style={[
                    styles.startButton,
                    { marginHorizontal: 20, marginTop: 0 }, // Reduced marginTop as grid handles padding
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
                    <Text style={styles.startButtonText}>
                      {isPlaying ? "Complete Exercise" : "Start Exercise"}
                    </Text>
                    <Icon name="arrow-right" size={16} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </CustomScrollView>
        </View>
      </ScreenView>

      <BottomSheetModal
        visible={isVisible}
        onClose={closeModal}
        maxHeight="80%"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>Meditation Library</Text>
            <Text style={styles.modalDescText}>
              Select a scenario to meditate in
            </Text>
          </View>

          <CustomScrollView
            style={styles.scrollView}
            nestedScrollEnabled={true}
            contentContainerStyle={styles.scrollContainer2}
          >
            {selectedIndex !== null &&
              meditationScenarios.map((med, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.medCard,
                    meditationScenarios[selectedIndex]?.name === med.name &&
                      styles.selectedMedCard,
                  ]}
                  onPress={() => {
                    setSelectedIndex(index);
                    closeModal();
                  }}
                >
                  <View
                    style={[styles.medIconContainer, styles.medIconContainer2]}
                  >
                    <Icon
                      solid
                      name={med.guidedMeditationData?.icon!}
                      size={24}
                      color={theme.colors.actionPrimary.default}
                    />
                  </View>
                  <View style={styles.medDescContainer}>
                    <Text
                      style={[
                        styles.medNameText,
                        meditationScenarios[selectedIndex]?.name === med.name &&
                          styles.selectedCardText,
                      ]}
                    >
                      {med.name}
                    </Text>
                    <Text
                      style={[
                        styles.medDetailText,
                        meditationScenarios[selectedIndex]?.name === med.name &&
                          styles.selectedCardText,
                      ]}
                    >
                      {med.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
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
  modalTitleContainer: {
    gap: 12,
    alignItems: "center",
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1, // ← valid because the parent Animated.View has a fixed height
    flexDirection: "column",
    gap: 32,
  },
  scrollView: {
    flex: 1, // ← forces ScrollView to fill all vertical space under the title
    padding: 4,
  },
  scrollContainer2: {
    gap: 16,
    alignItems: "center",
    paddingBottom: 32,
    // NO flex:1 here—let content size itself
  },

  medCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  selectedMedCard: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  selectedCardText: {
    color: theme.colors.text.onDark,
    fontWeight: "600",
  },
  medIconContainer: {
    height: 40,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.surface.default,
  },
  medIconContainer2: {
    height: 40,
    width: 40,
  },
  medDescContainer: {
    gap: 4,
    flexShrink: 1,
  },
  medNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  medDetailText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
