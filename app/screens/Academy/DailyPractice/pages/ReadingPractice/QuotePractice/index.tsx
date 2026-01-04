import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../../../../components/ScreenView";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  RDPStackNavigationProp,
  RDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ReadingPracticeStack/types";
import DonePractice from "../../../components/DonePractice";
import SpeechTools from "../../../components/SpeechTools";
import MasonryTips from "../../../components/MasonryTips";

import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import Metronome from "../../../../Library/TechniquePage/components/Metronome";
import Button from "../../../../../../components/Button";
import {
  ReadingPractice,
  ReadingPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { DAFTool } from "../../../../Tools/DAF";
import VoiceRecorder from "../../../../Library/TechniquePage/components/VoiceRecorder";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import {
  completePracticeActivity,
  createPracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useUserStore } from "../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { readingTips } from "../data";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";

const QuotePractice = () => {
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allQuotes, setAllQuotes] = useState<ReadingPractice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const [selectedPracticeTool, setSelectedPracticeTool] = useState("");
  const renderSelectedTool = (toolName: string) => {
    switch (toolName) {
      case "DAF":
        return <DAFTool />;
      case "Voicehover":
        return <VoiceHover text={allQuotes[selectedIndex].textContent || ""} />;
      case "Metronome":
        return <Metronome />;
      default:
        return null;
    }
  };

  const toggleIndex = () => {
    if (allQuotes && allQuotes.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allQuotes.length);
    }
  };

  const onBackPress = () => {
    navigation.goBack();
  };

  const markActivityStart = async () => {
    if (!practiceSession) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      contentId: allQuotes[selectedIndex]?.id,
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
      setPracticeComplete(true);
    } catch (error) {
      console.error("❌ Failed to mark the activity complete:", error);
    }
  };

  useEffect(() => {
    const fetchAllStories = async () => {
      const q = await getReadingPracticeByType(ReadingPracticeType.QUOTE);
      setAllQuotes(q);
    };
    fetchAllStories();
  }, []);

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quote</Text>
          <View style={{ width: 32 }} />
        </View>
        {practiceComplete ? (
          <DonePractice />
        ) : currentActivityId ? (
          <CustomScrollView contentContainerStyle={styles.scrollContainer}>
            <SpeechTools
              onToolSelect={(toolName) => {
                setSelectedPracticeTool(toolName);
              }}
            />
            <View style={styles.activityContainer}>
              <View style={styles.quoteContainer}>
                <View style={styles.quoteIconContainer}>
                  <Icon
                    name="quote-right"
                    size={24}
                    color={theme.colors.actionPrimary.default}
                  />
                </View>
                <Text style={styles.quoteText}>
                  {allQuotes[selectedIndex]?.textContent}
                </Text>
                <Text style={styles.quoteAuthor}>
                  {allQuotes[selectedIndex]?.author}
                </Text>
              </View>
              {renderSelectedTool(selectedPracticeTool)}
              <VoiceRecorder
                onToggle={toggleIndex}
                onRecorded={(uri) => {
                  setVoiceRecordingUri(uri);
                }}
              />
            </View>
            {!!voiceRecordingUri && (
              <Button
                text="Mark Complete"
                onPress={async () => {
                  setIsLoading(true);
                  try {
                    await onDonePress();
                    // setIsDone(true);
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
              />
            )}
          </CustomScrollView>
        ) : (
          <CustomScrollView
            contentContainerStyle={{ paddingHorizontal: 0, paddingBottom: 120 }}
          >
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
                <Text style={styles.noteHeaderSubtitle}>Before you start</Text>
              </View>
              <TherapistFace size={72} />
            </View>

            {/* Masonry Tips Grid */}
            <MasonryTips tips={readingTips.quote} />

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
          </CustomScrollView>
        )}
      </View>
    </ScreenView>
  );
};

export default QuotePractice;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  scrollContainer: {
    gap: 32,
    padding: SHADOW_BUFFER,
    paddingBottom: 120,
    flexGrow: 1,
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
  activityContainer: {
    padding: 24,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  quoteContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  quoteIconContainer: {
    height: 64,
    width: 64,
    borderRadius: "50%",
    backgroundColor: theme.colors.surface.default,
    justifyContent: "center",
    alignItems: "center",
  },
  quoteText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  quoteAuthor: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
  },
  noteHeaderBanner: {
    marginHorizontal: 20,
    marginTop: 20,
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
  note3DIcon: {
    width: 60,
    height: 70, // skewed aspect for "3D" feel
    backgroundColor: "#FFE4E6", // Placeholder for actual 3D image base
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-10deg" }, { skewY: "-5deg" }], // Mock 3D feel
    shadowColor: "#881337",
    shadowOffset: { width: 5, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 0, // Sharp shadow for "cartoon" 3D
    borderWidth: 1,
    borderColor: "#FFF",
  },
  tipsScroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
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
});
