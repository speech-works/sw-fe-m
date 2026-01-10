import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { theme } from "../../../../../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import TherapistFace from "../../../../../../../assets/sw-faces/TherapistFace";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { CharacterVoiceFDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";

import MasonryTips from "../../../../components/MasonryTips";
import Button from "../../../../../../../components/Button";
import DonePractice from "../../../../components/DonePractice";
import AudioPlaybackButton from "../../../../../../../components/AudioPlaybackButton";
import VoiceRecorder from "../../../../../Library/TechniquePage/components/VoiceRecorder";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import {
  completePracticeActivity,
  createPracticeActivity,
  startPracticeActivity,
} from "../../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { useUserStore } from "../../../../../../../stores/user";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";

const CVExercise = () => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<CharacterVoiceFDPStackParamList, "CVExercise">>();
  const { id, name, cvData } = route.params;
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [texts, setTexts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(6);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  const toggleIndex = () => {
    if (texts && texts.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }
  };

  const markActivityStart = async () => {
    console.log("markActivityStart 1", { practiceSession });

    if (!practiceSession || !practiceSession.user) {
      console.error("❌ practiceSession or practiceSession.user is undefined.");
      return;
    }

    try {
      const newActivity = await createPracticeActivity({
        sessionId: practiceSession.id,
        contentType: PracticeActivityContentType.FUN_PRACTICE,
        contentId: id,
      });
      console.log("markActivityStart 2", { newActivity });

      // Add a log here to confirm code execution
      console.log("Attempting to start practice activity...");
      const startedActivity = await startPracticeActivity({
        id: newActivity.id,
        userId: practiceSession.user.id,
      });
      console.log("markActivityStart 3", { startedActivity });

      addActivity({
        ...startedActivity,
      });
      setCurrentActivityId(newActivity.id);
    } catch (error) {
      console.error("❌ Failed to start activity:", error);
      // You can also trigger a user-facing toast here
      // triggerToast("error", "Failed to start", "Please try again.");
    }
  };

  const markActivityComplete = async (activityId: string) => {
    if (!practiceSession || !doesActivityExist(activityId)) return;
    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId: practiceSession.user.id,
    });
    updateActivity(activityId, {
      ...completedActivity,
    });
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

  return (
    <ScreenView style={styles.screenView}>
      <LinearGradient
        colors={["#FFF7ED", "#FFEDD5", "#FFF"]} // Orange 50 -> Orange 100 -> White
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

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {isDone ? (
            <DonePractice />
          ) : (
            <>
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

                {/* Horizontal Carousel */}
                <MasonryTips tips={cvData.hints} />
              </View>
              {currentActivityId ? (
                <View style={styles.exerciseCard}>
                  <View style={styles.textContainer}>
                    <View style={styles.titleAndSample}>
                      <Text style={styles.titleText}>{name}</Text>
                      <AudioPlaybackButton
                        audioUrl={cvData.exampleAudioUrl}
                        iconSize={16}
                        activeColor={theme.colors.actionPrimary.default}
                        // You can also pass a custom style:
                        // style={{ marginTop: 10 }}
                      />
                    </View>

                    <Text style={styles.actualText}>{texts[currentIndex]}</Text>
                  </View>
                  <VoiceRecorder
                    onToggle={toggleIndex}
                    onRecorded={(uri) => {
                      setVoiceRecordingUri(uri);
                    }}
                  />
                </View>
              ) : (
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
                    <Text style={styles.startButtonText}>Start Practice</Text>
                    <Icon name="arrow-right" size={16} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {!!voiceRecordingUri && (
                <Button
                  text="Mark Complete"
                  onPress={async () => {
                    setIsLoading(true);
                    try {
                      await onDonePress();
                      setIsDone(true);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={isLoading}
                />
              )}
            </>
          )}
        </CustomScrollView>
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
    gap: 32,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 120,
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
  exerciseCard: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 32,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  textContainer: {
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  titleAndSample: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: 600,
  },
  actualText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
    textAlign: "center",
    fontWeight: 400,
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
  tipsScroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
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
});
