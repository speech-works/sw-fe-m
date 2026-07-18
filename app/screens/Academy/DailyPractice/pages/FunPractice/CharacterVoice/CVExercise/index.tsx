import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
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
  useTheme,
  spacing,
} from "../../../../../../../design-system";
import { useMarkActivityStart } from "../../../../../../../hooks/useMarkActivityStart";
import { useConfirmOnExit } from "../../../../../../../hooks/useConfirmOnExit";
import DonePractice from "../../../../components/DonePractice";

import SmartRecorder from "../../../ReadingPractice/StoryPractice/components/SmartRecorder";
import { ReadingStage } from "../../../ReadingPractice/shared/ReadingStage";

const CVExercise = () => {
  const navigation =
    useNavigation<CharacterVoiceFDPStackNavigationProp<"CVExercise">>();
  const { colors } = useTheme();
  // Character Voice = the "purple" accent from the Fun Practice list; the whole
  // practice inherits that identity (stage, dock, tips, save + done screens).
  const accentColor = colors.accent.purple;
  const onAccentColor = colors.accentOn.purple;
  const route =
    useRoute<RouteProp<CharacterVoiceFDPStackParamList, "CVExercise">>();
  const { id, name, cvData, packContext, practiceActivity, from } = route.params;

  const [, setLoading] = React.useState(
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
  const [, setIsLoading] = useState(false);
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
 // Space for the dock

  // --- Confirm-on-exit: prompt to save/discard if leaving mid-practice ---
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: currentActivityId,
    isCompleted: isDone,
    onSave: onDonePress,
    accentColor,
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
        accentColor={accentColor}
        onAccentColor={onAccentColor}
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
            style={isStarting ? undefined : { backgroundColor: accentColor }}
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
                    { backgroundColor: accentColor },
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

  // 2. Active Practice View — the shared "Clean Focus" reading stage (purple accent).
  return (
    <>
      <ReadingStage
        title="Voice Practice"
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.goBack()
        }
        category="VOICE"
        accent={accentColor}
        onNext={toggleIndex}
        dock={
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
            accentColor={accentColor}
            onAccentColor={onAccentColor}
          />
        }
      >
        <View style={styles.readingBlock}>
          <View style={styles.charHead}>
            <Text variant="h2" color="primary" center>
              {effectiveName}
            </Text>
            <AudioPlaybackButton
              audioUrl={effectiveCvData?.exampleAudioUrl}
              iconSize={14}
              activeColor={accentColor}
              style={[
                styles.playbackButton,
                { backgroundColor: colors.surface.control },
              ]}
            />
          </View>
          <Text variant="h2" color="primary" style={styles.readingText}>
            {texts[currentIndex]}
          </Text>
        </View>
      </ReadingStage>

      {exitSheet}
    </>
  );
};

export default CVExercise;

const styles = StyleSheet.create({
  readingBlock: {
    width: "100%",
    alignItems: "center",
    gap: spacing["2xl"],
  },
  charHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  // Card Styles
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
