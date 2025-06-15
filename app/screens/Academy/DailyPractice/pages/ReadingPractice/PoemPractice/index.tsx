import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
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
import RecordingWidget from "../../../../Library/TechniquePage/components/RecordingWidget";
import RecorderWidget from "../../../../Library/TechniquePage/components/RecorderWidget";
import Button from "../../../../../../components/Button";
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import {
  ReadingPractice,
  ReadingPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { toPascalCase } from "../../../../../../util/functions/strings";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { DAFTool } from "../../../../Tools/DAF";
import VoiceRecorder from "../../../../Library/TechniquePage/components/VoiceRecorder";

const StoryPractice = () => {
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allPoems, setAllPoems] = useState<ReadingPractice[]>([]);
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
        ) : (
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
              <VoiceRecorder onToggle={toggleIndex} />
            </View>
            <Button
              text="Mark Complete"
              onPress={() => {
                setPracticeComplete(true);
              }}
            />
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
  },
  topNavigation: {
    position: "relative",
    top: 0,
    display: "flex",
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
});
