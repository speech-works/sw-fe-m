import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";

import OnboardingQuestion from "../../components/OnBoarding/OnboardingQuestion";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "../../stores/onboarding";
import {
  Button,
  IconButton,
  icons,
  ProgressBar,
  SchemeStatusBar,
  space,
  spacing,
  Text,
  useTheme,
} from "../../design-system";

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
  const { colors } = useTheme();

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

  // -----------------------------------------------------
  // SCROLL HANDLING
  // -----------------------------------------------------
  const scrollRef = React.useRef<any>(null);

  // Depend on WHETHER the flow exists, not on the flow object itself.
  //
  // `flow` is an object, so depending on it re-runs this effect whenever its
  // identity changes — and it can change more than once per mount: the effect
  // above fetches it when missing, while zustand's AsyncStorage rehydration
  // may land separately and replace it. Each of those would fire another
  // ONBOARDING_STEP_VIEWED for the same step and inflate the funnel. A boolean
  // flips false -> true at most once, so the event fires exactly once per step.
  const hasFlow = !!flow;

  // Sync route param → store.currentScreen
  useEffect(() => {
    // Nothing has rendered yet on a flow-less pass, so there is no step to
    // scroll or to count. This guard replaces the early `return null` that
    // used to sit ABOVE this hook — see the note before the guard below.
    if (!hasFlow) return;

    // Scroll to top when screen number changes
    if (scrollRef.current) {
      console.log("Scrolling to top for screen:", screenNumber);
      scrollRef.current.scrollTo({ y: 0, animated: true });
    }
    // Track each onboarding step view for the funnel
    track(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, {
      step: screenNumber,
    });
  }, [screenNumber, hasFlow]);

  const insets = useSafeAreaInsets();

  /**
   * EVERY hook must sit ABOVE this line.
   *
   * This guard used to be ~85 lines higher, above `scrollRef`, the effect
   * above and `useSafeAreaInsets` — so those three hooks ran only on renders
   * where `flow` was already loaded. `flow` is runtime state: the store
   * persists it through AsyncStorage, which rehydrates ASYNCHRONOUSLY, and
   * the effect above this comment exists precisely to fetch it when missing
   * ("reopened directly", as its original comment put it).
   *
   * So the first render after launch could legitimately see `flow == null`,
   * run six hooks and bail; the next render would see `flow` populated and
   * run nine. React counts hooks per render and throws "Rendered more hooks
   * than during the previous render" — a crash, on the first screen a new
   * user ever sees.
   *
   * Hooks now run unconditionally and the guard sits below them, immediately
   * before the first line that dereferences `flow` (`flow.questions`, next).
   * Behaviour is otherwise identical: the analytics event still fires only
   * for a step that actually rendered, via the in-effect guard above.
   */
  if (!flow) return null;

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

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />
      {/* Scheme canvas (overrides the legacy light BgWrapper gradient). */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: colors.background.canvas },
        ]}
      />

      {/* Header with Close Btn */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <IconButton name={icons.close} onPress={handleSkip} variant="control" />
      </View>

      {/* Step indicator + progress (tokenized ProgressBar) */}
      <View style={styles.progressBlock}>
        <View style={styles.stepRow}>
          <Text variant="bodySm" color="secondary">
            Step {screenNumber} of {totalScreens}
          </Text>
          <Text variant="bodySm" color="secondary">
            {Math.round((screenNumber / totalScreens) * 100)}%
          </Text>
        </View>
        <ProgressBar
          value={screenNumber}
          max={totalScreens}
          color={colors.action.primary}
          height={8}
        />
      </View>

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
          {
            paddingBottom: Math.max(
              insets.bottom + space.inlineGap,
              spacing["2xl"],
            ),
          },
        ]}
      >
        <Button
          label={isLast ? "Complete" : "Next"}
          disabled={!isCurrentScreenValid(screenNumber)}
          onPress={handleNext}
        />
      </View>
    </ScreenView>
  );
};

export default OnboardingQuestionScreen;

// Root stays unpadded so the canvas is full-bleed; the screen gutter lives on
// the inner content blocks instead. Geometry only — colors come from useTheme().
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: spacing.lg, // Increased gap to ProgressBar
    paddingHorizontal: space.screenX,
  },
  progressBlock: {
    marginBottom: space.sectionGap,
    paddingHorizontal: space.screenX,
  },
  stepRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  scrollContent: {
    gap: spacing["4xl"],
    paddingBottom: spacing["4xl"],
    paddingHorizontal: space.screenX,
  },
  footerButton: {
    paddingTop: spacing.lg,
    paddingHorizontal: space.screenX,
  },
});
