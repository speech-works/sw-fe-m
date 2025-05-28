import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import ScreenView from "../../../../components/ScreenView";
import CustomScrollView from "../../../../components/CustomScrollView";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/FontAwesome5";
import PageStepper from "./components/PageStepper";
import Button from "../../../../components/Button";
import RecordingWidget from "./components/RecordingWidget";
import Metronome from "./components/Metronome";
import CompletedList from "./components/CompletedList";
import SpeechTools from "../../DailyPractice/components/SpeechTools";
import RecorderWidget from "./components/RecorderWidget";

const TechniquePage = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const route = useRoute<RouteProp<LibStackParamList, "TechniquePage">>();
  const { techniqueId, techniqueName, stage } = route.params;
  const [activeStageIndex, setActiveStageIndex] = useState(1);

  const TutorialPage = (
    <View style={styles.innerContainer}>
      <View style={styles.videoContainer}>
        <View style={styles.videoMeta}>
          <Text style={styles.videoMetaTitleText}>
            Understanding Pull-out Technique
          </Text>
          <Text style={styles.videoMetaDescText}>Duration: 3:45</Text>
        </View>
      </View>
      <View style={styles.learningPathContainer}>
        <Text style={styles.learningPathTitleText}>Your Learning Path</Text>
        <View style={styles.learningPathObjectives}>
          {[
            "How to identify moments of stuttering",
            "Proper technique implementation",
            "Practice exercises and examples",
          ].map((o, i) => (
            <View key={i} style={styles.objective}>
              <Icon
                solid
                name="check-circle"
                size={14}
                color={theme.colors.actionPrimary.default}
              />
              <Text style={styles.objectiveText}>{o}</Text>
            </View>
          ))}
        </View>
      </View>
      <Button text="Begin Practice Session" onPress={() => {}} />
    </View>
  );

  const PracticePage = (
    <View style={styles.innerContainer}>
      <SpeechTools />
      <View style={styles.wordContainer}>
        <View style={styles.wordAndSyllable}>
          <View style={styles.wordText}>
            <Text style={styles.descText}>Current Word</Text>
            <Text style={styles.titleText}>Beautiful</Text>
          </View>
          <View style={styles.syllableContainer}>
            <Icon
              name="volume-up"
              size={16}
              color={theme.colors.actionPrimary.default}
            />
            <Text style={styles.syllableText}>[byoo-tuh-fuhl]</Text>
          </View>
        </View>
        <Metronome />
        <RecordingWidget />
        <RecorderWidget />
        <CompletedList />
      </View>
    </View>
  );

  const QuizPage = (
    <View style={styles.innerContainer}>
      <View style={styles.quizContainer}>
        <Text style={styles.quizTitle}>Quick Assessment</Text>
        <View style={styles.qAndA}>
          <Text style={styles.qText}>
            What is the main purpose of the pull- out technique?
          </Text>
          <View style={styles.answers}>
            {[
              "To prevent stuttering completely",
              "To modify the moment of stuttering",
              "To speak faster",
            ].map((ans, i) => (
              <TouchableOpacity key={i} style={styles.ansRow}>
                <Text style={styles.ansText}>{ans}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.quizFooter}>
          <Text style={styles.quizQCountText}>1 of 3 Questions</Text>
          <TouchableOpacity
            style={styles.nextQButton}
            onPress={() =>
              navigation.navigate("SummaryPage", { techniqueId, techniqueName })
            }
          >
            <Text style={styles.nextQText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.quizInfo}>
        <Icon
          solid
          size={20}
          name="info-circle"
          color={theme.colors.library.blue[400]}
        />
        <Text style={styles.quizInfoText}>
          Practice will be marked complete after quiz
        </Text>
      </View>
    </View>
  );

  const RenderPage =
    activeStageIndex === 0
      ? TutorialPage
      : activeStageIndex === 1
      ? PracticePage
      : activeStageIndex === 2
      ? QuizPage
      : null;

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon
              name="arrow-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>{techniqueName}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}}>
            <Icon
              name="question-circle"
              size={16}
              color={theme.colors.text.default}
            />
          </TouchableOpacity>
        </View>
        <PageStepper
          steps={[
            { label: "Tutorial", icon: "play" },
            { label: "Exercise", icon: "microphone" },
            { label: "Quiz", icon: "check" },
          ]}
          currentStepIndex={activeStageIndex}
          onStepChange={(index) => setActiveStageIndex(index)}
        />
        <CustomScrollView>{RenderPage}</CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default TechniquePage;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  innerContainer: {
    gap: 16,
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
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  videoContainer: {
    height: 420,
    width: "100%",
    borderRadius: 16,
    backgroundColor: theme.colors.background.default,
    position: "relative",
  },
  videoMeta: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    backgroundColor: "black",
    opacity: 0.6,
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
  },
  videoMetaTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
  },
  videoMetaDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  learningPathContainer: {
    padding: 16,
    gap: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default,
  },
  learningPathTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  learningPathObjectives: {
    gap: 12,
  },
  objective: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  objectiveText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },

  //////////// practice page ///////////////

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

  ////////////// Quiz page ///////////////////////
  quizInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.library.blue[100],
  },
  quizInfoText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.library.blue[400],
    flexShrink: 1,
  },
  quizContainer: {
    gap: 24,
    padding: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  quizTitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: 600,
  },
  qAndA: {
    gap: 12,
  },
  qText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  answers: {
    gap: 12,
  },
  ansRow: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: theme.colors.border.default,
  },
  ansText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  quizFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  quizQCountText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  nextQButton: {
    backgroundColor: theme.colors.actionPrimary.default,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  nextQText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
  },
});
