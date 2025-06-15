import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import {
  ExerciseItem,
  TECHNIQUES_ENUM,
} from "../../../../../api/library/types";
import RecordingWidget from "../components/RecordingWidget";
import RecorderWidget from "../components/RecorderWidget";
import CompletedList from "../components/CompletedList";
import Metronome from "../components/Metronome";
import { theme } from "../../../../../Theme/tokens";
import SpeechTools from "../../../DailyPractice/components/SpeechTools";
import Button from "../../../../../components/Button";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import { getAllExerciseItems } from "../../../../../api/library";
import { DAFTool } from "../../../Tools/DAF";
import { VoiceHover } from "../../../Tools/VoiceHover";
import { speakText } from "../../../../../util/functions/speak";
import VoiceRecorder from "../components/VoiceRecorder";

interface PracticePageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
}
const PracticePage = ({
  techniqueId,
  setActiveStageIndex,
}: PracticePageProps) => {
  const [exerciseItems, setExerciseItems] = useState<ExerciseItem[]>([]);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const [selectedPracticeTool, setSelectedPracticeTool] = useState("");

  const [completedItems, setCompletedItems] = useState<Array<ExerciseItem>>([]);

  const toggleIndex = () => {
    if (exerciseItems && exerciseItems.length > 0) {
      setCompletedItems((old) => [...old, exerciseItems[selectedIndex]]);
      setSelectedIndex((prevIndex) => (prevIndex + 1) % exerciseItems.length);
    }
  };

  const renderSelectedTool = (toolName: string) => {
    switch (toolName) {
      case "DAF":
        return <DAFTool />;
      case "Voicehover":
        return (
          <VoiceHover text={exerciseItems[selectedIndex]?.itemText || ""} />
        );
      case "Metronome":
        return <Metronome />;
      default:
        return null;
    }
  };

  useEffect(() => {
    const fetchTutorial = async () => {
      const items = await getAllExerciseItems();
      setExerciseItems(items);
    };
    fetchTutorial();
  }, []);

  return (
    <View style={styles.innerContainer}>
      <SpeechTools
        onToolSelect={(toolName) => setSelectedPracticeTool(toolName)}
      />
      <View style={styles.wordContainer}>
        <View style={styles.wordAndSyllable}>
          <View style={styles.wordText}>
            <Text style={styles.descText}>Current Word</Text>
            <Text style={styles.titleText}>
              {exerciseItems[selectedIndex]?.itemText}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syllableContainer}
            onPress={() => speakText(exerciseItems[selectedIndex]?.itemText)}
          >
            <Icon
              name="volume-up"
              size={16}
              color={theme.colors.actionPrimary.default}
            />
            <Text style={styles.syllableText}>
              {exerciseItems[selectedIndex]?.itemPhonetics
                ? `[${exerciseItems[selectedIndex]?.itemPhonetics}]`
                : ""}
            </Text>
          </TouchableOpacity>
        </View>
        {renderSelectedTool(selectedPracticeTool)}
        <VoiceRecorder onToggle={toggleIndex} />
        <CompletedList items={completedItems} />
      </View>
      <Button
        text="Complete Practice"
        onPress={() => {
          setActiveStageIndex(2);
        }}
      />
    </View>
  );
};

export default PracticePage;

const styles = StyleSheet.create({
  innerContainer: {
    gap: 16,
  },
  wordContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.actionPrimary.default,
  },
  titleText: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.XL),
    color: theme.colors.text.title,
  },
  syllableContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  syllableText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  wordAndSyllable: {
    alignItems: "center",
    gap: 8,
  },
  wordText: {
    alignItems: "center",
    gap: 4,
  },
});
