import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import { theme } from "../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../util/functions/parseStyles";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  FinalAnswer,
  QuizQuestion,
  TECHNIQUES_ENUM,
} from "../../../../../api/library/types";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { useNavigation } from "@react-navigation/native";
import { getQuizByTechnique } from "../../../../../api/library";

interface QuizPageProps {
  techniqueId: TECHNIQUES_ENUM;
  techniqueName: string;
}

const QuizPage = ({ techniqueId, techniqueName }: QuizPageProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedAnsIndex, setSelectedAnsIndex] = useState<number>();
  const [answers, setAnswers] = useState<FinalAnswer[]>([]);

  const nextQuestion = () => {
    if (quiz && quiz.length > 0) {
      setSelectedIndex((prevIndex) => (prevIndex + 1) % quiz.length);
    }
  };

  const selectOption = (i: number) => {
    setSelectedAnsIndex(i);
  };

  const resetOptionSelection = () => {
    setSelectedAnsIndex(undefined);
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      const quizQuestions = await getQuizByTechnique(techniqueId);
      setQuiz(quizQuestions);
    };
    fetchQuiz();
  }, [techniqueId]); // Added techniqueId to dependency array for completeness

  return (
    <View style={styles.innerContainer}>
      <View style={styles.quizContainer}>
        <Text style={styles.quizTitle}>Quick Assessment</Text>
        <View style={styles.qAndA}>
          <Text style={styles.qText}>{quiz[selectedIndex]?.questionText}</Text>
          <View style={styles.answers}>
            {quiz[selectedIndex]?.options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.ansRow,
                  selectedAnsIndex === i && styles.selectedAnsRow,
                ]}
                onPress={() => {
                  selectOption(i);
                }}
              >
                <Text style={styles.ansText}>{opt.optionText}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.quizFooter}>
          <Text style={styles.quizQCountText}>{`${selectedIndex + 1} of ${
            quiz.length
          } Questions `}</Text>
          <TouchableOpacity
            disabled={selectedAnsIndex === undefined}
            style={[
              styles.nextQButton,
              selectedAnsIndex === undefined && styles.nextQButtonDisabled,
            ]}
            onPress={() => {
              // Create the current answer object
              const currentAnswer: FinalAnswer = {
                question: quiz[selectedIndex],
                yourAnswer: quiz[selectedIndex]?.options[selectedAnsIndex!],
              };

              // Check if it's the last question
              if (selectedIndex + 1 === quiz.length) {
                // If it's the last question, create the final array including the current answer
                // and navigate with this complete array.
                const finalAnswersWithLast = [...answers, currentAnswer];
                navigation.navigate("SummaryPage", {
                  techniqueId,
                  techniqueName,
                  finalAnswers: finalAnswersWithLast,
                });
              } else {
                // If not the last question, update answers state for the next question,
                // reset selection, and move to the next question.
                setAnswers((old) => [...old, currentAnswer]);
                resetOptionSelection();
                nextQuestion();
              }
            }}
          >
            <Text style={styles.nextQText}>
              {selectedIndex + 1 === quiz.length ? "Submit" : "Next"}
            </Text>
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
};

export default QuizPage;

const styles = StyleSheet.create({
  innerContainer: {
    gap: 16,
  },
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
  selectedAnsRow: {
    borderColor: theme.colors.border.selected,
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
  nextQButtonDisabled: {
    backgroundColor: theme.colors.surface.disabled,
    opacity: 1,
    elevation: 0, // Android
    shadowColor: "transparent", // iOS
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  nextQText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
  },
});
