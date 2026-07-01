import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomScrollView from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import {
  CharacterVoiceFDPStackNavigationProp,
  CharacterVoiceFDPStackParamList,
} from "../../../../../../../navigators/stacks/ExploreStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";
import { getFunPracticeById } from "../../../../../../../api/dailyPractice";

import {
  completePracticeActivity,
} from "../../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../../api/practiceActivities/types";
import { RecordingSourceType } from "../../../../../../../api/recordings/types";
import AudioPlaybackButton from "../../../../../../../components/AudioPlaybackButton";
import { useRecordedVoice } from "../../../../../../../hooks/useRecordedVoice";
import { useActivityStore } from "../../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../../stores/session";
import { useUserStore } from "../../../../../../../stores/user";
import {
  Page,
  Button,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  radius,
} from "../../../../../../../design-system";
import { useMarkActivityStart } from "../../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../../hooks/useConfirmOnExit";
import DonePractice from "../../../../components/DonePractice";

import SmartRecorder from "../../../ReadingPractice/StoryPractice/components/SmartRecorder";

const CVExercise = () => {
  const navigation =
    useNavigation<CharacterVoiceFDPStackNavigationProp<"CVExercise">>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const HEADER_HEIGHT = 60;
  const route =
    useRoute<RouteProp<CharacterVoiceFDPStackParamList, "CVExercise">>();
  const { id, name, cvData, packContext, practiceActivity, from } = route.params;

  const [loading, setLoading] = React.useState(
    !cvData && !practiceActivity?.funPractice?.characterVoiceData,
  );
  const [data, setData] = React.useState({
    name: name || practiceActivity?.funPractice?.name,
    cvData: cvData || practiceActivity?.funPractice?.characterVoiceData,
  });

  React.useEffect(() => {
    if (!data.cvData && id) {
      const fetchCV = async () => {
        try {
          const funPractice = await getFunPracticeById(id);
          if (funPractice.characterVoiceData) {
            setData({
              name: funPractice.name,
              cvData: funPractice.characterVoiceData,
            });
          }
        } catch (err) {
          console.error("Failed to fetch character voice", err);
        } finally {
          setLoading(false);
        }
      };
      void fetchCV();
    }
  }, [id]);

  const effectiveCvData = data.cvData;
  const effectiveName = data.name;
  const effectiveId = id || practiceActivity?.funPractice?.id;

  const { updateActivity, doesActivityExist } = useActivityStore();
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
    null,
  );

  const toggleIndex = () => {
    if (texts && texts.length > 0) {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }
  };

  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.FUN_PRACTICE,
    contentId: effectiveId,
    initialActivity: practiceActivity,
    packContext,
    currentActivityId,
    setActivityId: setCurrentActivityId,
    navigation,
    logTag: "CVExercise",
    // CVExercise historically does not emit ACTIVITY_STARTED analytics.
    trackStart: false,
  });

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

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: isDone,
    onSave: onDonePress,
    family: "Fun",
    from,
    packContext,
  });

  if (isDone) {
    return (
      <DonePractice
        activityId={currentActivityId ?? undefined}
        contentType={PracticeActivityContentType.FUN_PRACTICE}
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
        from={from}
      />
    );
  }

  // 1. Pre-Practice (Tips) View — DETAIL recipe on the dark canvas.
  if (!currentActivityId) {
    const tipsArray = effectiveCvData?.hints || [
      "Get into character and have fun.",
      "Vary your pitch and tone.",
      "Don't hold back, be expressive!",
    ];

    return (
      <Page
        title="Character Voice"
        description="Express yourself by adopting fun personas and practicing different vocal styles."
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        footer={
          <Button
            label="Start Practice"
            onPress={async () => {
              setIsStarting(true);
              try {
                await markActivityStart();
              } finally {
                setIsStarting(false);
              }
            }}
            loading={isStarting}
            disabled={isStarting}
          />
        }
      >
        {/* Tips — a dot timeline on the dark canvas. */}
        <View>
          <Text variant="h3" color="primary" style={styles.tipsHeading}>
            Tips
          </Text>
          {tipsArray.map((tip, index, arr) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.tipTrack}>
                <View
                  style={[
                    styles.tipDot,
                    { backgroundColor: colors.action.primary },
                  ]}
                />
                {index !== arr.length - 1 && (
                  <View
                    style={[
                      styles.tipLine,
                      { backgroundColor: colors.border.default },
                    ]}
                  />
                )}
              </View>
              <Text variant="body" color="secondary" style={styles.tipText}>
                {tip}
              </Text>
            </View>
          ))}
        </View>
      </Page>
    );
  }

  // 2. Active Practice View — re-themed to the dark canvas (exercise logic intact).
  return (
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <View style={styles.container}>
        <View
          style={[
            styles.topNavigationContainer,
            {
              paddingTop: insets.top + 10,
              height: HEADER_HEIGHT + insets.top,
              backgroundColor: colors.background.canvas,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() =>
              from === "MOOD_CHECK"
                ? navigation.navigate("Root" as any, { screen: "HOME" })
                : navigation.goBack()
            }
            style={[
              styles.backButton,
              { backgroundColor: colors.surface.control },
            ]}
          >
            <Icon name="chevron-left" size={16} color={colors.text.primary} />
          </TouchableOpacity>
          <Text variant="h3" color="primary">
            Voice Practice
          </Text>
          <View style={{ width: 32 }} />
        </View>

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
            <View
              style={[
                styles.cardContainer,
                { backgroundColor: colors.surface.default },
              ]}
            >
              {/* 1. Accent Header (solid) */}
              <View
                style={[
                  styles.cardHeader,
                  { backgroundColor: colors.accent.purple },
                ]}
              >
                <View style={styles.headerTopRow}>
                  <View
                    style={[
                      styles.categoryPill,
                      { backgroundColor: colors.surface.default },
                    ]}
                  >
                    <Icon
                      name={icons.voiceTool}
                      size={12}
                      color={colors.text.primary}
                    />
                    <Text variant="label" color="primary">
                      VOICE
                    </Text>
                  </View>

                  {/* Next Button */}
                  <TouchableOpacity
                    onPress={toggleIndex}
                    style={[
                      styles.nextButton,
                      { backgroundColor: colors.surface.default },
                    ]}
                  >
                    <Text variant="label" color="primary">
                      Next
                    </Text>
                    <Icon
                      name={icons.chevronRight}
                      size={12}
                      color={colors.text.primary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.titleContainer}>
                  <Text
                    variant="h2"
                    color={colors.accentOn.purple}
                    style={styles.articleTitle}
                  >
                    {effectiveName}
                  </Text>
                  <AudioPlaybackButton
                    audioUrl={effectiveCvData?.exampleAudioUrl}
                    iconSize={14}
                    activeColor={colors.accentOn.purple}
                    style={[
                      styles.playbackButton,
                      { backgroundColor: colors.surface.default },
                    ]}
                  />
                </View>

                {/* Watermark */}
                <View style={styles.headerWatermark} pointerEvents="none">
                  <Icon
                    name={icons.voiceTool}
                    size={96}
                    color={colors.accentOn.purple}
                  />
                </View>
              </View>

              {/* 2. Sheet Content */}
              <View
                style={[
                  styles.cardBodySheet,
                  { backgroundColor: colors.surface.default },
                ]}
              >
                {/* Internal Watermark — server-driven character glyph (FontAwesome). */}
                <View style={styles.sheetWatermarkContainer} pointerEvents="none">
                  <FAIcon
                    name={effectiveCvData?.icon || "user"}
                    size={120}
                    color={colors.surface.control}
                  />
                </View>

                <View style={styles.textArea}>
                  <Text variant="h2" color="primary" style={styles.readingText}>
                    {texts[currentIndex]}
                  </Text>
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

      {exitSheet}
    </ScreenView>
  );
};

export default CVExercise;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing["2xl"],
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
    paddingHorizontal: spacing["2xl"],
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // Card Styles
  cardContainer: {
    borderRadius: 32,
    overflow: "hidden", // Clip the sheet
    minHeight: 450,
  },
  cardHeader: {
    padding: spacing["2xl"],
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
    gap: spacing.xs,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.chip,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.chip,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing["2xl"],
    gap: spacing.md,
    zIndex: 1,
  },
  articleTitle: {
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
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -40, // Overlap
    padding: spacing["2xl"],
    paddingBottom: spacing["4xl"],
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
    marginTop: spacing.lg,
    alignItems: "center",
    zIndex: 1,
  },
  playbackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    padding: 0, // Override default padding
  },
  readingText: {
    lineHeight: 36,
    textAlign: "center",
  },
  // Recorder Dock
  actionDockWrapper: {},
  // Pre-practice tips (dark)
  tipsHeading: {
    marginBottom: spacing.lg,
  },
  tipRow: {
    flexDirection: "row",
  },
  tipTrack: {
    alignItems: "center",
    width: 20,
    marginRight: spacing.lg,
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
    paddingBottom: spacing["2xl"],
    lineHeight: 24,
  },
});
