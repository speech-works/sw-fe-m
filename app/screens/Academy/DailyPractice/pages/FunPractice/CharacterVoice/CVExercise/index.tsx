import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import TherapistFace from "../../../../../../../assets/sw-faces/TherapistFace";
import CustomScrollView, {
    SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { CharacterVoiceFDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";
import { theme } from "../../../../../../../Theme/tokens";

import {
    completePracticeActivity,
    createPracticeActivity,
    createPracticeActivityFromPack,
    startPracticeActivity,
} from "../../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { createSession } from "../../../../../../../api/practiceSessions";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import AudioPlaybackButton from "../../../../../../../components/AudioPlaybackButton";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { useUserStore } from "../../../../../../../stores/user";
import {
    parseShadowStyle,
    parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import DonePractice from "../../../../components/DonePractice";
import MasonryTips from "../../../../components/MasonryTips";
import SmartRecorder from "../../../ReadingPractice/StoryPractice/components/SmartRecorder";

const CVExercise = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CharacterVoiceFDPStackParamList, "CVExercise">>();
  const { id, name, cvData, packContext } = route.params;
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, setSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [texts, setTexts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(6);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    (route.params as any).practiceActivity?.id || null,
  );

  const toggleIndex = () => {
    if (texts && texts.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }
  };

  const markActivityStart = async () => {
    // If not in a pack and no session, we can't track
    const isPackContext = packContext?.packId;

    let sessionToUse = practiceSession;

    if (!isPackContext && !sessionToUse && user?.id) {
      try {
        sessionToUse = await createSession({ userId: user.id });
        setSession(sessionToUse);
      } catch (err) {
        console.error("Failed to create session", err);
        return;
      }
    }

    if (!isPackContext && !sessionToUse) {
      console.error("❌ practiceSession or packContext is undefined.");
      return;
    }

    try {
      const sessionId = isPackContext ? undefined : sessionToUse!.id;
      const userId = isPackContext ? user?.id : sessionToUse!.user.id;

      if (!userId) {
        console.error("Missing userId");
        return;
      }

      let activityIdToStart = currentActivityId;

      // If we don't have a unique activity ID yet, create one (Standalone mode)
      if (!activityIdToStart) {
        if (isPackContext) {
          console.log("CVExercise - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.FUN_PRACTICE,
            contentId: id,
          });
          activityIdToStart = newActivity.id;
        } else {
          if (!sessionId)
            throw new Error("No session ID for standalone activity");
          console.log("CVExercise - Creating Activity via POST (Standalone)");
          const newActivity = await createPracticeActivity({
            sessionId,
            contentType: PracticeActivityContentType.FUN_PRACTICE,
            contentId: id,
          });
          activityIdToStart = newActivity.id;
        }
      }

      const startedActivity = await startPracticeActivity({
        id: activityIdToStart,
        userId,
      });

      addActivity({
        ...startedActivity,
      });
      setCurrentActivityId(activityIdToStart);
    } catch (error) {
      console.error("❌ Failed to start activity:", error);
    }
  };

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = packContext ? "user" : practiceSession!.user.id;

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
    });
    updateActivity(activityId, {
      ...completedActivity,
    });

    if (packContext && navigation.canGoBack()) {
      navigation.goBack();
    } else if (packContext) {
      navigation.navigate("PackModule", {
        packId: packContext.packId,
        moduleId: packContext.moduleId,
        initialBlockIndex: packContext.blockIndex,
      });
    }
  };

  const onDonePress = async () => {
    try {
      if (!currentActivityId) {
        throw new Error("Activity could not be started");
      }
      await markActivityComplete(currentActivityId);
      await submitVoiceRecording({
        recordingSource: RecordingSourceType.ACTIVITY,
        activityId: currentActivityId,
      });
      setIsDone(true);
    } catch (error) {
      console.error("❌ Failed to mark the activity complete:", error);
    }
  };

  useEffect(() => {
    if (cvData?.texts) {
      setTexts(cvData.texts);
    }
  }, [cvData]);

  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: "none" },
      });
    }
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  // --- Render Helpers ---

  const bottomPadding = 400; // Space for the dock

  if (isDone) {
    return (
      <DonePractice
        practiceName="character voice exercise"
        onDone={
          packContext
            ? () => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate("PackModule", {
                    packId: packContext.packId,
                    moduleId: packContext.moduleId,
                    initialBlockIndex: packContext.blockIndex,
                  });
                }
              }
            : undefined
        }
      />
    );
  }

  // 1. Pre-Practice (Tips) View
  if (!currentActivityId) {
    return (
      <ScreenView style={styles.screenView}>
        <LinearGradient
          colors={["#FFF7ED", "#FFEEF8", "#FFFFFF"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />
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
            <Text style={styles.headerTitle}>Character Voice</Text>
            <View style={{ width: 32 }} />
          </View>

          <CustomScrollView contentContainerStyle={styles.tipsScrollContent}>
            <View style={styles.noteHeaderBanner}>
              <LinearGradient
                colors={["#FFE4E6", "#FFEDD5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.noteHeaderTextContainer}>
                <Text style={styles.noteHeaderTitle}>Tips</Text>
                <Text style={styles.noteHeaderSubtitle}>Before you start</Text>
              </View>
              <TherapistFace size={72} />
            </View>

            <MasonryTips tips={cvData.hints} />

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={async () => {
                setIsStarting(true);
                try {
                  await markActivityStart();
                } finally {
                  setIsStarting(false);
                }
              }}
              disabled={isStarting}
              style={styles.startButton}
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
                <Text style={styles.startButtonText}>Start Practice</Text>
                <Icon name="arrow-right" size={16} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </CustomScrollView>
        </View>
      </ScreenView>
    );
  }

  // 2. Active Practice View
  return (
    <ScreenView style={styles.screenView}>
      <LinearGradient
        colors={["#FFF7ED", "#FFEDD5", "#FFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
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
          <Text style={styles.headerTitle}>Character Voice</Text>
          <View style={{ width: 32 }} />
        </View>

        <CustomScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomPadding },
          ]}
        >
          <View style={styles.cardContainer}>
            {/* 1. Warm Gradient Header */}
            <LinearGradient
              colors={["#2DD4BF", "#0F766E"]} // Teal 400 -> Teal 700 (Matching Character Voice Theme)
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardHeaderGradient}
            >
              <View style={styles.headerTopRow}>
                <View style={styles.categoryPill}>
                  <Icon name="microphone-alt" size={12} color="#115E59" />
                  <Text style={styles.categoryPillText}>VOICE</Text>
                </View>

                {/* Glassy Next Button */}
                <TouchableOpacity
                  onPress={toggleIndex}
                  style={styles.glassButton}
                >
                  <Text style={styles.glassButtonText}>Next</Text>
                  <Icon name="chevron-right" size={12} color="#FFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.articleTitle}>{name}</Text>
                <AudioPlaybackButton
                  audioUrl={cvData.exampleAudioUrl}
                  iconSize={14}
                  activeColor="#FFF"
                  style={styles.playbackButton}
                />
              </View>

              {/* Watermark */}
              <View style={styles.headerWatermark}>
                <Icon
                  name="microphone-alt"
                  size={96}
                  color="rgba(255,255,255,0.15)"
                />
              </View>
            </LinearGradient>

            {/* 2. White Sheet Content */}
            <View style={styles.cardBodySheet}>
              {/* Internal Watermark */}
              <View style={styles.sheetWatermarkContainer}>
                <Icon
                  name={cvData.icon || "user"}
                  size={120}
                  color={theme.colors.library.orange[200]}
                />
              </View>

              <View style={styles.textArea}>
                <Text style={styles.readingText}>{texts[currentIndex]}</Text>
              </View>
            </View>
          </View>
        </CustomScrollView>
      </View>

      {/* Action Dock (Fixed Bottom) */}
      <View style={styles.actionDockWrapper}>
        <SmartRecorder
          onRecorded={setVoiceRecordingUri}
          prevRecordingUri={voiceRecordingUri || undefined}
          onToggle={toggleIndex}
          onSubmit={async () => {
            setIsLoading(true);
            try {
              await onDonePress();
            } finally {
              setIsLoading(false);
            }
          }}
          onDiscard={() => {
            setVoiceRecordingUri(null);
          }}
        />
      </View>
    </ScreenView>
  );
};

export default CVExercise;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  tipsScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 32,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    // Bottom padding inserted dynamically via style prop
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
  // Card Styles
  cardContainer: {
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#FFFFFF",
    overflow: "hidden", // Clip the sheet
    minHeight: 450,
  },
  cardHeaderGradient: {
    padding: 24,
    paddingBottom: 48, // Space for overlap
    position: "relative",
    height: 180,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#115E59",
    letterSpacing: 1,
  },
  glassButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  glassButtonText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontSize: 12,
    color: "#FFF",
    fontWeight: "600",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 12,
    zIndex: 1,
  },
  articleTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFF",
    fontSize: 26,
    zIndex: 1,
  },
  headerWatermark: {
    position: "absolute",
    right: -20,
    bottom: -10,
    opacity: 0.15,
    transform: [{ rotate: "-15deg" }],
  },
  cardBodySheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -40, // Overlap
    padding: 32,
    paddingBottom: 40,
    minHeight: 300,
    alignItems: "center",
    justifyContent: "center", // Center text vertically
  },
  sheetWatermarkContainer: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
    zIndex: 0,
  },
  textArea: {
    marginTop: 16,
    alignItems: "center",
    zIndex: 1,
  },
  playbackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 0, // Override default padding
  },
  readingText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.default,
    lineHeight: 36,
    fontSize: 24,
    textAlign: "center",
  },

  noteHeaderBanner: {
    marginVertical: 20,
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
  tipsScroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  startButton: {
    marginTop: 20,
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
  // Recorder Dock
  actionDockWrapper: {},
});
