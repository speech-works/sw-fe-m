import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";

import OnboardingQuestion from "../../components/OnBoarding/OnboardingQuestion";
import StepDots from "../../components/OnBoarding/StepDots";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOnboardingStore } from "../../stores/onboarding";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { useQuestionSource } from "./useQuestionSource";
import {
  Button,
  Gradient,
  IconButton,
  icons,
  SchemeStatusBar,
  space,
  spacing,
  useTheme,
  withAlpha,
} from "../../design-system";

import {
  useFocusEffect,
  useNavigation,
  useNavigationState,
  useRoute,
} from "@react-navigation/native";
import {
  OnboardingStackNavigationProp,
  OnboardingStackParamList,
  OnboardingStackRouteProp,
} from "../../navigators/stacks/OnboardingStack/types";

import {
  getActiveOnboardingFlow,
  submitOnboardingAnswers,
} from "../../api/onboarding";
import type { QuestionType } from "../../api/onboarding/types";
import { useEventStore } from "../../stores/events";
import { EVENT_NAMES } from "../../stores/events/constants";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

/** Pause after a single-select tap, so the choice is seen before we move on. */
const AUTO_ADVANCE_MS = 260;

/**
 * How far the list must scroll past the floating dock: the button's own height
 * plus the padding around it. Derived the same way as OnboardingDone's, so the
 * last option always clears the CTA rather than stopping under it.
 */
const DOCK_CLEARANCE = 56 + spacing["2xl"] + spacing["3xl"];

/**
 * "You arrived here by pressing Back."
 *
 * `navigation.goBack()` takes no params and the screen being returned TO was
 * never unmounted, so there is no prop to thread this through. A module flag is
 * the right size for it: exactly one question screen is focused at a time, and
 * it is consumed on the next focus and immediately cleared.
 *
 * It exists so the dot you land on can pop — the one moment the back button and
 * the dots read as one system rather than two ways to do the same thing.
 */
let arrivedViaBack = false;

/**
 * Does answering this question commit the screen on its own?
 *
 * ONE predicate, used by BOTH the auto-advance timer and the decision to render
 * a Next button — they are the same question asked twice, and when they were
 * two separate expressions they disagreed. Auto-advance fired for every SINGLE
 * question; the button hid only for SINGLE questions with the "scale" layout.
 * So the two single-select chip screens advanced on tap AND carried a Next
 * button that was disabled before you chose and unreachable after it, because
 * the tap navigated away first.
 *
 * MULTI keeps the button because the user is not finished choosing and needs a
 * way to say so. SLIDER keeps it because dragging has no discrete commit.
 */
const autoAdvances = (q: { questionType: QuestionType }) =>
  q.questionType === "SINGLE";

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
  /** True for this visit only when we got here via the back button. */
  const [poppedArrival, setPoppedArrival] = React.useState(false);
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

  /**
   * WHICH STEPS ARE ACTUALLY BEHIND US — read from the navigation stack, not
   * inferred from the step number.
   *
   * The two are not the same thing. Post-signup, somebody who answered Act 1
   * and reopens the app resumes at (say) step 7, and that screen is the ROOT of
   * its stack: steps 1-6 are answered but were never pushed. Deriving "can I go
   * back?" from `screenNumber > 1` would render a back button that does nothing
   * and dots that offer jumps to screens which do not exist.
   *
   * Act 1 also skips a step when there is nothing to rank, so stack depth and
   * step number drift apart there too — which is why jumping pops by INDEX
   * rather than by the difference between step numbers.
   */
  const routes = useNavigationState((st) => st?.routes);
  const reachable = React.useMemo(() => {
    const map = new Map<number, number>();
    (routes ?? []).forEach((r: any, i: number) => {
      const n = r?.params?.screenNumber;
      if (typeof n === "number" && n < screenNumber) map.set(n, i);
    });
    return map;
  }, [routes, screenNumber]);
  const myIndex = (routes?.length ?? 1) - 1;
  /**
   * The question immediately behind this one, or null on the first.
   *
   * NOT `navigation.canGoBack()`, which is true on question one — the welcome
   * screen is still under it, so the arrow would walk somebody OUT of the
   * questions rather than between them. Back travels the flow; leaving it is
   * the X's job, and conflating the two is how a control stops meaning one
   * thing.
   */
  const prevStep = React.useMemo(() => {
    const steps = [...reachable.keys()];
    return steps.length ? Math.max(...steps) : null;
  }, [reachable]);

  const nextAnswerableScreen = useOnboardingDraftStore((s) => s.nextAnswerableScreen);
  const settleSkipped = useOnboardingDraftStore((s) => s.settleSkipped);
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
      // Consume the note the back button left, once. Cleared immediately so a
      // later focus (returning from somewhere else) cannot pop a second time.
      if (arrivedViaBack) {
        arrivedViaBack = false;
        setPoppedArrival(true);
      }
      return () => setPoppedArrival(false);
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

  /**
   * The next screen worth showing — NOT simply `screenNumber + 1`.
   *
   * Act 1 narrows the frequency question to the acts they called hard, and when
   * there is only one there is nothing left to rank: the answer is arithmetic,
   * so the store fills it in and the screen is skipped. Onboarding gets one
   * question shorter for exactly the people it was most redundant for.
   *
   * `isLast` follows from the same walk, so the button says "Complete" on the
   * real last screen rather than on screen six regardless.
   */
  const nextScreenNumber = preAuth
    ? nextAnswerableScreen(screenNumber)
    : screenNumber + 1;
  const isLast = nextScreenNumber > totalScreens;
  // Hide the footer only when EVERY question on the screen commits on its own;
  // a mixed screen still needs the button for the ones that don't.
  const usesAutoAdvanceRail =
    screenQuestions.length > 0 && screenQuestions.every(autoAdvances);

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

  /**
   * BACK — the answer to a 260 ms hop nobody meant to trigger.
   *
   * `goBack` rather than a push: the previous screen is still mounted, so
   * returning to it restores the answer already on it instead of re-creating a
   * blank one. The flag is what lets the dot there acknowledge the press.
   */
  /**
   * One way back, two entry points. The button always means "the previous
   * question"; a dot means "that question". Both pop by stack INDEX rather than
   * by the difference between step numbers, because Act 1 can skip a step and
   * the two counts drift — and popping returns to the screen already mounted,
   * with its answer on it, instead of pushing a second copy.
   */
  const popToStep = (step: number, viaButton: boolean) => {
    const at = reachable.get(step);
    if (at === undefined) return;
    if (advanceTimer.current) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
    if (viaButton) arrivedViaBack = true;
    if (preAuth) setDraftStep(step);
    (navigation as any).pop(myIndex - at);
  };

  const handleBack = () => {
    if (prevStep !== null) popToStep(prevStep, true);
  };

  /**
   * A dot tap — the same destination, any distance. No pop on arrival: they
   * are already looking at the dot they chose.
   */
  /** A dot tap. No pop on arrival — they are already looking at the dot. */
  const jumpBackTo = (step: number) => popToStep(step, false);

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

    // Record anything a skipped screen would have asked, BEFORE moving on —
    // this writes, so it belongs in the handler and not in the render path.
    if (preAuth) settleSkipped(screenNumber, nextScreenNumber);

    nextScreen(); // Sync with store so "Resume" works later
    // Pre-auth resume lives on `stepIndex`, so keep it in step with the route —
    // otherwise reopening the app restarts Act 1 from question one.
    if (preAuth) setDraftStep(nextScreenNumber);

    // The two stacks name this route differently, and pushing the wrong one is
    // silent until it isn't: "The action 'PUSH' ... was not handled by any
    // navigator", and the flow simply stops advancing.
    (navigation as any).push(preAuth ? "ActOneQuestion" : "OnboardingQuestion", {
      screenNumber: nextScreenNumber,
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

      {/* THE ROW WAS ALREADY HERE AND HALF EMPTY. It was `flex-end` with a lone
          X, so the back control costs no vertical space at all — it fills
          reserved room and fixes the lone-X imbalance on the way past. Back
          sits LEFT of close: the pair reads as one group of screen controls,
          and the destructive one stays on the outside where it is harder to
          hit by accident. */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        {prevStep !== null ? (
          <IconButton
            name="arrow-left"
            onPress={handleBack}
            variant="control"
            accessibilityLabel="Back to the previous question"
          />
        ) : null}
        <IconButton name={icons.close} onPress={handleSkip} variant="control" />
      </View>

      {/* Six dots instead of "Step 2 of 6", "33%" and a filled bar — three
          encodings of one fact, in four times the height. Every dot behind you
          is also a tap target, so revisiting three answers back is one tap
          rather than three screens. */}
      <View style={styles.progressBlock}>
        <StepDots
          total={totalScreens}
          current={screenNumber}
          reachable={reachable}
          onJump={jumpBackTo}
          popOnArrival={poppedArrival}
        />
      </View>

      <CustomScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContent,
          {
            // Clear the floating dock, or nothing — the auto-advance screens
            // have no button and would otherwise end in a band of dead space.
            paddingBottom: usesAutoAdvanceRail
              ? spacing["4xl"]
              : insets.bottom + DOCK_CLEARANCE,
          },
        ]}
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
              // redundant next to the step counter in the progress header.
              question={q.questionText}
              description={q.description ?? ""}
              questionType={q.questionType}
              layout={q.layout}
              options={q.options.map((o) => ({
                id: o.id,
                answer: o.optionText,
                description: o.description ?? "",
                exclusive: o.exclusive,
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
                if (autoAdvances(q)) {
                  if (advanceTimer.current) clearTimeout(advanceTimer.current);
                  // One delay for every question type. The scale used to get a
                  // longer beat to let a bespoke "kinetic" selection animation
                  // land; that animation is gone and every selector now gives
                  // identical feedback, so a per-layout delay would just be an
                  // unexplained inconsistency in how fast the form responds.
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

      {/* FLOATING DOCK — the CTA sits ON the canvas, not in a boxed footer.
          It used to be a sibling below the scroll view, so the list ended at
          the button's top edge and the last option was sliced clean in half by
          an opaque bar. Now the list runs the full height and the gradient
          dissolves it into the canvas before it reaches the button, so content
          fades out instead of being cut off, and nothing ever ghosts through
          the label.

          Same recipe as OnboardingDone, one screen further along in this very
          flow — copied rather than re-derived so the two docks cannot drift. */}
      {!usesAutoAdvanceRail ? (
        <View style={styles.dock} pointerEvents="box-none">
          <Gradient
            colors={[
              withAlpha(colors.background.canvas, 0),
              colors.background.canvas,
              colors.background.canvas,
            ]}
            locations={[0, 0.45, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.dockFade}
            pointerEvents="none"
          />
          <View
            style={[
              styles.dockInner,
              { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md },
            ]}
          >
            <Button
              label={isLast ? "Complete" : "Next"}
              disabled={!isCurrentScreenValid(screenNumber)}
              onPress={handleNext}
            />
          </View>
        </View>
      ) : null}

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
    gap: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: space.screenX,
  },
  progressBlock: {
    marginBottom: space.sectionGap,
    paddingHorizontal: space.screenX,
  },
  scrollContent: {
    gap: spacing["4xl"],
    paddingHorizontal: space.screenX,
    // paddingBottom is applied inline: it depends on whether the dock is there
    // at all, and a fixed value would either strand content under the button or
    // leave a dead gap on the auto-advance screens that have no button.
  },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Headroom so the dissolve finishes above the button.
    paddingTop: spacing["3xl"],
  },
  dockFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Begin the dissolve well above the dock: behind the CTA the backing is
    // fully opaque, so the button always reads at full contrast.
    top: -spacing["4xl"],
  },
  dockInner: {
    paddingHorizontal: space.screenX,
  },
});
