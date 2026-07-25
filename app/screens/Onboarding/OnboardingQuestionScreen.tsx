import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";

import OnboardingQuestion from "../../components/OnBoarding/OnboardingQuestion";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "../../stores/onboarding";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { useQuestionSource } from "./useQuestionSource";
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

import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
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
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

/** Pause after a single-select tap, so the choice is seen before we move on. */
const AUTO_ADVANCE_MS = 260;

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
  /**
   * Set by the pre-auth stack. Same screen, two sources: Act 1's five bundled
   * questions with answers kept on the device (no account exists yet, so
   * nothing may be transmitted), or the full server flow post-signup.
   */
  const preAuth = (route.params as { preAuth?: boolean } | undefined)?.preAuth === true;

  // ----------------------------
  // Store (whichever source applies)
  // ----------------------------
  const {
    flow,
    setAnswer,
    nextScreen,
    getCurrentScreenQuestions,
    isCurrentScreenValid,
    answers,
    canSubmitToServer,
  } = useQuestionSource(preAuth);

  const setFlow = useOnboardingStore((s) => s.setFlow);
  const setDraftStep = useOnboardingDraftStore((s) => s.setStep);
  const markDraftCompleted = useOnboardingDraftStore((s) => s.markCompleted);

  const emit = useEventStore((s) => s.emit);

  // If flow is missing (e.g. reopened directly) — fetch it and rehydrate store.
  // Never pre-auth: Act 1's questions are bundled, and the flow endpoint sits
  // behind auth anyway, so a fetch here would 401 on the very first screen.
  useEffect(() => {
    let cancelled = false;
    const ensureFlow = async () => {
      if (!preAuth && !flow) {
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

  // Pending auto-advance for single-select answers. Held in a ref so a quick
  // change of mind cancels the previous hop rather than queuing two, and so an
  // unmount (back-swipe, or the Skip X) can't navigate after the screen is gone.
  const advanceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Latches once this screen has advanced, so it can never advance twice. */
  const isAdvancing = React.useRef(false);
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  // Release the latch whenever this screen comes back into view. `push` leaves
  // it mounted, so a user swiping back to change an answer would otherwise find
  // a dead Next button — the ref would still be latched from the first time.
  useFocusEffect(
    React.useCallback(() => {
      isAdvancing.current = false;
    }, []),
  );

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
    // Funnel only — step POSITION, never answer content. Knowing which question
    // people stop on is the whole reason for asking before signup; knowing what
    // they answered is not ours to collect until there's an account and consent.
    // `total` makes the drop-off readable on its own ("3 of 5"), and `phase`
    // keeps the pre-signup and post-signup runs from being averaged together.
    track(ANALYTICS_EVENTS.ONBOARDING_STEP_VIEWED, {
      step: screenNumber,
      total: flow ? Math.max(...flow.questions.map((q) => q.screenNumber)) : null,
      phase: preAuth ? "pre_signup" : "post_signup",
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
    track(ANALYTICS_EVENTS.ONBOARDING_SKIPPED, { atStep: screenNumber });

    // Pre-auth, STOP_ONBOARDING would be a dead control: only MainNavigator
    // listens for it, and it renders AuthNavigator regardless while logged out
    // — so the close button would visibly do nothing. Here it means "skip the
    // questions, just let me in", which is the Auth screen. (It also keeps
    // every step escapable, which App Store review will exercise.)
    if (preAuth) {
      (navigation as any).navigate("Auth");
      return;
    }

    console.log("SKIP pressed → emitting STOP_ONBOARDING");
    emit(EVENT_NAMES.STOP_ONBOARDING);
  };

  // -----------------------------------------------------
  // SUBMIT ANSWERS
  // -----------------------------------------------------

  const submitAnswers = async () => {
    // PRE-AUTH: NOTHING LEAVES THE DEVICE.
    //
    // There is no account to attach these to, and they are health-adjacent
    // answers about an identifiable person — which situations they avoid, how
    // heavy things feel today. Under GDPR Art. 9 that needs a lawful basis plus
    // explicit consent, and pre-signup we have neither. They sit in the draft
    // store and are replayed once, after signup, from MainNavigator.
    if (!canSubmitToServer) return;

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

      // NOTE: we deliberately do NOT flip `user.hasCompletedOnboarding` here,
      // even though the server has just recorded it.
      //
      // MainNavigator renders the whole OnboardingStack on the condition
      // `user.hasCompletedOnboarding === false`. Flipping it mid-flow tears the
      // stack down instantly — and the very next line of handleNext tries to
      // navigate to OnboardingPhonemes, a screen that no longer exists:
      //   "The action 'NAVIGATE' with payload {"name":"OnboardingPhonemes"}
      //    was not handled by any navigator."
      // The user skipped the phoneme picker and the payoff screen entirely and
      // was dumped on Home. It was a race, so it only bit sometimes.
      //
      // The flag now flips in OnboardingDone's handleFinish, which is the
      // actual end of onboarding and already tells MainNavigator to swap. If
      // the app dies in between, the SERVER still has it true, so the next
      // fetchUser syncs it and onboarding does not repeat.
      if (isComplete) {
        console.log("[Onboarding] Server reports flow complete.");
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

    // One advance per screen, ever.
    //
    // There are now TWO ways to move on — the Next button and the auto-advance
    // timer — and `submitAnswers()` is awaited in between, so a user who taps
    // an option and immediately taps Next can get both. That pushes the same
    // screen twice (or fires the final navigate twice), which surfaces as a
    // "The action 'NAVIGATE' ... was not handled" error and a corrupted stack.
    // `navigation.push` leaves this screen mounted, so the ref persists and
    // keeps guarding for as long as the screen is in the stack.
    if (isAdvancing.current) return;
    isAdvancing.current = true;

    // A queued auto-advance is now redundant whichever path got here first.
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }

    await submitAnswers();

    // 🟢 KEY FIX: If this was the last screen, force completion locally
    // This handles cases where backend might report partial completion (e.g. 74%)
    // but the user has physically finished the flow.
    if (isLast) {
      if (preAuth) {
        // End of Act 1. The teaser reads their answers back and hands off to
        // signup; the answers go to the server only once an account exists.
        markDraftCompleted();
        (navigation as any).navigate("ActOneTeaser");
        return;
      }
      console.log("Algo: Final screen submitted. Navigating to Phoneme selection.");
      navigation.navigate("OnboardingPhonemes");
      return;
    }

    nextScreen(); // Sync with store so "Resume" works later
    // Pre-auth resume lives on `stepIndex`, so keep it in step with the route —
    // otherwise reopening the app restarts Act 1 from question one.
    if (preAuth) setDraftStep(screenNumber + 1);

    // The two stacks name this route differently, and pushing the wrong one is
    // silent until it isn't: "The action 'PUSH' ... was not handled by any
    // navigator", and the flow simply stops advancing.
    (navigation as any).push(preAuth ? "ActOneQuestion" : "OnboardingQuestion", {
      screenNumber: screenNumber + 1,
      preAuth,
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
        {screenQuestions.map((q) => {
          // 🟢 KEY FIX: choose adaptiveKey if exists, otherwise fallback to id
          const storageKey = q.adaptiveKey ?? q.id;

          return (
            <OnboardingQuestion
              key={q.id}
              id={q.id}
              // No `sequence` prop: the flow now shows ONE question per screen,
              // so a "1." in front of every single question was both wrong and
              // redundant next to the "Step 4 of 12" progress header.
              question={q.questionText}
              description={q.description ?? ""}
              questionType={q.questionType}
              layout={q.layout}
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
              onChange={(_, ans) => {
                setAnswer(storageKey, ans);
                // Auto-advance single-select. With one question per screen,
                // "tap your answer, then tap Next" is a double tap on almost
                // every step. MULTI needs the explicit Next (the user isn't
                // finished choosing) and SLIDER has no discrete commit, so both
                // keep the button. The small delay lets the selection state
                // render, so the answer is visibly registered before we move.
                if (q.questionType === "SINGLE") {
                  if (advanceTimer.current) clearTimeout(advanceTimer.current);
                  advanceTimer.current = setTimeout(() => {
                    advanceTimer.current = null;
                    handleNext();
                  }, AUTO_ADVANCE_MS);
                }
              }}
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
