import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

import Button from "../../components/Button";
import CustomScrollView from "../../components/CustomScrollView";
import ProgressBar from "../../components/ProgressBar";
import ScreenView from "../../components/ScreenView";

import OnboardingQuestion from "../../components/OnBoarding/OnboardingQuestion";

import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "../../stores/onboarding";
import { theme } from "../../Theme/tokens";
import { parseShadowStyle } from "../../util/functions/parseStyles";

import { useNavigation, useRoute } from "@react-navigation/native";
import {
  OnboardingStackNavigationProp,
  OnboardingStackParamList,
  OnboardingStackRouteProp,
} from "../../navigators/stacks/OnboardingStack/types";

import {
  getActiveOnboardingFlow,
  submitOnboardingAnswers,
} from "../../api/onboarding";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { useUserStore } from "../../stores/user";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

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
            err,
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

  // -----------------------------------------------------
  // SCROLL HANDLING
  // -----------------------------------------------------
  const scrollRef = React.useRef<any>(null);

  // Sync route param → store.currentScreen
  // Sync route param → store.currentScreen
  useEffect(() => {
    // Scroll to top when screen number changes
    if (scrollRef.current) {
      console.log("Scrolling to top for screen:", screenNumber);
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
    // Track each onboarding step view for the funnel
    track(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, {
      step: screenNumber,
    });
  }, [screenNumber]);

  const screenQuestions = getCurrentScreenQuestions(screenNumber);
  const totalScreens = Math.max(...flow.questions.map((q) => q.screenNumber));
  const isLast = screenNumber === totalScreens;

  // -----------------------------------------------------
  // SKIP → emit STOP_ONBOARDING to return app to main flow
  // -----------------------------------------------------
  const handleSkip = () => {
    console.log("SKIP pressed → emitting STOP_ONBOARDING");
    track(ANALYTICS_EVENTS.ONBOARDING_SKIPPED, { atStep: screenNumber });
    emit(EVENT_NAMES.STOP_ONBOARDING);
  };

  // -----------------------------------------------------
  // SUBMIT ANSWERS
  // -----------------------------------------------------

  const submitAnswers = async () => {
    try {
      console.log("Submitting onboarding answers:", answers);
      const { answer, isComplete, profileCompletionPercent } =
        await submitOnboardingAnswers({ answers });
      console.log(
        "submitOnboardingAnswers response",
        answer,
        isComplete,
        profileCompletionPercent,
      );

      if (isComplete) {
        const { user, setUser } = useUserStore.getState();
        if (user) {
          setUser({ ...user, hasCompletedOnboarding: true });
        }
      }
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
    if (!isCurrentScreenValid(screenNumber)) return;
    await submitAnswers();

    // 🟢 KEY FIX: If this was the last screen, force completion locally
    // This handles cases where backend might report partial completion (e.g. 74%)
    // but the user has physically finished the flow.
    if (isLast) {
      console.log("Algo: Final screen submitted. Navigating to Phoneme selection.");
      navigation.navigate("OnboardingPhonemes");
      return;
    }

    nextScreen(); // Sync with store so "Resume" works later

    // Use push to add a new screen instance
    (navigation as any).push("OnboardingQuestion", {
      screenNumber: screenNumber + 1,
    });
  };

  const insets = useSafeAreaInsets();

  return (
    <ScreenView style={styles.screenInner}>
      {/* Header with Close Btn */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleSkip}>
          <Icon name="times" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
      </View>

      <ProgressBar
        currentStep={screenNumber}
        totalSteps={totalScreens}
        showStepIndicator
        showPercentage
        style={styles.progressBar}
      />

      <CustomScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
      >
        {screenQuestions.map((q, index) => {
          // 🟢 KEY FIX: choose adaptiveKey if exists, otherwise fallback to id
          const storageKey = q.adaptiveKey ?? q.id;

          return (
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
              // use storageKey for UI selection
              value={
                q.questionType !== "MULTI" ? (answers[storageKey] ?? "") : undefined
              }
              values={
                q.questionType === "MULTI" && Array.isArray(answers[storageKey])
                  ? answers[storageKey]
                  : []
              }
              onChange={(_, ans) => setAnswer(storageKey, ans)}
            />
          );
        })}
      </CustomScrollView>

      <View
        style={[
          styles.footerButton,
          { paddingBottom: Math.max(insets.bottom + 8, 24) },
        ]}
      >
        <Button
          text={isLast ? "Complete" : "Next"}
          variant="normal"
          disabled={!isCurrentScreenValid(screenNumber)}
          onPress={handleNext}
        />
      </View>
    </ScreenView>
  );
};

export default OnboardingQuestionScreen;

const styles = StyleSheet.create({
  screenInner: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 16, // Increased gap to ProgressBar
    minHeight: 40,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  scrollContent: {
    gap: 40,
    paddingBottom: 40,
  },
  progressBar: {
    marginTop: 0, // Managed by header marginBottom and insets
    marginBottom: 24,
  },
  footerButton: {
    paddingTop: 16,
  },
});
