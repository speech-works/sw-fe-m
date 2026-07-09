import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getTodayImpactAssessmentQuestions,
  submitImpactAssessmentBatch,
} from "../../../api/impactAssessment";
import {
  ImpactAssessmentAnswerSubmission,
  ImpactAssessmentDailyBatch,
} from "../../../api/impactAssessment/types";
import ImpactAssessmentContinueModal from "../../../components/ImpactAssessmentContinueModal";
import ScreenView from "../../../components/ScreenView";
import { useImpactAssessmentStore } from "../../../stores/impactAssessment";
import {
  SchemeStatusBar,
  Button,
  Gradient,
  IconButton,
  ProgressBar,
  Text,
  icons,
  space,
  spacing,
  useTheme,
  Sheet,
} from "../../../design-system";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import AssessmentQuestion from "./AssessmentQuestion";

const ImpactAssessmentQuestions = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  // Flow accent = the amber of the parent Impact Assessment card (accent.warning),
  // so progress / options / buttons all carry the card's identity.
  const accent = colors.accent.warning;
  const onAccent = colors.accentOn.warning;
  const {
    dailyBatch,
    answers,
    setAnswer,
    setDailyBatch,
    resetImpactAssessment,
  } = useImpactAssessmentStore();

  // Local pagination state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStopModalVisible, setIsStopModalVisible] = useState(false);
  const [isContinueModalVisible, setIsContinueModalVisible] = useState(false);
  const [nextBatchData, setNextBatchData] =
    useState<ImpactAssessmentDailyBatch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (
    !dailyBatch ||
    !dailyBatch.questions ||
    dailyBatch.questions.length === 0
  ) {
    // Safety valve: Navigate back if data is missing
    return (
      <ScreenView style={styles.screen}>
        <SchemeStatusBar />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.background.canvas },
          ]}
        />
        <View style={styles.centerFallback}>
          <Text variant="body" color="secondary" center>
            No questions available for today.
          </Text>
          <Button
            label="Go Back"
            onPress={() => navigation.navigate("Root")}
            style={styles.fallbackButton}
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
      <ScreenView style={styles.screen}>
        <SchemeStatusBar />
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { backgroundColor: colors.background.canvas },
          ]}
        />
        <View style={styles.centerFallback}>
          <Text variant="body" color={colors.feedback.dangerText} center>
            Error loading question.
          </Text>
          <Button
            label="Reset"
            onPress={() => {
              setCurrentIndex(0);
              navigation.navigate("Root");
            }}
            style={styles.fallbackButton}
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
    track(ANALYTICS_EVENTS.ASSESSMENT_STEP_VIEWED, {
      step: currentIndex + 1,
      totalSteps: totalQuestions,
    });
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
      const formattedAnswers: ImpactAssessmentAnswerSubmission[] = Object.keys(
        answers,
      ).map((qId) => ({
        questionId: qId,
        answer: answers[qId],
      }));

      await submitImpactAssessmentBatch({ answers: formattedAnswers });

      // Fetch next batch to check if assessment is complete
      const nextBatch = await getTodayImpactAssessmentQuestions();

      if (nextBatch.isComplete) {
        // Entire assessment is complete
        track(ANALYTICS_EVENTS.ASSESSMENT_COMPLETED, {
          totalAnswered: formattedAnswers.length,
        });
        navigation.replace("ImpactAssessmentComplete");
      } else if (nextBatch.questions && nextBatch.questions.length > 0) {
        // More questions available - show continue modal
        setNextBatchData(nextBatch);
        setIsContinueModalVisible(true);
      } else {
        // Edge case: not complete but no questions (shouldn't happen)
        navigation.replace("ImpactAssessmentComplete");
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
      resetImpactAssessment();
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
      resetImpactAssessment();
      setDailyBatch(nextBatchData);
    }
    setIsContinueModalVisible(false);
    setNextBatchData(null);
    navigation.navigate("Root");
  };

  // Map assessment options to the UI component's expected format
  const uiOptions = currentQuestion.options.map((opt) => ({
    id: String(opt.value), // Use VALUE as ID for selection logic effectively
    answer: opt.text,
    description: "",
  }));

  // Reverse map for selection: Component returns ID (value), we store that directly.

  // Floating footer clearance — the scroll body reserves the (button + scrim +
  // safe-area) height so the last option always clears the free-floating CTA.
  const footerPadBottom = Math.max(insets.bottom + space.rowGap, spacing["3xl"]);
  const bottomReserve = 56 + space.sectionGap + footerPadBottom + spacing.lg;

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />
      {/* Dark canvas (overrides the legacy light BgWrapper gradient). */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.background.canvas },
        ]}
      />

      {/* Header Info */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text variant="h3" color="primary">
          Impact Assessment
        </Text>
        <IconButton
          name={icons.close}
          onPress={() => setIsStopModalVisible(true)}
          variant="control"
        />
      </View>

      <View style={styles.progress}>
        <ProgressBar
          value={currentIndex + 1}
          max={totalQuestions}
          color={accent}
        />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomReserve },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AssessmentQuestion
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

      {/* Free-floating CTA — dissolves into the canvas over a scrim fade (matches
          the Page footer / reading pages), never a solid footer bar. */}
      <View pointerEvents="box-none" style={styles.floatingFooter}>
        <View pointerEvents="none" style={styles.footerScrim}>
          <Gradient token="scrimDown" style={StyleSheet.absoluteFill} />
        </View>
        <View style={[styles.footerInner, { paddingBottom: footerPadBottom }]}>
          <Button
            label={isSubmitting ? "Submitting..." : isLast ? "Submit" : "Next"}
            onPress={handleNext}
            disabled={!canProceed || isSubmitting}
            accentColor={accent}
            onAccentColor={onAccent}
          />
        </View>
      </View>

      <Sheet
        visible={isStopModalVisible}
        onClose={() => setIsStopModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text variant="h2" center>
            Pause Assessment?
          </Text>
          <Text variant="body" color="secondary" center>
            Your progress will be saved for later. You can continue anytime from
            the Home screen.
          </Text>

          <View style={styles.modalButtons}>
            <Button
              label="Stop"
              variant="primary"
              accentColor={accent}
              onAccentColor={onAccent}
              onPress={() => {
                track(ANALYTICS_EVENTS.ASSESSMENT_ABANDONED, {
                  atStep: currentIndex + 1,
                  totalSteps: totalQuestions,
                });
                setIsStopModalVisible(false);
                navigation.navigate("Root");
              }}
            />
            <Button
              label="Cancel"
              variant="ghost"
              onColor={colors.feedback.warningText}
              onPress={() => setIsStopModalVisible(false)}
            />
          </View>
        </View>
      </Sheet>

      {/* Continue Modal */}
      <ImpactAssessmentContinueModal
        visible={isContinueModalVisible}
        remainingQuestions={nextBatchData?.metadata?.totalRemaining || 0}
        onContinue={handleContinue}
        onSaveForLater={handleSaveForLater}
      />
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  // Root stays unpadded so the dark canvas is full-bleed (a horizontal gutter here
  // would inset the absoluteFill canvas and let the light BgWrapper show as a
  // white frame). The screen gutter lives on the inner content rows instead.
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  centerFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: space.screenX,
  },
  fallbackButton: {
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
    paddingHorizontal: space.screenX,
  },
  progress: {
    marginTop: spacing.sm,
    marginBottom: spacing["2xl"],
    paddingHorizontal: space.screenX,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: space.screenX,
  },
  floatingFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  footerScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: -space.sectionGap,
  },
  footerInner: {
    paddingHorizontal: space.screenX,
    paddingTop: space.sectionGap,
  },
  modalContent: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  modalButtons: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xs,
  },
});

export default ImpactAssessmentQuestions;
