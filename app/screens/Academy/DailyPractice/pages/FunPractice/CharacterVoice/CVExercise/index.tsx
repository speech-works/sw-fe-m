// FORCE REFRESH BUNDLER - SYSTEM SYNC 1
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
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
import TherapistFace from "../../../../../../../assets/sw-faces/TherapistFace";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import {
  CharacterVoiceFDPStackNavigationProp,
  CharacterVoiceFDPStackParamList,
} from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";
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
  const navigation =
    useNavigation<CharacterVoiceFDPStackNavigationProp<"CVExercise">>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const route =
    useRoute<RouteProp<CharacterVoiceFDPStackParamList, "CVExercise">>();
  const { id, name, cvData, packContext, practiceActivity } = route.params;

  const effectiveCvData =
    cvData || practiceActivity?.funPractice?.characterVoiceData;
  const effectiveName = name || practiceActivity?.funPractice?.name;
  const effectiveId = id || practiceActivity?.funPractice?.id;

  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession, setSession, ensureActiveSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  const [isDone, setIsDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [texts, setTexts] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(6);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null,
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
        sessionToUse = await ensureActiveSession(user.id);
        setSession(sessionToUse);
      } catch (err) {
        console.error("Failed to ensure session", err);
        return;
      }
    }

    if (!isPackContext && !sessionToUse) {
      console.error("❌ practiceSession or packContext is undefined.");
      return;
    }

    try {
      const sessionId = isPackContext ? undefined : sessionToUse!.id;
      const userId = isPackContext
        ? user?.id
        : (sessionToUse!.user?.id ?? user?.id);

      if (!userId) {
        console.error("Missing userId");
        return;
      }

      let activityIdToStart = currentActivityId || practiceActivity?.id;

      // If we don't have a unique activity ID yet, create one (Standalone mode)
      if (!activityIdToStart) {
        if (!effectiveId) {
          console.error("CVExercise - Missing effectiveId, cannot create activity");
          return;
        }

        if (isPackContext) {
          console.log("CVExercise - Creating Activity via POST (Pack)");
          const newActivity = await createPracticeActivityFromPack({
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            contentType: PracticeActivityContentType.FUN_PRACTICE,
            contentId: effectiveId,
          });
          activityIdToStart = newActivity.id;
        } else {
          if (!sessionId)
            throw new Error("No session ID for standalone activity");
          console.log("CVExercise - Creating Activity via POST (Standalone)");
          let newActivity;
          try {
            newActivity = await createPracticeActivity({
              sessionId,
              contentType: PracticeActivityContentType.FUN_PRACTICE,
              contentId: effectiveId,
            });
          } catch (createErr: any) {
            if (createErr?.response?.status === 404 && createErr?.response?.data?.error?.toLowerCase().includes("session")) {
              console.log(">> CVExercise: Stale session detected (404), refreshing...");
              sessionToUse = await ensureActiveSession(userId, true);
              newActivity = await createPracticeActivity({
                sessionId: sessionToUse.id,
                contentType: PracticeActivityContentType.FUN_PRACTICE,
                contentId: effectiveId,
              });
            } else {
              throw createErr;
            }
          }
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
      useUserStore.getState().fetchUser();
      setCurrentActivityId(activityIdToStart);
    } catch (error) {
      console.error("❌ Failed to start activity:", error);
    }
  };

  const markActivityComplete = async (activityId: string) => {
    if ((!practiceSession && !packContext) || !doesActivityExist(activityId))
      return;

    const userId = packContext
      ? user?.id
      : (practiceSession?.user?.id ?? user?.id);

    if (!userId) {
      console.warn(">> CVExercise: Missing userId, cannot complete activity");
      return;
    }

    const completedActivity = await completePracticeActivity({
      id: activityId,
      userId,
      packId: packContext?.packId,
      moduleId: packContext?.moduleId,
    });
    updateActivity(activityId, {
      ...completedActivity,
    });
    useUserStore.getState().fetchUser();

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
    if (effectiveCvData?.texts) {
      setTexts(effectiveCvData.texts);
    }
  }, [effectiveCvData]);

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
            : () => navigation.goBack()
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
          <BlurView
            intensity={80}
            tint="light"
            style={[
              styles.topNavigationContainer,
              {
                paddingTop: insets.top + 10,
                height: HEADER_HEIGHT + insets.top,
              },
            ]}
          >
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
          </BlurView>

          <View style={styles.container}>
            <ScrollView
              key="tips-scroll"
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: HEADER_HEIGHT + insets.top + 20,
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.noteHeaderBanner}>
                <LinearGradient
                  colors={["#FFE4E6", "#FFEDD5"]}
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

              <MasonryTips tips={effectiveCvData?.hints || []} />
            </ScrollView>

            {/* Fixed Start Button at bottom */}
            <View
              style={[
                styles.bottomActionContainer,
                { paddingBottom: insets.bottom || 24 },
              ]}
            >
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
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
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
        <BlurView
          intensity={80}
          tint="light"
          style={[
            styles.topNavigationContainer,
            { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
          ]}
        >
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
        </BlurView>

        <View style={styles.container}>
          <CustomScrollView
            key="practice-scroll"
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: HEADER_HEIGHT + insets.top + 10,
                paddingBottom: bottomPadding,
              },
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
                  <Text style={styles.articleTitle}>{effectiveName}</Text>
                  <AudioPlaybackButton
                    audioUrl={effectiveCvData?.exampleAudioUrl}
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
                    name={effectiveCvData?.icon || "user"}
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
    paddingVertical: SHADOW_BUFFER,
    paddingHorizontal: 24,
    // Bottom padding inserted dynamically via style prop
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
    padding: 24,
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
  // Recorder Dock
  actionDockWrapper: {},
  bottomActionContainer: {
    paddingHorizontal: 24,
  },
});
