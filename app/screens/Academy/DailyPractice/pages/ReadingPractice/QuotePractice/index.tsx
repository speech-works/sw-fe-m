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

import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import Metronome from "../../../../Library/TechniquePage/components/Metronome";
import RecordingWidget from "../../../../Library/TechniquePage/components/RecordingWidget";
import RecorderWidget from "../../../../Library/TechniquePage/components/RecorderWidget";
import Button from "../../../../../../components/Button";
import {
  ReadingPractice,
  ReadingPracticeType,
} from "../../../../../../api/dailyPractice/types";
import { getReadingPracticeByType } from "../../../../../../api/dailyPractice";
import { VoiceHover } from "../../../../Tools/VoiceHover";
import { DAFTool } from "../../../../Tools/DAF";
import VoiceRecorder from "../../../../Library/TechniquePage/components/VoiceRecorder";

const QuotePractice = () => {
  const navigation =
    useNavigation<RDPStackNavigationProp<keyof RDPStackParamList>>();
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [allQuotes, setAllQuotes] = useState<ReadingPractice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

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
        <TouchableOpacity style={styles.topNavigation} onPress={onBackPress}>
          <Icon
            name="chevron-left"
            size={16}
            color={theme.colors.text.default}
          />
          <Text style={styles.topNavigationText}>Quote</Text>
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
});
