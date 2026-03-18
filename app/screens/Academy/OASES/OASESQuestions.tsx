import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/Feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getTodayOasesQuestions, submitOasesBatch } from "../../../api/oases";
import {
  OasesAnswerSubmission,
  OasesDailyBatch,
} from "../../../api/oases/types";
import BottomSheetModal from "../../../components/BottomSheetModal";
import Button from "../../../components/Button";
import OASESContinueModal from "../../../components/OASESContinueModal";
import OnboardingQuestion from "../../../components/OnBoarding/OnboardingQuestion";
import ProgressBar from "../../../components/ProgressBar";
import ScreenView from "../../../components/ScreenView";
import { useOasesStore } from "../../../stores/oases";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";

const OASESQuestions = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { dailyBatch, answers, setAnswer, setDailyBatch, resetOases } =
    useOasesStore();

  // Local pagination state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStopModalVisible, setIsStopModalVisible] = useState(false);
  const [isContinueModalVisible, setIsContinueModalVisible] = useState(false);
  const [nextBatchData, setNextBatchData] = useState<OasesDailyBatch | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Format payload
      const formattedAnswers: OasesAnswerSubmission[] = Object.keys(
        answers,
      ).map((qId) => ({
        questionId: qId,
        answer: answers[qId],
      }));

      await submitOasesBatch({ answers: formattedAnswers });

      // Fetch next batch to check if assessment is complete
      const nextBatch = await getTodayOasesQuestions();

      if (nextBatch.isComplete) {
        // Entire assessment is complete
        navigation.replace("OASESComplete");
      } else if (nextBatch.questions && nextBatch.questions.length > 0) {
        // More questions available - show continue modal
        setNextBatchData(nextBatch);
        setIsContinueModalVisible(true);
      } else {
        // Edge case: not complete but no questions (shouldn't happen)
        navigation.replace("OASESComplete");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Submission Failed", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = () => {
    if (nextBatchData) {
      // Reset answers for new batch
      resetOases();
      setDailyBatch(nextBatchData);
      setCurrentIndex(0);
      setIsContinueModalVisible(false);
      setNextBatchData(null);
    }
  };

  const handleSaveForLater = () => {
    // Save the next batch to store so it's available when user returns
    if (nextBatchData) {
      // Clear answers (for the completed batch) but keep the new batch ready
      resetOases();
      setDailyBatch(nextBatchData);
    }
    setIsContinueModalVisible(false);
    setNextBatchData(null);
    navigation.navigate("Root");
  };

  // Map OASES options to UI component expected format
  const uiOptions = currentQuestion.options.map((opt) => ({
    id: String(opt.value), // Use VALUE as ID for selection logic effectively
    answer: opt.text,
    description: "", // OASES doesn't have per-option description in spec
  }));

  // Reverse map for selection: Component returns ID (value), we store that directly.

  return (
    <ScreenView style={styles.screenInner}>
      {/* Header Info */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>OASES Assessment</Text>
        <TouchableOpacity
          onPress={() => setIsStopModalVisible(true)}
          style={styles.closeBtn}
        >
          <MaterialCommunityIcons
            name="close"
            size={18}
            color={theme.colors.text.title}
          />
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

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 8, 24) },
        ]}
      >
        <Button
          text={isSubmitting ? "Submitting..." : isLast ? "Submit" : "Next"}
          onPress={handleNext}
          disabled={!canProceed || isSubmitting}
        />
      </View>

      <BottomSheetModal
        visible={isStopModalVisible}
        onClose={() => setIsStopModalVisible(false)}
        showCloseButton={true}
        fitContent={true}
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

      {/* Continue Modal */}
      <OASESContinueModal
        visible={isContinueModalVisible}
        remainingQuestions={nextBatchData?.metadata?.totalRemaining || 0}
        onContinue={handleContinue}
        onSaveForLater={handleSaveForLater}
      />
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenInner: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  estimatedTime: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  stepLabel: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginBottom: 4,
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
    paddingTop: 16,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    paddingTop: 54,
    alignItems: "center",
  },
  modalTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 12,
  },
  modalText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 32,
  },
  modalButtons: {
    width: "100%",
    gap: 12,
  },
});

export default OASESQuestions;
