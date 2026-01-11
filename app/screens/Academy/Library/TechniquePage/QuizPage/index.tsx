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
import CustomScrollView from "../../../../../components/CustomScrollView";
import { LinearGradient } from "expo-linear-gradient";

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
  const [isLoading, setIsLoading] = useState(true);

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
      try {
        setIsLoading(true);
        console.log("🔍 Fetching quiz for techniqueId:", techniqueId);
        const quizQuestions = await getQuizByTechnique(techniqueId);
        console.log("📝 Quiz response:", quizQuestions);
        console.log("📊 Quiz length:", quizQuestions?.length);
        console.log("📋 Quiz type:", typeof quizQuestions);
        console.log("📦 Quiz is array?", Array.isArray(quizQuestions));

        if (
          quizQuestions &&
          Array.isArray(quizQuestions) &&
          quizQuestions.length > 0
        ) {
          console.log(
            "✅ Setting quiz with",
            quizQuestions.length,
            "questions"
          );
          setQuiz(quizQuestions);
        } else {
          console.warn("⚠️ Quiz data is empty or invalid:", quizQuestions);
          setQuiz([]);
        }
      } catch (error) {
        console.error("❌ Error fetching quiz:", error);
        setQuiz([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchQuiz();
  }, [techniqueId]);

  const progress = quiz.length > 0 ? (selectedIndex + 1) / quiz.length : 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading quiz...</Text>
      </View>
    );
  }

  if (!quiz || quiz.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Icon
          name="clipboard-list"
          size={48}
          color={theme.colors.text.default}
        />
        <Text style={styles.emptyTitle}>No Quiz Available</Text>
        <Text style={styles.emptyText}>
          This technique doesn't have a quiz yet.
        </Text>
      </View>
    );
  }

  const currentQuestion = quiz[selectedIndex];
  if (!currentQuestion) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading question...</Text>
      </View>
    );
  }

  return (
    <CustomScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.innerContainer}>
        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Question {selectedIndex + 1} of {quiz.length}
            </Text>
            <Text style={styles.progressPercent}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={[
                theme.colors.library.orange[400],
                theme.colors.library.orange[500],
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>

        {/* Quiz Card */}
        <View style={styles.quizContainer}>
          <View style={styles.questionSection}>
            <View style={styles.questionHeader}>
              <View style={styles.questionNumberBadge}>
                <Text style={styles.questionNumberText}>
                  {selectedIndex + 1}
                </Text>
              </View>
              <Text style={styles.quizTitle}>Assessment Question</Text>
            </View>
            <Text style={styles.qText}>{currentQuestion.questionText}</Text>
          </View>

          {/* Answer Options */}
          <View style={styles.answers}>
            {currentQuestion.options?.map((opt, i) => {
              const isSelected = selectedAnsIndex === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.ansRow, isSelected && styles.selectedAnsRow]}
                  onPress={() => {
                    selectOption(i);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.ansRowContent}>
                    {/* Radio Button */}
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected && styles.radioOuterSelected,
                      ]}
                    >
                      {isSelected && (
                        <Icon name="check" size={12} color="#FFF" />
                      )}
                    </View>

                    {/* Answer Text */}
                    <Text
                      style={[
                        styles.ansText,
                        isSelected && styles.ansTextSelected,
                      ]}
                    >
                      {opt.optionText}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer with Navigation */}
          <View style={styles.quizFooter}>
            <TouchableOpacity
              disabled={selectedAnsIndex === undefined}
              style={[
                styles.nextQButton,
                selectedAnsIndex === undefined && styles.nextQButtonDisabled,
              ]}
              onPress={() => {
                const currentAnswer: FinalAnswer = {
                  question: currentQuestion,
                  yourAnswer: currentQuestion.options[selectedAnsIndex!],
                };

                if (selectedIndex + 1 === quiz.length) {
                  const finalAnswersWithLast = [...answers, currentAnswer];
                  navigation.navigate("SummaryPage", {
                    techniqueId,
                    techniqueName,
                    finalAnswers: finalAnswersWithLast,
                  });
                } else {
                  setAnswers((old) => [...old, currentAnswer]);
                  resetOptionSelection();
                  nextQuestion();
                }
              }}
            >
              <Text style={styles.nextQText}>
                {selectedIndex + 1 === quiz.length
                  ? "Submit Quiz"
                  : "Next Question"}
              </Text>
              <Icon
                name={
                  selectedIndex + 1 === quiz.length
                    ? "check-circle"
                    : "arrow-right"
                }
                size={16}
                color="#FFF"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.quizInfo}>
          <Icon
            solid
            size={18}
            name="info-circle"
            color={theme.colors.library.blue[400]}
          />
          <Text style={styles.quizInfoText}>
            Practice will be marked complete after quiz submission
          </Text>
        </View>
      </View>
    </CustomScrollView>
  );
};

export default QuizPage;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
  loadingText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  emptyTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
  innerContainer: {
    gap: 20,
  },
  // Progress Section
  progressSection: {
    gap: 10,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  progressPercent: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[500],
    fontWeight: "700",
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: theme.colors.surface.disabled,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  // Quiz Container
  quizContainer: {
    gap: 24,
    padding: 24,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  questionSection: {
    gap: 16,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  questionNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.library.orange[100],
    justifyContent: "center",
    alignItems: "center",
  },
  questionNumberText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[500],
    fontWeight: "700",
    fontSize: 14,
  },
  quizTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontSize: 11,
  },
  qText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    lineHeight: 28,
    fontWeight: "600",
  },
  // Answers
  answers: {
    gap: 12,
  },
  ansRow: {
    padding: 18,
    borderWidth: 2,
    borderRadius: 12,
    borderColor: theme.colors.border.default,
    backgroundColor: theme.colors.surface.default,
  },
  selectedAnsRow: {
    borderColor: theme.colors.library.orange[400],
    backgroundColor: theme.colors.library.orange[100],
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  ansRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border.default,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.surface.default,
  },
  radioOuterSelected: {
    borderColor: theme.colors.library.orange[500],
    backgroundColor: theme.colors.library.orange[500],
  },
  ansText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    flex: 1,
    lineHeight: 22,
  },
  ansTextSelected: {
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  // Footer
  quizFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 8,
  },
  nextQButton: {
    backgroundColor: theme.colors.library.orange[500],
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  nextQButtonDisabled: {
    backgroundColor: theme.colors.surface.disabled,
    opacity: 0.5,
  },
  nextQText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontWeight: "700",
  },
  // Info Banner
  quizInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.library.blue[100],
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.library.blue[400],
  },
  quizInfoText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.blue[500],
    flexShrink: 1,
    lineHeight: 20,
  },
});
