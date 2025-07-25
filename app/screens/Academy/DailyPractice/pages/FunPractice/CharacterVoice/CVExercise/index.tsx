import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../../components/ScreenView";
import { theme } from "../../../../../../../Theme/tokens";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { CharacterVoiceFDPStackParamList } from "../../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/CharacterVoicePracticeStack/types";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";

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
    if (!practiceSession) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.FUN_PRACTICE,
      contentId: id,
    });
    const startedActivity = await startPracticeActivity({
      id: newActivity.id,
      userId: practiceSession.user.id,
    });
    addActivity({
      ...startedActivity,
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
    const t = cvData.texts;
    console.log("cvData", { cvData });
    setTexts(t);
  }, []);

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>Character Voice</Text>
          </TouchableOpacity>
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          {isDone ? (
            <DonePractice />
          ) : (
            <>
              <View style={styles.tipsContainer}>
                <View style={styles.tipTitleContainer}>
                  <Icon
                    solid
                    name="lightbulb"
                    size={16}
                    color={theme.colors.text.title}
                  />
                  <Text style={styles.tipTitleText}>Tips</Text>
                </View>
                <View style={styles.tipListContainer}>
                  {cvData.hints.map((hint) => (
                    <View key={hint} style={styles.tipCard}>
                      <Icon
                        solid
                        name="check-circle"
                        size={16}
                        color={theme.colors.library.orange[400]}
                      />
                      <Text style={styles.tipText}>{hint}</Text>
                    </View>
                  ))}
                </View>
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
                <Button text="Start Practice" onPress={markActivityStart} />
              )}

              {!!voiceRecordingUri && (
                <Button text="Mark Complete" onPress={onDonePress} />
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
  },
  container: {
    flex: 1,
    gap: 32,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 20,
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
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
    padding: 16,
    gap: 16,
  },
  tipTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tipTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
  },
  tipListContainer: {
    gap: 12,
  },
  tipCard: {
    backgroundColor: theme.colors.surface.elevated,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tipText: {
    flexShrink: 1,
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
