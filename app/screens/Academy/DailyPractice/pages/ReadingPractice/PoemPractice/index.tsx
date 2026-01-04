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
import MasonryTips from "../../../components/MasonryTips";
import { useNavigation } from "@react-navigation/native";
import {
  RDPStackNavigationProp,
  RDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/ReadingPracticeStack/types";
import DonePractice from "../../../components/DonePractice";
import SpeechTools from "../../../components/SpeechTools";
import PageCounter from "../components/PageCounter";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import Metronome from "../../../../Library/TechniquePage/components/Metronome";
import Button from "../../../../../../components/Button";
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import {
  ReadingPractice,
  ReadingPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { toPascalCase } from "../../../../../../util/functions/strings";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { DAFTool } from "../../../../Tools/DAF";
import { useSessionStore } from "../../../../../../stores/session";
import { useActivityStore } from "../../../../../../stores/activity";
import { createPracticeActivity } from "../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import VoiceRecorder from "../../../../Library/TechniquePage/components/VoiceRecorder";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { useUserStore } from "../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { readingTips } from "../data";
import TherapistFace from "../../../../../../assets/sw-faces/TherapistFace";

const StoryPractice = () => {
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allPoems, setAllPoems] = useState<ReadingPractice[]>([]);
  const onBackPress = () => {
    navigation.goBack();
  };
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // highlightRange = [startIndex, length] for current word, or [-1,0] to clear
  const [highlightRange, setHighlightRange] = useState<[number, number]>([
    -1, 0,
  ]);

  const [selectedPracticeTool, setSelectedPracticeTool] = useState("");
  const renderSelectedTool = (toolName: string) => {
    switch (toolName) {
      case "DAF":
        return <DAFTool />;
      case "Voicehover":
        return (
          <VoiceHover
            text={pages[currentPage] || ""}
            onHighlightChange={(s, l) => setHighlightRange([s, l])}
          />
        );
      case "Metronome":
        return <Metronome />;
      default:
        return null;
    }
  };

  const renderHighlightedText = () => {
    const practiceText = pages[currentPage] || "";
    const [start, length] = highlightRange;
    if (start < 0 || length === 0) {
      return <Text style={styles.readingText}>{practiceText}</Text>;
    }
    const before = practiceText.slice(0, start);
    const word = practiceText.slice(start, start + length);
    const after = practiceText.slice(start + length);

    return (
      <Text style={styles.readingText}>
        {before}
        <Text style={styles.highlight}>{word}</Text>
        {after}
      </Text>
    );
  };

  const splitTextIntoPages = (text: string): string[] => {
    return text
      .split(/\n\s*\n/) // handles \n\n or \n   \n
      .map((section) => section.trim())
      .filter((section) => section.length > 0);
  };

  const toggleIndex = () => {
    if (allPoems && allPoems.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allPoems.length);
    }
  };

  const markActivityStart = async () => {
    if (!practiceSession) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      contentId: allPoems[selectedIndex]?.id,
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
    const currentText = allPoems[selectedIndex]?.textContent || "";
    const paginated = splitTextIntoPages(currentText);
    setPages(paginated);
    setCurrentPage(0);
  }, [selectedIndex, allPoems]);

  useEffect(() => {
    const fetchAllPoems = async () => {
      const p = await getReadingPracticeByType(ReadingPracticeType.POEM);
      setAllPoems(p);
    };
    fetchAllPoems();
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
          <Text style={styles.headerTitle}>Poem</Text>
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
            <View style={styles.readingPageContainer}>
              <PageCounter
                currentPage={currentPage + 1}
                totalPages={pages.length}
              />
              <View style={styles.readingPieceContainer}>
                <View>
                  <Text style={styles.readingPieceTitleText}>
                    {allPoems[selectedIndex]?.title} :{" "}
                    {allPoems[selectedIndex]?.author}
                  </Text>
                  <View style={styles.readingPieceMeta}>
                    <Text style={styles.readingTime}>10 min read</Text>
                    <Text>•</Text>
                    <Text style={styles.readingLevel}>
                      Level: {toPascalCase(allPoems[selectedIndex]?.difficulty)}
                    </Text>
                  </View>
                </View>
                {/* Add Next/Previous buttons */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 16,
                  }}
                >
                  <TouchableOpacity
                    disabled={currentPage === 0}
                    onPress={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 0))
                    }
                  >
                    <Text
                      style={{
                        color:
                          currentPage === 0
                            ? theme.colors.text.default
                            : theme.colors.actionPrimary.default,
                      }}
                    >
                      Previous
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={currentPage >= pages.length - 1}
                    onPress={() =>
                      setCurrentPage((prev) =>
                        Math.min(prev + 1, pages.length - 1)
                      )
                    }
                  >
                    <Text
                      style={{
                        color:
                          currentPage >= pages.length - 1
                            ? theme.colors.text.default
                            : theme.colors.actionPrimary.default,
                      }}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.readingTextContainer}>
                  {renderHighlightedText()}
                </View>
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

            {/* Horizontal Carousel */}
            <MasonryTips tips={readingTips.poem} />

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

export default StoryPractice;

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
  readingPageContainer: {
    padding: 24,
    gap: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  readingPieceContainer: {
    gap: 12,
  },
  readingPieceTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  readingPieceMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  readingTime: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  readingLevel: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  readingTextContainer: {
    gap: 16,
  },
  readingText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  highlight: {
    color: theme.colors.library.blue[400],
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
