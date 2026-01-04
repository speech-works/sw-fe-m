import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import ScreenView from "../../../../../../components/ScreenView";

import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import { theme } from "../../../../../../Theme/tokens";
import { useNavigation } from "@react-navigation/native";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import MasonryTips from "../../../components/MasonryTips";

import Button from "../../../../../../components/Button";
import DonePractice from "../../../components/DonePractice";
import { getFunPracticeByType } from "../../../../../../api/dailyPractice";
import {
  FunPractice,
  FunPracticeType,
} from "../../../../../../api/dailyPractice/types";
import VoiceRecorder from "../../../../Library/TechniquePage/components/VoiceRecorder";
import { useActivityStore } from "../../../../../../stores/activity";
import {
  completePracticeActivity,
  createPracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";

const Twister = () => {
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  const [twisters, setTwisters] = useState<FunPractice[]>([]);
  const [currentIndex, setCurrentIndex] = useState(6);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );
  const [isStarting, setIsStarting] = useState(false);

  const toggleIndex = () => {
    if (twisters && twisters.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % twisters.length);
    }
  };

  const markActivityStart = async () => {
    if (!practiceSession) return;
    if (!twisters || twisters.length === 0 || currentIndex >= twisters.length) {
      console.warn(
        "Cannot start activity: Tongue twisters not yet loaded or invalid index."
      );
      return;
    }
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.FUN_PRACTICE,
      contentId: twisters[currentIndex].id,
    });
    const startedActivity = await startPracticeActivity({
      id: newActivity.id,
      userId: practiceSession.user.id,
    });
    addActivity({
      ...startedActivity,
      funPractice: twisters[currentIndex],
    });
    setCurrentActivityId(newActivity.id);
  };

  const markActivityComplete = async (activityId: string) => {
    if (!practiceSession || !doesActivityExist(activityId)) return;
    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId: practiceSession.user.id,
    });
    updateActivity(activityId, {
      ...completedActivity,
      funPractice: twisters[currentIndex],
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
    const fetchTwisters = async () => {
      const ts = await getFunPracticeByType(FunPracticeType.TONGUE_TWISTER);
      setTwisters(ts);
    };
    fetchTwisters();
  }, []);

  const navigation = useNavigation();
  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
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
          <Text style={styles.headerTitle}>Tongue Twister</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Main content area, excluding the absolutely positioned chevron */}
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
                <MasonryTips
                  tips={twisters[currentIndex]?.tongueTwisterData?.hints || []}
                />
              </View>
              {currentActivityId ? (
                <View style={styles.mainContainer}>
                  <View style={styles.textContainer}>
                    <Text style={styles.titleText}>
                      {twisters[currentIndex]?.name}
                    </Text>
                    <Text style={styles.actualText}>
                      {twisters[currentIndex]?.tongueTwisterData?.text}
                    </Text>
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

export default Twister;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1, // Ensure container takes full height to position absolute children
    gap: 32, // Gap for top navigation and scroll content
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1, // Allow content to grow
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
  tipsContainer: {
    paddingHorizontal: 0,
    gap: 0,
  },
  noteHeaderBanner: {
    marginHorizontal: 0, // Should be aligned with container? Container has padding SHADOW_BUFFER?
    // Wait, scrollContent has padding SHADOW_BUFFER (which is usually small or handled).
    // Let's keep it consistent.
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
  mainContainer: {
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
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  actualText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  recorderContainer: {
    gap: 16,
  },
  recordTipText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
