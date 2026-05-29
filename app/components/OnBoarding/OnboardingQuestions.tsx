import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Button from "../Button";
import CustomScrollView from "../CustomScrollView";
import ProgressBar from "../ProgressBar";
import ScreenView from "../ScreenView";
import OnboardingQuestion from "./OnboardingQuestion";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface OnboardingQuestionsProps {
  questions: OnboardingQuestionType[]; // Renamed to avoid conflict with component name
  onAnswer: (questionId: string, answerId: string | string[]) => void;
}

// Re-declare the interface here or import it from OnboardingQuestion.tsx
// Assuming OnboardingQuestionType and OnboardingAnswer are defined in OnboardingQuestion.tsx
// For a complete runnable example, you might need to include them here or ensure correct import paths.
interface OnboardingQuestionType {
  id: string;
  question: string;
  options: OnboardingAnswer[];
  description: string;
  onAnswer?: (questionId: string, answerId: string | string[]) => void;
}

interface OnboardingAnswer {
  id: string;
  answer: string;
  description: string;
}

const OnboardingQuestions = ({
  questions,
  onAnswer,
}: OnboardingQuestionsProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Handle completion - all questions answered
      console.log("All questions completed");
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  if (!currentQuestion) {
    return null;
  }

  const insets = useSafeAreaInsets();

  return (
    <ScreenView style={styles.screenInner}>
      <View style={{ paddingTop: insets.top + 16 }}>
        <ProgressBar
          currentStep={currentQuestionIndex + 1}
          totalSteps={questions.length}
          showStepIndicator={true}
          showPercentage={true}
          style={styles.progressBar}
        />
      </View>
      <CustomScrollView contentContainerStyle={styles.scrollContent}>
        <OnboardingQuestion
          id={currentQuestion.id}
          question={currentQuestion.question}
          options={currentQuestion.options}
          description={currentQuestion.description}
          questionType="SINGLE"
          onChange={onAnswer}
        />
      </CustomScrollView>
      {/* Button container now overlays */}
      <View
        style={[
          styles.buttonOverlayContainer,
          { paddingBottom: Math.max(insets.bottom + 16, 40) },
        ]}
      >
        <Button
          text={isLastQuestion ? "Complete" : "Next"}
          onPress={handleNext}
          variant="normal"
          style={styles.nextButton}
        />
      </View>
    </ScreenView>
  );
};

export default OnboardingQuestions;

const styles = StyleSheet.create({
  screenInner: {
    paddingHorizontal: 24,
  },
  progressBar: {
    marginBottom: 24,
  },
  scrollContent: {
    paddingBottom: 200, // More space for the fixed CTA
  },
  buttonOverlayContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: "rgba(253, 251, 247, 0.98)", // Match ScreenView background
  },
  nextButton: {
    width: "100%",
  },
});
