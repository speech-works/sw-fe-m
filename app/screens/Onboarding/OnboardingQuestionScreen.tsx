import React, { useEffect } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";

import ScreenView from "../../components/ScreenView";
import ProgressBar from "../../components/ProgressBar";
import CustomScrollView from "../../components/CustomScrollView";
import Button from "../../components/Button";

import OnboardingQuestion from "../../components/OnBoarding/OnboardingQuestion";

import { useOnboardingStore } from "../../stores/onboarding";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../Theme/tokens";

import { useNavigation, useRoute } from "@react-navigation/native";
import {
  OnboardingStackNavigationProp,
  OnboardingStackParamList,
  OnboardingStackRouteProp,
} from "../../navigators/stacks/OnboardingStack/types";

import {
  submitOnboardingAnswers,
  getActiveOnboardingFlow,
} from "../../api/onboarding";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";

const OnboardingQuestionScreen: React.FC = () => {
  // ----------------------------
  // Navigation + Route
  // ----------------------------
  const navigation =
    useNavigation<
      OnboardingStackNavigationProp<keyof OnboardingStackParamList>
    >();

  const route = useRoute<OnboardingStackRouteProp<"OnboardingQuestion">>();
  const screenNumber = route.params?.screenNumber ?? 1;

  // ----------------------------
  // Store
  // ----------------------------
  const {
    flow,
    currentScreen,
    setAnswer,
    nextScreen,
    getCurrentScreenQuestions,
    isCurrentScreenValid,
    answers,
    setFlow,
  } = useOnboardingStore();

  const emit = useEventStore((s) => s.emit);

  // If flow is missing (e.g. reopened directly) — fetch it and rehydrate store
  useEffect(() => {
    let cancelled = false;
    const ensureFlow = async () => {
      if (!flow) {
        try {
          const fetched = await getActiveOnboardingFlow();
          if (!cancelled) {
            setFlow(fetched);
          }
        } catch (err) {
          console.error(
            "Failed to fetch onboarding flow inside question screen:",
            err
          );
        }
      }
    };
    ensureFlow();
    return () => {
      cancelled = true;
    };
  }, [flow, setFlow]);

  if (!flow) return null;

  // ----------------------------
  // Sync route param → store.currentScreen
  // ----------------------------
  useEffect(() => {
    if (currentScreen !== screenNumber) {
      useOnboardingStore.setState({ currentScreen: screenNumber });
    }
  }, [screenNumber, currentScreen]);

  const screenQuestions = getCurrentScreenQuestions();
  const totalScreens = Math.max(...flow.questions.map((q) => q.screenNumber));
  const isLast = currentScreen === totalScreens;

  // -----------------------------------------------------
  // SKIP → emit STOP_ONBOARDING to return app to main flow
  // -----------------------------------------------------
  const handleSkip = () => {
    console.log("SKIP pressed → emitting STOP_ONBOARDING");
    emit(EVENT_NAMES.STOP_ONBOARDING);
  };

  // -----------------------------------------------------
  // SUBMIT ANSWERS
  // -----------------------------------------------------

  const submitAnswers = async () => {
    try {
      console.log("Submitting onboarding answers:", answers);
      await submitOnboardingAnswers({ answers });
    } catch (err) {
      console.error("Failed to submit onboarding answers:", err);
    }
  };

  const handleComplete = async () => {
    // Tell MainNavigator to return to app flow
    emit(EVENT_NAMES.STOP_ONBOARDING);
  };

  // -----------------------------------------------------
  // NEXT BUTTON
  // -----------------------------------------------------
  const handleNext = async () => {
    if (!isCurrentScreenValid()) return;
    await submitAnswers();
    if (isLast) {
      handleComplete();
      return;
    }

    nextScreen();

    // navigate to next screenNumber
    navigation.navigate("OnboardingQuestion", {
      screenNumber: currentScreen + 1,
    });
  };

  return (
    <ScreenView>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Icon name="times" size={20} color={theme.colors.text.default} />
      </TouchableOpacity>

      <ProgressBar
        currentStep={currentScreen}
        totalSteps={totalScreens}
        showStepIndicator
        showPercentage
        style={styles.progressBar}
      />

      <CustomScrollView contentContainerStyle={styles.scrollContent}>
        {screenQuestions.map((q, index) => (
          <OnboardingQuestion
            key={q.id}
            id={q.id}
            sequence={index + 1}
            question={q.questionText}
            description={q.description ?? ""}
            questionType={q.questionType}
            options={q.options.map((o) => ({
              id: o.id,
              answer: o.optionText,
              description: o.description ?? "",
            }))}
            value={q.questionType !== "multi" ? answers[q.id] ?? "" : undefined}
            values={
              q.questionType === "multi" && Array.isArray(answers[q.id])
                ? answers[q.id]
                : []
            }
            onChange={(qid, ans) => setAnswer(qid, ans)}
          />
        ))}
      </CustomScrollView>

      <View style={styles.footerButton}>
        <Button
          text={isLast ? "Complete" : "Next"}
          variant="normal"
          disabled={!isCurrentScreenValid()}
          onPress={handleNext}
        />
      </View>
    </ScreenView>
  );
};

export default OnboardingQuestionScreen;

const styles = StyleSheet.create({
  skipButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  // CRITICAL FIX: gap handles space between questions, paddingBottom handles space for Next button
  scrollContent: {
    gap: 48,
    paddingBottom: 40,
  },
  progressBar: {
    marginTop: 48,
    marginBottom: 32,
  },
  footerButton: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
});
