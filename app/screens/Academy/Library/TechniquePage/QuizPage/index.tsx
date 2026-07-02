import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
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
import {
  Text,
  Icon,
  icons,
  Button,
  Surface,
  Spinner,
  EmptyState,
  ProgressBar,
  useTheme,
  spacing,
  space,
  radius,
  borderWidth,
} from "../../../../../design-system";

interface QuizPageProps {
  techniqueId: TECHNIQUES_ENUM;
  techniqueName: string;
  from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  header?: React.ReactNode;
}

const QuizPage = ({ techniqueId, techniqueName, from, header }: QuizPageProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const { colors } = useTheme();
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
      <View style={styles.stateContainer}>
        <Spinner label="Loading quiz..." />
      </View>
    );
  }

  if (!quiz || quiz.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <EmptyState
          icon={icons.checklist}
          title="No Quiz Available"
          message="This technique doesn't have a quiz yet."
        />
      </View>
    );
  }

  const currentQuestion = quiz[selectedIndex];
  if (!currentQuestion) {
    return (
      <View style={styles.stateContainer}>
        <Spinner label="Loading question..." />
      </View>
    );
  }

  const isNextDisabled = selectedAnsIndex === undefined || isSubmitting;

  return (
    <CustomScrollView contentContainerStyle={styles.scrollContent}>
      {header}
      <View style={styles.innerContainer}>
        {/* Progress Indicator */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text variant="bodySm" color="secondary">
              Question {selectedIndex + 1} of {quiz.length}
            </Text>
            <Text variant="bodySm" color="primary">
              {Math.round(progress * 100)}%
            </Text>
          </View>
          <ProgressBar value={progress} color={colors.action.primary} height={8} />
        </View>

        {/* Quiz Card */}
        <Surface level="default" rounded="card" bordered style={styles.quizContainer}>
          <View style={styles.questionSection}>
            <View style={styles.questionHeader}>
              <View
                style={[
                  styles.questionNumberBadge,
                  { backgroundColor: colors.action.primaryTint },
                ]}
              >
                <Text variant="title" color="primary">
                  {selectedIndex + 1}
                </Text>
              </View>
              <Text variant="label" color="tertiary">
                ASSESSMENT QUESTION
              </Text>
            </View>
            <Text variant="h3" color="primary" style={styles.qText}>
              {currentQuestion.text}
            </Text>
          </View>

          {/* Answer Options */}
          <View style={styles.answers}>
            {currentQuestion.options?.map((opt, i) => {
              const isSelected = selectedAnsIndex === i;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    selectOption(i);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.ansRow,
                    {
                      backgroundColor: isSelected
                        ? colors.action.primaryTint
                        : colors.surface.control,
                      borderColor: isSelected
                        ? colors.border.selected
                        : colors.border.default,
                    },
                  ]}
                >
                  <View style={styles.ansRowContent}>
                    {/* Radio Button */}
                    <View
                      style={[
                        styles.radioOuter,
                        {
                          borderColor: isSelected
                            ? colors.action.primary
                            : colors.border.strong,
                          backgroundColor: isSelected
                            ? colors.action.primary
                            : "transparent",
                        },
                      ]}
                    >
                      {isSelected && (
                        <Icon name="check" size={12} color={colors.action.onPrimary} />
                      )}
                    </View>

                    {/* Answer Text */}
                    <Text
                      variant="body"
                      color={isSelected ? "primary" : "secondary"}
                      style={styles.ansText}
                    >
                      {opt.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer with Navigation */}
          <View style={[styles.quizFooter, { borderTopColor: colors.border.default }]}>
            <Button
              key={`next-btn-${selectedIndex}`}
              label={
                isSubmitting
                  ? "Submitting..."
                  : selectedIndex + 1 === quiz.length
                    ? "Submit Quiz"
                    : "Next Question"
              }
              size="md"
              fullWidth={false}
              loading={isSubmitting}
              disabled={isNextDisabled}
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
            />
          </View>
        </Surface>

        {/* Info Banner */}
        <View
          style={[
            styles.quizInfo,
            {
              backgroundColor: colors.accentTint.info,
              borderColor: colors.border.default,
            },
          ]}
        >
          <Icon
            size={18}
            name="info"
            color={colors.feedback.infoText}
          />
          <Text variant="bodySm" color="secondary" style={styles.quizInfoText}>
            Practice will be marked complete after quiz submission
          </Text>
        </View>
      </View>
    </CustomScrollView>
  );
};

export default QuizPage;

const styles = StyleSheet.create({
  stateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing["4xl"],
  },
  scrollContent: {
    paddingHorizontal: space.screenX,
    paddingBottom: spacing["2xl"],
    flexGrow: 1,
  },
  innerContainer: {
    gap: spacing.xl,
  },
  // Progress Section
  progressSection: {
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Quiz Container
  quizContainer: {
    gap: spacing["2xl"],
    padding: spacing["2xl"],
  },
  questionSection: {
    gap: spacing.lg,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  questionNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  qText: {
    lineHeight: 30,
  },
  // Answers
  answers: {
    gap: spacing.md,
  },
  ansRow: {
    padding: spacing.lg,
    borderWidth: borderWidth.thick,
    borderRadius: radius.input,
  },
  ansRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  radioOuter: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: borderWidth.thick,
    justifyContent: "center",
    alignItems: "center",
  },
  ansText: {
    flex: 1,
    lineHeight: 24,
  },
  // Footer
  quizFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: spacing.lg,
    borderTopWidth: borderWidth.hairline,
  },
  // Info Banner
  quizInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.input,
    borderWidth: borderWidth.hairline,
  },
  quizInfoText: {
    flexShrink: 1,
    lineHeight: 22,
  },
});
