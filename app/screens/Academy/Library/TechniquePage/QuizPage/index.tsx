import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { getQuizByTechnique } from "../../../../../api/library";
import {
  FinalAnswer,
  QuizQuestion,
  TECHNIQUES_ENUM,
} from "../../../../../api/library/types";
import { submitQuizAnswer as submitAnswerApi } from "../../../../../api/quiz";
import CustomScrollView from "../../../../../components/CustomScrollView";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

interface QuizPageProps {
  techniqueId: TECHNIQUES_ENUM;
  techniqueName: string;
  from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
}

const QuizPage = ({ techniqueId, techniqueName, from }: QuizPageProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedAnsIndex, setSelectedAnsIndex] = useState<number>();
  const [answers, setAnswers] = useState<FinalAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            "questions",
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
            <Text style={styles.qText}>{currentQuestion.text}</Text>
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
                      {opt.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer with Navigation */}
          <View style={styles.quizFooter}>
            <TouchableOpacity
              key={`next-btn-${selectedIndex}`}
              disabled={selectedAnsIndex === undefined || isSubmitting}
              style={[
                styles.nextQButton,
                (selectedAnsIndex === undefined || isSubmitting) &&
                  styles.nextQButtonDisabled,
              ]}
              onPress={async () => {
                if (selectedAnsIndex === undefined) return;

                try {
                  setIsSubmitting(true);
                  // Submit answer to backend for mastery tracking
                  // Note: The API expects array of selected indices
                  await submitAnswerApi(currentQuestion.id, [selectedAnsIndex]);

                  const currentAnswer: FinalAnswer = {
                    question: currentQuestion,
                    yourAnswer: currentQuestion.options[selectedAnsIndex!],
                  };

                  if (selectedIndex + 1 === quiz.length) {
                    const finalAnswersWithLast = [...answers, currentAnswer];
                    navigation.navigate("SummaryPage", {
                      techniqueId,
                      techniqueName,
                      finalAnswers: finalAnswersWithLast, from,
                    });
                  } else {
                    setAnswers((old) => [...old, currentAnswer]);
                    resetOptionSelection();
                    nextQuestion();
                  }
                } catch (error) {
                  console.error("Failed to submit answer", error);
                  // Optional: Show alert to user? For now we just log
                  // Proceed anyway? Or block?
                  // Let's block to ensure data consistency, or maybe allow proceed in offline?
                  // For now, we'll allow proceed to not block user flow on network error,
                  // but ideally we should retry.

                  // Construct answer anyway for local flow
                  const currentAnswer: FinalAnswer = {
                    question: currentQuestion,
                    yourAnswer: currentQuestion.options[selectedAnsIndex!],
                  };

                  if (selectedIndex + 1 === quiz.length) {
                    const finalAnswersWithLast = [...answers, currentAnswer];
                    navigation.navigate("SummaryPage", {
                      techniqueId,
                      techniqueName,
                      finalAnswers: finalAnswersWithLast, from,
                    });
                  } else {
                    setAnswers((old) => [...old, currentAnswer]);
                    resetOptionSelection();
                    nextQuestion();
                  }
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <Text
                style={[
                  styles.nextQText,
                  (selectedAnsIndex === undefined || isSubmitting) &&
                    styles.nextQTextDisabled,
                ]}
              >
                {isSubmitting
                  ? "Submitting..."
                  : selectedIndex + 1 === quiz.length
                    ? "Submit Quiz"
                    : "Next Question"}
              </Text>
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
    gap: 12,
    paddingHorizontal: 4,
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
    fontSize: 13,
  },
  progressPercent: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[500],
    fontWeight: "800",
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 8,
  },
  // Quiz Container - Modern Gradient Card
  quizContainer: {
    gap: 28,
    padding: 28,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    position: "relative",
    shadowColor: theme.colors.library.orange[300],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  questionSection: {
    gap: 18,
    zIndex: 1,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  questionNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.library.orange[500],
    justifyContent: "center",
    alignItems: "center",
    shadowColor: theme.colors.library.orange[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ rotate: "3deg" }],
  },
  questionNumberText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 18,
  },
  quizTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.orange[500],
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontSize: 11,
  },
  qText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    lineHeight: 32,
    fontWeight: "700",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  // Answers - Premium Card Style
  answers: {
    gap: 14,
    zIndex: 1,
  },
  ansRow: {
    padding: 20,
    borderWidth: 2,
    borderRadius: 16,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    position: "relative",
  },
  selectedAnsRow: {
    borderColor: theme.colors.library.orange[400],
    backgroundColor: "#FFF7ED",
    borderWidth: 2.5,
    shadowColor: theme.colors.library.orange[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  ansRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 1,
  },
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  radioOuterSelected: {
    borderColor: theme.colors.library.orange[500],
    backgroundColor: theme.colors.library.orange[500],
  },
  ansText: {
    ...parseTextStyle(theme.typography.Body),
    color: "#374151",
    flex: 1,
    lineHeight: 24,
    fontSize: 16,
    fontWeight: "500",
  },
  ansTextSelected: {
    color: "#111827",
    fontWeight: "700",
  },
  // Footer
  quizFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    marginTop: 4,
    zIndex: 1,
  },
  nextQButton: {
    backgroundColor: theme.colors.library.orange[500],
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    margin: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  nextQButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextQText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.5,
  },
  nextQTextDisabled: {
    color: "#9CA3AF",
  },
  // Info Banner - Subtle Modern Style
  quizInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
    borderRadius: 12,
    backgroundColor: "rgba(59, 130, 246, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.1)",
  },
  quizInfoText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#64748B",
    flexShrink: 1,
    lineHeight: 22,
    fontSize: 14,
    fontWeight: "600",
  },
});
