import { StyleSheet, View } from "react-native";
import React, { useState } from "react";
import ScreenView from "../ScreenView";
import OnboardingQuestion from "./OnboardingQuestion";
import Button from "../Button";
import ProgressBar from "../ProgressBar";
import CustomScrollView from "../CustomScrollView";

interface OnboardingQuestionsProps {
  questions: OnboardingQuestionType[]; // Renamed to avoid conflict with component name
  onAnswer: (questionId: string, answerId: string) => void;
}

// Re-declare the interface here or import it from OnboardingQuestion.tsx
// Assuming OnboardingQuestionType and OnboardingAnswer are defined in OnboardingQuestion.tsx
// For a complete runnable example, you might need to include them here or ensure correct import paths.
interface OnboardingQuestionType {
  id: string;
  question: string;
  options: OnboardingAnswer[];
  description: string;
  onAnswer?: (questionId: string, answerId: string) => void;
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

  return (
    <ScreenView>
      <ProgressBar
        currentStep={currentQuestionIndex + 1}
        totalSteps={questions.length}
        showStepIndicator={true}
        showPercentage={true}
        style={styles.progressBar}
      />
      <CustomScrollView>
        <OnboardingQuestion
          id={currentQuestion.id}
          question={currentQuestion.question}
          options={currentQuestion.options}
          description={currentQuestion.description}
          onAnswer={onAnswer}
        />
      </CustomScrollView>
      {/* Button container now overlays */}
      <View style={styles.buttonOverlayContainer}>
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
  progressBar: {
    marginBottom: 32,
  },

  buttonOverlayContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  nextButton: {
    width: "100%",
  },
});
