import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import BottomSheetModal from "../../../components/BottomSheetModal";
import { useNavigation } from "@react-navigation/native";
import { useOasesStore } from "../../../stores/oases";
import { submitOasesBatch } from "../../../api/oases";
import { OasesAnswerSubmission } from "../../../api/oases/types";
import OnboardingQuestion from "../../../components/OnBoarding/OnboardingQuestion";
import ScreenView from "../../../components/ScreenView";
import Button from "../../../components/Button";
import ProgressBar from "../../../components/ProgressBar";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";

const OASESQuestions = () => {
  const navigation = useNavigation<any>();
  const { dailyBatch, answers, setAnswer } = useOasesStore();

  // Local pagination state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStopModalVisible, setIsStopModalVisible] = useState(false);

  if (
    !dailyBatch ||
    !dailyBatch.questions ||
    dailyBatch.questions.length === 0
  ) {
    // Safety valve: Navigate back if data is missing
    return (
      <ScreenView>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.text.default }}>
            No questions available for today.
          </Text>
          <Button
            text="Go Back"
            onPress={() => navigation.navigate("Root")}
            style={{ marginTop: 20 }}
          />
        </View>
      </ScreenView>
    );
  }

  const questions = dailyBatch.questions;
  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    // Should not happen if logic is correct, but safe guard
    return (
      <ScreenView>
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: theme.colors.feedback.error }}>
            Error loading question.
          </Text>
          <Button
            text="Reset"
            onPress={() => {
              setCurrentIndex(0);
              navigation.navigate("Root");
            }}
            style={{ marginTop: 20 }}
          />
        </View>
      </ScreenView>
    );
  }

  const totalQuestions = questions.length;

  const isLast = currentIndex === totalQuestions - 1;
  const canProceed =
    answers[currentQuestion.id] !== undefined &&
    answers[currentQuestion.id] !== "";

  const handleNext = async () => {
    if (isLast) {
      await handleSubmit();
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Format payload
      const formattedAnswers: OasesAnswerSubmission[] = Object.keys(
        answers,
      ).map((qId) => ({
        questionId: qId,
        answer: answers[qId],
      }));

      await submitOasesBatch({ answers: formattedAnswers });
      navigation.replace("OASESComplete");
    } catch (err) {
      console.error(err);
      Alert.alert("Submission Failed", "Please try again.");
    }
  };

  // Map OASES options to UI component expected format
  const uiOptions = currentQuestion.options.map((opt) => ({
    id: String(opt.value), // Use VALUE as ID for selection logic effectively
    answer: opt.text,
    description: "", // OASES doesn't have per-option description in spec
  }));

  // Reverse map for selection: Component returns ID (value), we store that directly.

  return (
    <ScreenView>
      {/* Header Info */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Day {dailyBatch.dayNumber} Check-in
        </Text>
        <TouchableOpacity
          onPress={() => setIsStopModalVisible(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="x" size={24} color={theme.colors.text.default} />
        </TouchableOpacity>
      </View>

      <ProgressBar
        currentStep={currentIndex + 1}
        totalSteps={totalQuestions}
        showPercentage={false}
        style={styles.progress}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <OnboardingQuestion
          key={currentQuestion.id}
          id={currentQuestion.id}
          question={currentQuestion.text}
          questionType={currentQuestion.type}
          options={uiOptions}
          // For the component, we need to pass the selected VALUE as a string to match the option 'id' (which we mapped to value)
          value={String(answers[currentQuestion.id] ?? "")}
          values={
            Array.isArray(answers[currentQuestion.id])
              ? (answers[currentQuestion.id] as string[]).map(String)
              : []
          }
          onChange={(_, val) => {
            // val is the "value" from the option because we mapped id=value above
            setAnswer(currentQuestion.id, val);
          }}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          text={isLast ? "Submit" : "Next"}
          onPress={handleNext}
          disabled={!canProceed}
        />
      </View>

      <BottomSheetModal
        visible={isStopModalVisible}
        onClose={() => setIsStopModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Stop Check-in?</Text>
          <Text style={styles.modalText}>
            Your progress will be saved for later. You can continue anytime from
            the Home screen.
          </Text>

          <View style={styles.modalButtons}>
            <Button
              text="Stop"
              variant="ghost"
              style={{
                borderColor: theme.colors.feedback.error,
                borderWidth: 1,
              }}
              textColor={theme.colors.feedback.error}
              onPress={() => {
                setIsStopModalVisible(false);
                navigation.navigate("Root");
              }}
            />
            <Button
              text="Cancel"
              variant="normal"
              onPress={() => setIsStopModalVisible(false)}
            />
          </View>
        </View>
      </BottomSheetModal>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  estimatedTime: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  progress: {
    marginTop: 8,
    marginBottom: 24,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  footer: {
    paddingVertical: 20,
  },
  modalContent: {
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  modalText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 24,
  },
  modalButtons: {
    width: "100%",
    gap: 12,
  },
});

export default OASESQuestions;
