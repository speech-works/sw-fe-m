// StoryPractice.tsx
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import ScreenView from "../../../../../../components/ScreenView";
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
import { ChorusManager } from "../../../../Tools/Chorus/chorusManager";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { DAFTool } from "../../../../Tools/DAF";
import VoiceRecorder from "../../../../Library/TechniquePage/components/VoiceRecorder";
import { createPracticeActivity } from "../../../../../../api";
import { PracticeActivityContentType } from "../../../../../../api/practiceActivities/types";
import {
  completePracticeActivity,
  startPracticeActivity,
} from "../../../../../../api/practiceActivities";
import { useActivityStore } from "../../../../../../stores/activity";
import { useSessionStore } from "../../../../../../stores/session";
import { useUserStore } from "../../../../../../stores/user";
import { useRecordedVoice } from "../../../../../../hooks/useRecordedVoice";
import { RecordingSourceType } from "../../../../../../api/recordings/types";
import { readingTips } from "../data";

const StoryPractice = () => {
  const chorusManagerRef = useRef(new ChorusManager());
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const { updateActivity, addActivity, doesActivityExist } = useActivityStore();
  const { practiceSession } = useSessionStore();
  const { user } = useUserStore();
  const { voiceRecordingUri, setVoiceRecordingUri, submitVoiceRecording } =
    useRecordedVoice(user?.id);

  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allStories, setAllStories] = useState<ReadingPractice[]>([]);

  const onBackPress = () => {
    navigation.goBack();
  };

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // highlightRange = [startIndex, length] for current word, or [-1,0] to clear
  const [highlightRange, setHighlightRange] = useState<[number, number]>([
    -1, 0,
  ]);
  const [currentActivityId, setCurrentActivityId] = useState<string | null>(
    null
  );

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
      .split(/\n\s*\n/) // split on blank lines
      .map((section) => section.trim())
      .filter((section) => section.length > 0);
  };

  const toggleIndex = () => {
    if (allStories && allStories.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % allStories.length);
    }
  };

  const markActivityStart = async () => {
    if (!practiceSession) return;
    const newActivity = await createPracticeActivity({
      sessionId: practiceSession.id,
      contentType: PracticeActivityContentType.READING_PRACTICE,
      contentId: allStories[selectedIndex]?.id,
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

  // const iosVoices = ["com.apple.ttsbundle.Samantha-compact"];
  // const androidVoices = ["en-US-language", "en-GB-language", "en-IN-language"];
  // const voicePool = Platform.OS === "android" ? androidVoices : iosVoices;

  useEffect(() => {
    const currentText = allStories[selectedIndex]?.textContent || "";
    const paginated = splitTextIntoPages(currentText);
    setPages(paginated);
    setCurrentPage(0);
    // Reset highlight when page or story changes
    setHighlightRange([-1, 0]);
  }, [selectedIndex, allStories]);

  useEffect(() => {
    const fetchAllStories = async () => {
      const st = await getReadingPracticeByType(ReadingPracticeType.STORY);
      setAllStories(st);
    };
    fetchAllStories();
    return () => {
      chorusManagerRef.current.stop();
    };
  }, []);

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.topNavigation} onPress={onBackPress}>
          <Icon
            name="chevron-left"
            size={16}
            color={theme.colors.text.default}
          />
          <Text style={styles.topNavigationText}>Story</Text>
        </TouchableOpacity>

        {practiceComplete ? (
          <DonePractice />
        ) : currentActivityId ? (
          <CustomScrollView contentContainerStyle={styles.scrollContainer}>
            <SpeechTools
              onToolSelect={(toolName) => setSelectedPracticeTool(toolName)}
            />

            <View style={styles.readingPageContainer}>
              <PageCounter
                currentPage={currentPage + 1}
                totalPages={pages.length}
              />

              <View style={styles.readingPieceContainer}>
                <View>
                  <Text style={styles.readingPieceTitleText}>
                    {allStories[selectedIndex]?.title} :{" "}
                    {allStories[selectedIndex]?.author}
                  </Text>
                  <View style={styles.readingPieceMeta}>
                    <Text style={styles.readingTime}>10 min read</Text>
                    <Text>•</Text>
                    <Text style={styles.readingLevel}>
                      Level:{" "}
                      {toPascalCase(
                        allStories[selectedIndex]?.difficulty || ""
                      )}
                    </Text>
                  </View>
                </View>
                {/* Next/Previous page buttons */}
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

                {/* Render the page text with live highlighting */}
                <View style={styles.readingTextContainer}>
                  {renderHighlightedText()}
                </View>
              </View>

              {/* <Text>{selectedPracticeTool}</Text> */}
              {renderSelectedTool(selectedPracticeTool)}
              <VoiceRecorder
                onToggle={toggleIndex}
                onRecorded={(uri) => {
                  setVoiceRecordingUri(uri);
                }}
              />
            </View>

            {!!voiceRecordingUri && (
              <Button text="Done" onPress={onDonePress} />
            )}
          </CustomScrollView>
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
                {readingTips.story.map((hint) => (
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
            <Button
              text="Start Practice"
              onPress={markActivityStart}
              style={{ marginVertical: 20 }}
            />
          </>
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
  },
  topNavigation: {
    position: "relative",
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
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
