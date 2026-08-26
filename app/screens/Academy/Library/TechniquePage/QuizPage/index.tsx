import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { getQuizByTechnique } from "../../../../../api/library";
import {
  FinalAnswer,
  QuizQuestion,
  TECHNIQUES_ENUM,
} from "../../../../../api/library/types";
import { submitQuizAnswer as submitAnswerApi } from "../../../../../api/quiz";
import CustomScrollView from "../../../../../components/CustomScrollView";
import QuizRunner from "../../../../../components/Quiz/QuizRunner";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import {
  size,
  Text,
  Icon,
  icons,
  Spinner,
  EmptyState,
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
  outerScrollY?: Animated.SharedValue<number>;
}

/**
 * The technique library's quiz.
 *
 * Owns the things that are specific to the library: fetching by technique id,
 * and handing the finished answers to the summary screen. The question view
 * itself lives in components/Quiz/QuizRunner, shared with the quiz blocks
 * inside paid program days.
 *
 * It does NOT set `revealExplanation`. This flow explains every answer at once
 * on the summary screen, which is what its users already know. A program day
 * explains each answer as it is given, because there is no summary screen at
 * the end of a block.
 */
const QuizPage = ({
  techniqueId,
  techniqueName,
  from,
  header,
  outerScrollY,
}: QuizPageProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const { colors } = useTheme();
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setIsLoading(true);
        const quizQuestions = await getQuizByTechnique(techniqueId);
        setQuiz(
          Array.isArray(quizQuestions) && quizQuestions.length > 0
            ? quizQuestions
            : [],
        );
      } catch (error) {
        console.error("Error fetching quiz:", error);
        setQuiz([]);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchQuiz();
  }, [techniqueId]);

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <Spinner label="Loading quiz..." />
      </View>
    );
  }

  if (quiz.length === 0) {
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

  return (
    <CustomScrollView
      contentContainerStyle={styles.scrollContent}
      outerScrollY={outerScrollY}
    >
      {header}
      <View style={styles.innerContainer}>
        <QuizRunner
          questions={quiz}
          onAnswer={async ({ question, selectedIndex }) => {
            await submitAnswerApi(question.id, [selectedIndex]);
          }}
          onFinished={(answers) => {
            // Looked up in `quiz` rather than read off the runner's copy, so
            // the summary screen gets the library's own option type with its
            // required isCorrect, instead of the looser shape the shared
            // component accepts.
            const finalAnswers: FinalAnswer[] = answers.flatMap((a) => {
              const original = quiz.find((q) => q.id === a.question.id);
              const yourAnswer = original?.options[a.selectedIndex];
              return original && yourAnswer ? [{ question: original, yourAnswer }] : [];
            });
            navigation.navigate("SummaryPage", {
              techniqueId,
              techniqueName,
              finalAnswers,
              from,
            });
          }}
        />

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
            size={size.iconSm}
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
